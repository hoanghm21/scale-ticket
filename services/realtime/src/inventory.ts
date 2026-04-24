import pino from "pino";
import { createClient } from "redis";

const logger = pino({ name: "seat-inventory" });

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
// Fail-loud mode: in production, set REDIS_REQUIRED=1 so the service aborts
// instead of drifting into in-memory mode where holds are lost on restart
// and inconsistent across replicas.
const REDIS_REQUIRED = process.env.REDIS_REQUIRED === "1" || process.env.NODE_ENV === "production";

export const redis = createClient({
  url: REDIS_URL,
  socket: {
    // Exponential backoff reconnect, capped at 10s
    reconnectStrategy: (retries) => Math.min(100 * 2 ** retries, 10_000),
  },
});
redis.on("error", (err) => logger.error({ err }, "Redis Client Error"));
redis.on("reconnecting", () => logger.warn("Redis reconnecting"));
redis.on("ready", () => logger.info({ url: REDIS_URL }, "Redis ready"));

export const redisReady: Promise<void> = redis
  .connect()
  .then(() => undefined)
  .catch((err) => {
    logger.error({ err, url: REDIS_URL }, "Redis connect failed");
    if (REDIS_REQUIRED) {
      // Crash — orchestrator will restart; better than silent in-memory drift.
      process.exit(1);
    }
  });

