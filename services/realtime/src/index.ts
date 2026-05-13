import http from "http";
import express from "express";
import cors from "cors";
import { Server, Socket } from "socket.io";
import pino from "pino";
import {
  getOrCreateInventory,
  lockSeat,
  unlockSeat,
  releaseAllHolds,
  sweepExpiredHolds,
  confirmSeatSold,
  isRedisReady,
} from "./inventory";

const logger = pino({ name: "realtime-service" });
const PORT = parseInt(process.env.PORT || "4003", 10);
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001").split(",").map(s => s.trim());

// ── Express App (Tier 1: REST Seat Inventory API) ──────────────────────────────

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

// GET /api/seats/:eventId — returns the full seat snapshot for initial page load
app.get("/api/seats/:eventId", async (req, res) => {
  const { eventId } = req.params;
  const inventory = await getOrCreateInventory(eventId);
  const seats = Array.from(inventory.values());
  logger.info({ eventId, seatCount: seats.length }, "Serving seat inventory snapshot");
  res.json({ seats });
});

app.get("/health", (_req, res) => {
  const redisOk = isRedisReady();
  res
    .status(redisOk ? 200 : 503)
    .json({ status: redisOk ? "ok" : "degraded", service: "realtime", redis: redisOk });
});

// Internal webhook: called by payment service after a confirmed charge to
// promote a held seat to sold. Authenticates via INTERNAL_TOKEN header.
app.post("/internal/confirm-sold", async (req, res) => {
  const token = req.header("x-internal-token");
  if (!token || token !== (process.env.INTERNAL_TOKEN || "dev-internal-token")) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const { eventId, seatId, holderId, release } = req.body as {
    eventId?: string;
    seatId?: string;
    holderId?: string;
    release?: boolean;
  };
  if (!eventId || !seatId || !holderId) {
    return res.status(400).json({ error: "missing fields" });
  }

  // Payment failure path: unlock the seat back to available.
  if (release) {
    const result = await unlockSeat(eventId, seatId, holderId);
    if (!result.success) {
      // If it was never held by this holder (e.g. TTL already released), that's OK.
      return res.status(200).json({ ok: true, released: false, reason: result.reason });
    }
    io.to(`event:${eventId}`).emit("seat_status_change", {
      seatId,
      status: "available" as const,
      heldBy: null,
    });
    return res.json({ ok: true, released: true, seat: result.seat });
  }

  // Payment success path: promote held → sold.
  const result = await confirmSeatSold(eventId, seatId, holderId);
  if (!result.success) {
    return res.status(409).json({ error: result.reason });
  }
  io.to(`event:${eventId}`).emit("seat_status_change", {
    seatId,
    status: "sold" as const,
    heldBy: null,
  });
  res.json({ ok: true, seat: result.seat });
});

// ── HTTP Server ────────────────────────────────────────────────────────────────

const server = http.createServer(app);

// ── Socket.io (Tiers 2-3: Rooms + Lock/Unlock Broadcasting) ────────────────────

const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
});

// Track which event room each socket is in
const socketRooms = new Map<string, string>(); // socketId → eventId

io.on("connection", (socket: Socket) => {
  logger.info({ socketId: socket.id }, "Client connected");

  // ── Tier 2: Join an event room ───────────────────────────────────────────
  socket.on("join_event", async (eventId: string) => {
    // Leave any previous event room
    const prevRoom = socketRooms.get(socket.id);
    if (prevRoom) {
      socket.leave(`event:${prevRoom}`);
    }

    socket.join(`event:${eventId}`);
    socketRooms.set(socket.id, eventId);

    logger.info({ socketId: socket.id, eventId }, "Client joined event room");

    // Send the full inventory snapshot to this client upon joining
    const inventory = await getOrCreateInventory(eventId);
    const seats = Array.from(inventory.values());
    socket.emit("inventory_snapshot", seats);
  });

  // ── Tier 3: Lock a seat ──────────────────────────────────────────────────
  socket.on("lock_seat", async (data: { eventId: string; seatId: string }) => {
    const { eventId, seatId } = data;
    const result = await lockSeat(eventId, seatId, socket.id);

    if (result.success && result.seat) {
      // Tell the requesting client their lock succeeded
      socket.emit("lock_ack", { seatId, success: true, seat: result.seat });

      // Broadcast to everyone ELSE in the room that this seat is now held
      socket.to(`event:${eventId}`).emit("seat_status_change", {
        seatId,
        status: "held" as const,
        heldBy: socket.id,
      });

      logger.info({ socketId: socket.id, eventId, seatId }, "Lock broadcast sent");
    } else {
      socket.emit("lock_ack", { seatId, success: false, reason: result.reason });
    }
  });

  // ── Tier 3: Unlock a seat ────────────────────────────────────────────────
  socket.on("unlock_seat", async (data: { eventId: string; seatId: string }) => {
    const { eventId, seatId } = data;
    const result = await unlockSeat(eventId, seatId, socket.id);

    if (result.success) {
      socket.emit("unlock_ack", { seatId, success: true });

      // Broadcast to everyone ELSE in the room that this seat is available again
      socket.to(`event:${eventId}`).emit("seat_status_change", {
        seatId,
        status: "available" as const,
        heldBy: null,
      });

      logger.info({ socketId: socket.id, eventId, seatId }, "Unlock broadcast sent");
    } else {
      socket.emit("unlock_ack", { seatId, success: false, reason: result.reason });
    }
  });

  // ── Tier 6: On disconnect, release all holds and broadcast ───────────────
  socket.on("disconnect", async () => {
    const released = await releaseAllHolds(socket.id);

    // Group released seats by eventId so we can broadcast per room
    const byEvent = new Map<string, string[]>();
    for (const { eventId, seatId } of released) {
      if (!byEvent.has(eventId)) byEvent.set(eventId, []);
      byEvent.get(eventId)!.push(seatId);
    }

    for (const [eventId, seatIds] of byEvent) {
      for (const seatId of seatIds) {
        io.to(`event:${eventId}`).emit("seat_status_change", {
          seatId,
          status: "available" as const,
          heldBy: null,
        });
      }
      logger.info({ eventId, releasedCount: seatIds.length }, "Released holds for disconnected user");
    }

    socketRooms.delete(socket.id);
    logger.info({ socketId: socket.id }, "Client disconnected");
  });
});

// ── Tier 6: Periodic TTL Sweep ─────────────────────────────────────────────────
// Every 30 seconds, sweep expired holds and broadcast the releases.

setInterval(async () => {
  const expired = await sweepExpiredHolds();

  const byEvent = new Map<string, string[]>();
  for (const { eventId, seatId } of expired) {
    if (!byEvent.has(eventId)) byEvent.set(eventId, []);
    byEvent.get(eventId)!.push(seatId);
  }

  for (const [eventId, seatIds] of byEvent) {
    for (const seatId of seatIds) {
      io.to(`event:${eventId}`).emit("seat_status_change", {
        seatId,
        status: "available" as const,
        heldBy: null,
      });
    }
  }
}, 30_000);

// ── Start ──────────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  logger.info({ port: PORT }, "Realtime service started (REST + WebSocket)");
});
