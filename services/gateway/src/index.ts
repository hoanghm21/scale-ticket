import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";
import pino from "pino";
import crypto from "crypto";

const logger = pino({ name: "gateway" });

// ── Security config ───────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001").split(",").map(s => s.trim());
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || "dev-internal-token";

if (INTERNAL_TOKEN === "dev-internal-token") {
  logger.warn("Using default INTERNAL_TOKEN — set a strong token in production!");
}

// ── Downstream service targets ────────────────────────────────────────────────

const TARGETS = {
  payment: process.env.PAYMENT_URL || "http://localhost:4001",
  notify: process.env.NOTIFY_URL || "http://localhost:4002",
  realtime: process.env.REALTIME_URL || "http://localhost:4003",
  auth: process.env.AUTH_URL || "http://localhost:4010",
  event: process.env.EVENT_URL || "http://localhost:4011",
  ticket: process.env.TICKET_URL || "http://localhost:4012",
};

// ── App ───────────────────────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));

// Correlation id — attaches `x-request-id` to every request so logs can be
// stitched across services. Honors an upstream value if the caller sends one.
app.use((req, res, next) => {
  const rid = req.header("x-request-id") || crypto.randomUUID();
  (req as express.Request & { rid: string }).rid = rid;
  res.setHeader("x-request-id", rid);
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info(
      {
        rid: (req as express.Request & { rid: string }).rid,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - start,
      },
      "request"
    );
  });
  next();
});

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

// Auth middleware — validates bearer token via the auth service.
// Caches valid tokens briefly to avoid per-request overhead.
const tokenCache = new Map<string, { valid: boolean; user: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Clean stale cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of tokenCache) {
    if (entry.expiresAt < now) tokenCache.delete(key);
  }
}, 10 * 60 * 1000);

const authMiddleware: express.RequestHandler = async (req, res, next) => {
  const auth = req.header("authorization");
  if (!auth) {
    // Allow unauthenticated requests to pass — endpoints that truly
    // need auth should check again downstream.
    return next();
  }

  // Validate bearer format
  if (!auth.startsWith("Bearer ") || auth.length < 10) {
    logger.warn({ path: req.path }, "rejected malformed Authorization header");
    return res.status(401).json({ error: "Malformed Authorization header" });
  }

  const token = auth.slice(7);

  // Check cache first
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    if (!cached.valid) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    // Attach user info to header for downstream services
    req.headers["x-user-id"] = JSON.stringify(cached.user);
    return next();
  }

  // Verify with auth service
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const validateRes = await fetch(`${TARGETS.auth}/api/auth/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await validateRes.json() as { valid: boolean; user?: unknown; error?: string };

    tokenCache.set(token, {
      valid: data.valid,
      user: data.user || null,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    if (!data.valid) {
      logger.debug({ path: req.path }, "token validation failed");
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (data.user) {
      req.headers["x-user-id"] = JSON.stringify(data.user);
    }

    logger.debug({ path: req.path }, "token validated successfully");
    next();
  } catch (err) {
    // If auth service is down, allow request to pass (graceful degradation)
    logger.warn({ path: req.path, err }, "auth service unreachable, allowing request");
    next();
  }
};

// ── Proxy wiring (order matters — proxies must come before express.json) ──────

const passthroughProxy = (target: string) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path, req) => (req as express.Request).originalUrl,
    proxyTimeout: 10_000,
    timeout: 10_000,
    on: {
      error: (err, _req, res) => {
        logger.error({ err, target }, "proxy error");
        if ("writeHead" in res && !res.headersSent) {
          (res as express.Response).writeHead(502, { "Content-Type": "application/json" });
          (res as express.Response).end(JSON.stringify({ error: "Upstream unavailable", target }));
        }
      },
    },
  });

app.use("/api/checkout", authMiddleware, passthroughProxy(TARGETS.payment));
app.use("/api/notify", authMiddleware, passthroughProxy(TARGETS.notify));
app.use("/api/seats", passthroughProxy(TARGETS.realtime));
app.use("/api/auth", passthroughProxy(TARGETS.auth));
app.use("/api/events", passthroughProxy(TARGETS.event));
app.use("/api/tickets", authMiddleware, passthroughProxy(TARGETS.ticket));

app.use(express.json());

// ── Health & readiness ────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "gateway" });
});

// Aggregated readiness — hits each downstream /health concurrently so the
// load balancer can fail fast if any dependency is down.
app.get("/ready", async (_req, res) => {
  const checks = await Promise.all(
    Object.entries(TARGETS).map(async ([name, url]) => {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 1500);
        const r = await fetch(`${url}/health`, { signal: controller.signal });
        clearTimeout(t);
        return [name, r.ok] as const;
      } catch {
        return [name, false] as const;
      }
    })
  );
  const status = Object.fromEntries(checks);
  const allOk = checks.every(([, ok]) => ok);
  res.status(allOk ? 200 : 503).json({ status: allOk ? "ready" : "degraded", services: status });
});

// ── Socket.io bridge ──────────────────────────────────────────────────────────
// The web client connects to realtime directly (port 4003) for seat events;
// this gateway socket is reserved for future cross-service fan-out (e.g. user
// notifications pushed from the notify service).

io.on("connection", (socket) => {
  logger.info({ socketId: socket.id }, "gateway socket connected");
  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "gateway socket disconnected");
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT || 4000);
server.listen(PORT, () => {
  logger.info({ port: PORT, targets: TARGETS }, "gateway listening");
});