export function isRedisReady(): boolean {
  return redis.isReady;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type SeatStatus = "available" | "held" | "sold";

export interface SeatData {
  id: string;
  section: string;
  row: number;
  col: number;
  x: number;
  y: number;
  price: number;
  status: SeatStatus;
  heldBy?: string;     // socket/user ID that holds the lock
  heldUntil?: number;  // UNIX timestamp when the hold expires
}

export type LayoutType = "arena" | "stadium" | "theater";

// ── Deterministic PRNG ─────────────────────────────────────────────────────────
// Replaces Math.random() so every client gets the SAME initial map.
// Uses a simple mulberry32 seeded RNG.

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Seat Generation (mirrors SeatMap.tsx logic exactly) ────────────────────────

const SP = 18;
const PI = Math.PI;

function makeSeat(
  rng: () => number,
  name: string,
  x: number,
  y: number,
  r: number,
  c: number,
  prob: number,
  basePrice: number,
  mult: number
): SeatData {
  return {
    id: `${name}-${r}-${c}`,
    section: name,
    row: r,
    col: c,
    x,
    y,
    price: basePrice * mult,
    status: rng() > prob ? "sold" : "available",
  };
}

function genRect(
  out: SeatData[],
  rng: () => number,
  name: string,
  sx: number,
  sy: number,
  rows: number,
  cols: number,
  prob: number,
  basePrice: number,
  mult: number
) {
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push(makeSeat(rng, name, sx + c * SP, sy + r * SP, r, c, prob, basePrice, mult));
}

function genArc(
  out: SeatData[],
  rng: () => number,
  name: string,
  cx: number,
  cy: number,
  r0: number,
  rows: number,
  cols: number,
  a0: number,
  a1: number,
  prob: number,
  basePrice: number,
  mult: number
) {
  for (let r = 0; r < rows; r++) {
    const rad = r0 + r * SP;
    const nc = cols + Math.floor(r * 1.5);
    const step = (a1 - a0) / (nc - 1);
    for (let c = 0; c < nc; c++) {
      if (name.includes("Corner") && (c === 0 || c === nc - 1)) continue;
      const a = a0 + c * step;
      out.push(
        makeSeat(rng, name, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, r, c, prob, basePrice, mult)
      );
    }
  }
}

export function generateSeats(
  layoutType: LayoutType,
  basePrice: number,
  seed: number
): SeatData[] {
  const rng = mulberry32(seed);
  const out: SeatData[] = [];

  if (layoutType === "stadium") {
    genRect(out, rng, "North Stand", 238, 40, 6, 19, 0.6, basePrice, 1.2);
    genRect(out, rng, "South Stand", 238, 464, 6, 19, 0.6, basePrice, 1.2);
    genRect(out, rng, "West Stand", 80, 198, 12, 6, 0.8, basePrice, 1.0);
    genRect(out, rng, "East Stand", 630, 198, 12, 6, 0.8, basePrice, 1.0);
    genArc(out, rng, "NW Corner", 220, 180, 50, 6, 5, PI * 1.0, PI * 1.5, 0.7, basePrice, 2.5);
    genArc(out, rng, "NE Corner", 580, 180, 50, 6, 5, PI * 1.5, PI * 2.0, 0.7, basePrice, 2.5);
    genArc(out, rng, "SW Corner", 220, 414, 50, 6, 5, PI * 0.5, PI * 1.0, 0.7, basePrice, 2.5);
    genArc(out, rng, "SE Corner", 580, 414, 50, 6, 5, 0, PI * 0.5, 0.7, basePrice, 2.5);
  } else if (layoutType === "arena") {
    genRect(out, rng, "Floor VIP", 310, 180, 5, 11, 0.6, basePrice, 2.5);
    genRect(out, rng, "Floor General", 290, 280, 7, 13, 0.7, basePrice, 1.5);
    genArc(out, rng, "Bowl Left", 400, 230, 220, 12, 8, PI * 0.95, PI * 0.70, 0.8, basePrice, 1.0);
    genArc(out, rng, "Bowl Center", 400, 230, 220, 12, 16, PI * 0.65, PI * 0.35, 0.8, basePrice, 1.0);
    genArc(out, rng, "Bowl Right", 400, 230, 220, 12, 8, PI * 0.30, PI * 0.05, 0.8, basePrice, 1.0);
  } else {
    // Theater
    for (let r = 0; r < 14; r++) {
      const cols = 8 + Math.floor(r * 0.3);
      const startX = 400 - (cols - 1) * 9;
      for (let c = 0; c < cols; c++)
        out.push(makeSeat(rng, "Swan", startX + c * SP, 152 + r * SP, r, c, 0.5, basePrice, 3.0));
    }
    genRect(out, rng, "Sword L", 216, 196, 12, 4, 0.6, basePrice, 2.4);
    genRect(out, rng, "Sword R", 530, 196, 12, 4, 0.6, basePrice, 2.4);
    genRect(out, rng, "Ballerina L", 132, 160, 14, 4, 0.7, basePrice, 1.8);
    genRect(out, rng, "Ballerina R", 614, 160, 14, 4, 0.7, basePrice, 1.8);
    genRect(out, rng, "Feather L", 54, 150, 14, 4, 0.75, basePrice, 1.2);
    genRect(out, rng, "Feather R", 692, 150, 14, 4, 0.75, basePrice, 1.2);
    genRect(out, rng, "2F Feather L", 54, 438, 5, 9, 0.8, basePrice, 1.2);
    genRect(out, rng, "2F Feather C", 228, 438, 5, 20, 0.8, basePrice, 1.2);
    genRect(out, rng, "2F Feather R", 600, 438, 5, 9, 0.8, basePrice, 1.2);
    genRect(out, rng, "2F Moonlight L", 54, 556, 5, 9, 0.85, basePrice, 1.0);
    genRect(out, rng, "2F Moonlight C", 228, 556, 5, 20, 0.85, basePrice, 1.0);
    genRect(out, rng, "2F Moonlight R", 600, 556, 5, 9, 0.85, basePrice, 1.0);
  }

  logger.info({ layoutType, seatCount: out.length, seed }, "Generated deterministic seat inventory");
  return out;
}

// ── In-Memory Inventory Store ──────────────────────────────────────────────────
// In production this would be backed by Redis + MongoDB.
// For now, a simple Map keyed by eventId → seat map.

const inventoryStore = new Map<string, Map<string, SeatData>>();

// Event configs: maps eventId to its layout parameters.
// In production these come from MongoDB.
const EVENT_CONFIGS: Record<string, { layout: LayoutType; basePrice: number; seed: number }> = {
  // Matches apps/web/src/lib/mock.ts event IDs & categories
  "e_1": { layout: "arena",   basePrice: 129, seed: 42   },  // Neon Nights (Concerts → arena)
  "e_2": { layout: "stadium", basePrice: 250, seed: 99   },  // Championship Finals (Sports → stadium)
  "e_3": { layout: "arena",   basePrice: 85,  seed: 7    },  // Symphony Under the Stars (Concerts → arena)
  "e_4": { layout: "theater", basePrice: 150, seed: 2024 },  // Hamilton (Arts & Theater → theater)
  "e_5": { layout: "stadium", basePrice: 450, seed: 555  },  // F1 Grand Prix (Sports → stadium)
  "e_6": { layout: "arena",   basePrice: 599, seed: 333  },  // Coachella (Concerts → arena)
};

export async function getOrCreateInventory(eventId: string): Promise<Map<string, SeatData>> {
  if (inventoryStore.has(eventId)) {
    return inventoryStore.get(eventId)!;
  }

  // Try to load from Redis (skip if disconnected — next request will retry)
  if (isRedisReady()) {
    try {
      const cached = await redis.get(`event:${eventId}:inventory`);
      if (cached) {
        const parsed = JSON.parse(cached) as [string, SeatData][];
        const seatMap = new Map(parsed);
        inventoryStore.set(eventId, seatMap);
        logger.info({ eventId, totalSeats: seatMap.size }, "Inventory loaded from Redis");
        return seatMap;
      }
    } catch (err) {
      logger.error({ err, eventId }, "Failed to load Redis inventory");
    }
  }

  const config = EVENT_CONFIGS[eventId];
  let seatMap = new Map<string, SeatData>();

  if (!config) {
    let hash = 0;
    for (let i = 0; i < eventId.length; i++) {
      hash = ((hash << 5) - hash + eventId.charCodeAt(i)) | 0;
    }
    const seats = generateSeats("arena", 50, Math.abs(hash));
    seats.forEach((s) => seatMap.set(s.id, s));
  } else {
    const seats = generateSeats(config.layout, config.basePrice, config.seed);
    seats.forEach((s) => seatMap.set(s.id, s));
  }

  inventoryStore.set(eventId, seatMap);
  
  // Save to Redis
  await persistInventory(eventId, seatMap);
  
  logger.info({ eventId, totalSeats: seatMap.size }, "Inventory generated and saved to Redis");
  return seatMap;
}

async function persistInventory(eventId: string, seatMap: Map<string, SeatData>) {
  if (!isRedisReady()) return;
  try {
    const data = JSON.stringify(Array.from(seatMap.entries()));
    await redis.set(`event:${eventId}:inventory`, data);
  } catch (err) {
    logger.error({ err, eventId }, "Failed to persist inventory snapshot");
  }
}

// ── Lock / Unlock operations ───────────────────────────────────────────────────

const HOLD_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export interface LockResult {
  success: boolean;
  reason?: string;
  seat?: SeatData;
}

const holdKey = (eventId: string, seatId: string) => `event:${eventId}:hold:${seatId}`;
const soldKey = (eventId: string, seatId: string) => `event:${eventId}:sold:${seatId}`;

// Atomic acquire via SET NX PX. If the key already exists with the same holder
// we refresh the TTL (idempotent re-lock from same client). Otherwise fail.
// Lua script keeps the check-and-set atomic across replicas.
const LOCK_LUA = `
local existing = redis.call('GET', KEYS[1])
if existing and existing ~= ARGV[1] then
  return 0
end
redis.call('SET', KEYS[1], ARGV[1], 'PX', tonumber(ARGV[2]))
return 1
`;

// Unlock must only release our own hold. Compare-and-delete atomically.
const UNLOCK_LUA = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
`;

export async function lockSeat(eventId: string, seatId: string, holderId: string): Promise<LockResult> {
  const inv = await getOrCreateInventory(eventId);
  const seat = inv.get(seatId);
  if (!seat) return { success: false, reason: "Seat not found" };

  // Sold is final — check Redis too in case the local cache is stale
  if (seat.status === "sold") return { success: false, reason: "Seat already sold" };
  if (isRedisReady()) {
    const sold = await redis.exists(soldKey(eventId, seatId));
    if (sold) {
      seat.status = "sold";
      return { success: false, reason: "Seat already sold" };
    }
  }

  if (isRedisReady()) {
    const acquired = (await redis.eval(LOCK_LUA, {
      keys: [holdKey(eventId, seatId)],
      arguments: [holderId, String(HOLD_DURATION_MS)],
    })) as number;
    if (acquired !== 1) {
      return { success: false, reason: "Seat is held by another user" };
    }
  } else if (REDIS_REQUIRED) {
    return { success: false, reason: "Lock service unavailable" };
  } else {
    // In-memory fallback (dev only): check current hold
    if (seat.status === "held" && seat.heldBy !== holderId && seat.heldUntil && Date.now() < seat.heldUntil) {
      return { success: false, reason: "Seat is held by another user" };
    }
  }

  seat.status = "held";
  seat.heldBy = holderId;
  seat.heldUntil = Date.now() + HOLD_DURATION_MS;

  // Best-effort snapshot refresh for new joiners; authority stays in hold key.
  void persistInventory(eventId, inv);

  logger.info({ eventId, seatId, holderId, expiresIn: "5m" }, "Seat locked");
  return { success: true, seat: { ...seat } };
}

export async function unlockSeat(eventId: string, seatId: string, holderId: string): Promise<LockResult> {
  const inv = await getOrCreateInventory(eventId);
  const seat = inv.get(seatId);
  if (!seat) return { success: false, reason: "Seat not found" };

  if (isRedisReady()) {
    const released = (await redis.eval(UNLOCK_LUA, {
      keys: [holdKey(eventId, seatId)],
      arguments: [holderId],
    })) as number;
    if (released !== 1) {
      return { success: false, reason: "Not your hold" };
    }
  } else if (REDIS_REQUIRED) {
    return { success: false, reason: "Lock service unavailable" };
  } else {
    if (seat.status !== "held") return { success: false, reason: "Seat is not held" };
    if (seat.heldBy !== holderId) return { success: false, reason: "Not your hold" };
  }

  seat.status = "available";
  seat.heldBy = undefined;
  seat.heldUntil = undefined;

  void persistInventory(eventId, inv);

  logger.info({ eventId, seatId, holderId }, "Seat unlocked");
  return { success: true, seat: { ...seat } };
}

// Called after a confirmed payment. Promotes the hold to "sold" permanently.
// Only succeeds if the caller still owns the active hold — prevents spoofed
// webhook marking someone else's seat sold.
export async function confirmSeatSold(eventId: string, seatId: string, holderId: string): Promise<LockResult> {
  const inv = await getOrCreateInventory(eventId);
  const seat = inv.get(seatId);
  if (!seat) return { success: false, reason: "Seat not found" };

  if (isRedisReady()) {
    const released = (await redis.eval(UNLOCK_LUA, {
      keys: [holdKey(eventId, seatId)],
      arguments: [holderId],
    })) as number;
    if (released !== 1) {
      return { success: false, reason: "Hold expired or not owned" };
    }
    await redis.set(soldKey(eventId, seatId), holderId);
  } else if (REDIS_REQUIRED) {
    return { success: false, reason: "Lock service unavailable" };
  }

  seat.status = "sold";
  seat.heldBy = undefined;
  seat.heldUntil = undefined;
  void persistInventory(eventId, inv);
  logger.info({ eventId, seatId, holderId }, "Seat sold");
  return { success: true, seat: { ...seat } };
}

// Release all holds for a given holder (e.g. when they disconnect)
export async function releaseAllHolds(holderId: string): Promise<{ eventId: string; seatId: string }[]> {
  const released: { eventId: string; seatId: string }[] = [];
  const modifiedEvents = new Set<string>();

  for (const [eventId, seatMap] of inventoryStore) {
    for (const [seatId, seat] of seatMap) {
      if (seat.status === "held" && seat.heldBy === holderId) {
        seat.status = "available";
        seat.heldBy = undefined;
        seat.heldUntil = undefined;
        released.push({ eventId, seatId });
        modifiedEvents.add(eventId);
      }
    }
  }

  for (const eventId of modifiedEvents) {
    await persistInventory(eventId, inventoryStore.get(eventId)!);
  }

  if (released.length > 0) {
    logger.info({ holderId, releasedCount: released.length }, "Released all holds for disconnected user");
  }
  return released;
}

// Sweep expired holds (called periodically by a timer)
export async function sweepExpiredHolds(): Promise<{ eventId: string; seatId: string }[]> {
  const now = Date.now();
  const expired: { eventId: string; seatId: string }[] = [];
  const modifiedEvents = new Set<string>();

  for (const [eventId, seatMap] of inventoryStore) {
    for (const [seatId, seat] of seatMap) {
      if (seat.status === "held" && seat.heldUntil && now >= seat.heldUntil) {
        seat.status = "available";
        seat.heldBy = undefined;
        seat.heldUntil = undefined;
        expired.push({ eventId, seatId });
        modifiedEvents.add(eventId);
      }
    }
  }

  for (const eventId of modifiedEvents) {
    await persistInventory(eventId, inventoryStore.get(eventId)!);
  }

  if (expired.length > 0) {
    logger.info({ expiredCount: expired.length }, "Swept expired seat holds");
  }
  return expired;
}
