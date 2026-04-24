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
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());

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

// Placeholder auth middleware — verifies a bearer JWT once the auth service
// is wired. For now it forwards the header untouched so downstream services
// can do their own checks.
const authMiddleware: express.RequestHandler = (req, _res, next) => {
  const auth = req.header("authorization");
  if (auth) {
    logger.debug({ path: req.path }, "forwarding bearer token");
  }
  next();
};

// ── Proxy wiring (order matters — proxies must come before express.json) ──────

const passthroughProxy = (target: string) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
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
