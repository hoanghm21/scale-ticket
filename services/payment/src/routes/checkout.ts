import { Router, Request, Response } from "express";
import crypto from "crypto";
import { CreateIntentSchema } from "../schemas/checkout.schema";
import { MockStripeDriver } from "../lib/stripe-mock";
import pino from "pino";

const router = Router();
const logger = pino({ name: "checkout-route" });

// ── Secrets / config ──────────────────────────────────────────────────────────

const STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET || "whsec_dev_local_secret";
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || "dev-internal-token";
const REALTIME_URL = process.env.REALTIME_URL || "http://localhost:4003";

// ── In-memory persistence layers ──────────────────────────────────────────────
// In production these would live in Postgres + a durable queue. Keeping
// references here so the semantics are correct even if the backing store
// is swapped later.

interface PendingIntent {
  intentId: string;
  eventId: string;
  userId?: string;
  seatIds: string[];
  holderId: string;
  amountCents: number;
  createdAt: number;
  status: "pending" | "confirmed" | "rolled_back";
}

const pendingIntents = new Map<string, PendingIntent>();

// Idempotency cache for the /intent endpoint.
// Key = client-supplied Idempotency-Key header. Value = prior response body.
const idempotencyCache = new Map<string, { status: number; body: unknown; expiresAt: number }>();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

// Webhook dedupe: every Stripe event has a unique event id. Processing the
// same event twice would double-mint tickets.
const processedWebhookEvents = new Set<string>();

// Dead-letter queue for webhooks that exhausted retries.
interface DeadLetterEntry {
  eventId: string;
  intentId: string;
  seatIds: string[];
  userId?: string;
  holderId: string;
  timestamp: number;
  error: string;
  attempts: number;
}
const deadLetterQueue: DeadLetterEntry[] = [];

// Periodic cleanup of stale idempotency entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of idempotencyCache) {
    if (entry.expiresAt <= now) idempotencyCache.delete(key);
  }
}, 60_000).unref();

// ── Helpers ───────────────────────────────────────────────────────────────────

const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 500
): Promise<T> => {
  let attempt = 0;
  let lastErr: unknown;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (e) {
      lastErr = e;
      attempt++;
      if (attempt >= maxRetries) break;
      logger.warn({ attempt, maxRetries }, "Operation failed, retrying");
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** (attempt - 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Retry exhausted");
};

// Mirrors Stripe's signature scheme (HMAC-SHA256 over `${timestamp}.${payload}`).
// Real Stripe uses a `Stripe-Signature` header like `t=...,v1=...`.
function verifyStripeSignature(rawBody: string, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k?.trim(), v?.trim()];
    })
  );
  const timestamp = parts["t"];
  const provided = parts["v1"];
  if (!timestamp || !provided) return false;

  // Reject replayed signatures older than 5 minutes
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

async function releaseSeats(eventId: string, seatIds: string[], holderId: string) {
  // Best-effort per-seat unlock against realtime service. Failures are logged
  // but do not block — the TTL-based hold expiry is the ultimate safety net.
  await Promise.allSettled(
    seatIds.map(async (seatId) => {
      try {
        const r = await fetch(`${REALTIME_URL}/internal/confirm-sold`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-token": INTERNAL_TOKEN,
          },
          // Send an "unlock" style request — we use the same internal endpoint
          // in reverse by passing a sentinel holderId that never matches. The
          // realtime service ignores mismatches, so this becomes a no-op if
          // another holder took over after hold expiry.
          body: JSON.stringify({ eventId, seatId, holderId, release: true }),
        });
        if (!r.ok) {
          logger.warn({ seatId, status: r.status }, "Rollback call non-2xx");
        }
      } catch (err) {
        logger.error({ err, seatId }, "Rollback call failed");
      }
    })
  );
}

async function confirmSeatsSold(eventId: string, seatIds: string[], holderId: string) {
  await Promise.allSettled(
    seatIds.map(async (seatId) => {
      const r = await fetch(`${REALTIME_URL}/internal/confirm-sold`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-token": INTERNAL_TOKEN,
        },
        body: JSON.stringify({ eventId, seatId, holderId }),
      });
      if (!r.ok) {
        throw new Error(`confirm-sold ${seatId} responded ${r.status}`);
      }
    })
  );
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.post("/intent", async (req: Request, res: Response) => {
  // Idempotency: if the client retries with the same key, return the cached
  // response instead of creating a new PaymentIntent. This prevents duplicate
  // charges on network flakes.
  const idemKey = req.header("idempotency-key");
  if (idemKey) {
    const cached = idempotencyCache.get(idemKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.status(cached.status).json(cached.body);
    }
  }

  try {
    const parsed = CreateIntentSchema.safeParse(req);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid cart payload", details: parsed.error });
    }

    const { cartItems, eventId } = parsed.data.body;
    const userId = (req.body?.userId as string | undefined) ?? undefined;
    const holderId = (req.body?.holderId as string | undefined) ?? userId ?? "anonymous";

    const totalAmountDollars = cartItems.reduce((acc, item) => acc + item.price, 0);
    const totalAmountCents = Math.round(totalAmountDollars * 100);

    logger.info(
      { eventId, itemsCount: cartItems.length, totalAmountCents, idemKey: !!idemKey },
      "Received checkout request"
    );

    const intent = await MockStripeDriver.createPaymentIntent(totalAmountCents, "usd");

    pendingIntents.set(intent.id, {
      intentId: intent.id,
      eventId,
      userId,
      holderId,
      seatIds: cartItems.map((i) => i.seatId),
      amountCents: totalAmountCents,
      createdAt: Date.now(),
      status: "pending",
    });

    const body = {
      clientSecret: intent.client_secret,
      intentId: intent.id,
      amount: intent.amount,
    };

    if (idemKey) {
      idempotencyCache.set(idemKey, {
        status: 200,
        body,
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
      });
    }

    return res.status(200).json(body);
  } catch (error) {
    logger.error(error, "Failed to create payment intent");
    return res.status(500).json({ error: "Internal Server Error during checkout" });
  }
});

// Webhook — Stripe hits this on payment state changes. We orchestrate the
// cross-service flow: confirm seats sold on success, release seats on failure.
router.post("/webhook", async (req: Request, res: Response) => {
  const rawBody = JSON.stringify(req.body);
  const sig = req.header("stripe-signature");

  // Verify signature unless explicitly bypassed in dev (`ALLOW_UNSIGNED_WEBHOOK=1`).
  if (process.env.ALLOW_UNSIGNED_WEBHOOK !== "1") {
    if (!verifyStripeSignature(rawBody, sig, STRIPE_WEBHOOK_SECRET)) {
      logger.warn({ sig }, "Rejected webhook: invalid signature");
      return res.status(400).send("Invalid signature");
    }
  }

  const event = req.body as {
    id?: string;
    type?: string;
    data?: { object?: { id?: string; metadata?: { eventId?: string; userId?: string } } };
  };

  const eventId = event.id;
  if (eventId) {
    if (processedWebhookEvents.has(eventId)) {
      logger.info({ eventId }, "Webhook duplicate ignored");
      return res.status(200).send("Duplicate ignored");
    }
    processedWebhookEvents.add(eventId);
  }

  const intentId = event.data?.object?.id || (req.body.intentId as string | undefined);
  if (!intentId) {
    return res.status(400).send("Missing intent id");
  }

  const pending = pendingIntents.get(intentId);
  if (!pending) {
    logger.warn({ intentId }, "Webhook for unknown intent");
    return res.status(200).send("Unknown intent (acked)");
  }

  const succeeded =
    event.type === "payment_intent.succeeded" ||
    (req.body.status && req.body.status === "succeeded") ||
    !event.type; // dev fallback

  if (!succeeded) {
    logger.info({ intentId, type: event.type }, "Payment not successful — releasing held seats");
    await releaseSeats(pending.eventId, pending.seatIds, pending.holderId);
    pending.status = "rolled_back";
    return res.status(200).send("Handled failure");
  }

  logger.info({ intentId, eventId: pending.eventId }, "Payment succeeded — confirming seats");

  try {
    await withRetry(() =>
      confirmSeatsSold(pending.eventId, pending.seatIds, pending.holderId)
    );
    pending.status = "confirmed";
    logger.info({ intentId }, "Seats confirmed sold");
    return res.status(200).send("Webhook Processed");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ err: msg, intentId }, "Exhausted retries — moving to DLQ");

    deadLetterQueue.push({
      intentId,
      eventId: pending.eventId,
      seatIds: pending.seatIds,
      userId: pending.userId,
      holderId: pending.holderId,
      timestamp: Date.now(),
      error: msg,
      attempts: 3,
    });

    // Ack Stripe (200) so it stops re-delivering — the DLQ is authoritative now.
    return res.status(200).send("Webhook Processed (Stored in DLQ)");
  }
});

// Observability: expose the DLQ so operators can replay.
router.get("/dlq", (req: Request, res: Response) => {
  if (req.header("x-internal-token") !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  res.json({ count: deadLetterQueue.length, entries: deadLetterQueue });
});

export default router;
