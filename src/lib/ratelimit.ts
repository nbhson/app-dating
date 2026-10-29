/**
 * Storage-abstracted rate-limit layer (Round 3).
 *
 * Provides two backends selectable via RATE_LIMIT_BACKEND:
 *   "memory"  — default, same fixed-window per-process Map used since R1.
 *   "prisma"  — SQLite/Postgres-backed store via RateLimitBucket table.
 *                Uses first-hit anchored window (not epoch-aligned): the window
 *                resets N seconds after the first request, not at a fixed
 *                timestamp boundary. This makes each key's reset independent,
 *                simpler to implement, and sufficient for login-throttling.
 *
 * The shared `rateLimit()` helper accepts any store and returns
 * { allowed, count, remaining, resetAt }.
 */
import { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  resetAt: number; // epoch ms
}

export interface RateLimitStore {
  readonly backend: "memory" | "prisma";
  consume(key: string, windowMs: number, max: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Memory store — same semantics as auth.ts R1 implementation
// ---------------------------------------------------------------------------

export function createMemoryStore(): RateLimitStore {
  const store = new Map<string, { count: number; resetAt: number }>();

  return {
    backend: "memory",
    async consume(key, windowMs, max) {
      const now = Date.now();
      let entry = store.get(key);

      if (!entry || entry.resetAt < now) {
        entry = { count: 1, resetAt: now + windowMs };
        store.set(key, entry);
        // opportunistic cleanup to keep Map bounded
        if (store.size > 5000) {
          for (const [k, v] of store) {
            if (v.resetAt < now) store.delete(k);
          }
        }
      } else {
        entry.count += 1;
      }

      return {
        allowed: entry.count <= max,
        count: entry.count,
        remaining: Math.max(0, max - entry.count),
        resetAt: entry.resetAt,
      };
    },
    async reset(key) {
      store.delete(key);
    },
  };
}

// ---------------------------------------------------------------------------
// Prisma store — first-hit anchored window, upsert-based, race-safe
// ---------------------------------------------------------------------------

export function createPrismaStore(db: PrismaClient = prisma): RateLimitStore {
  const client = db;

  return {
    backend: "prisma",
    async consume(key, windowMs, max) {
      const now = Date.now();
      const expiresAt = new Date(now + windowMs);

      // 1. Reset an expired window if present — this consumes the first hit
      //    of the new window (count=1), so skip the increment below.
      const reset = await client.rateLimitBucket.updateMany({
        where: { key, expiresAt: { lte: new Date(now) } },
        data: { count: 1, windowStart: new Date(now), expiresAt },
      });

      if (reset.count === 0) {
        // 2. Active window → increment; no row → create (race-safe via PK)
        const updated = await client.rateLimitBucket.updateMany({
          where: { key },
          data: { count: { increment: 1 } },
        });
        if (updated.count === 0) {
          try {
            await client.rateLimitBucket.create({
              data: { key, count: 1, windowStart: new Date(now), expiresAt },
            });
          } catch {
            // Concurrent create raced us out → retry increment once
            await client.rateLimitBucket.updateMany({
              where: { key },
              data: { count: { increment: 1 } },
            });
          }
        }
      }

      // 4. Read final state
      const row = await client.rateLimitBucket.findUnique({ where: { key } });
      if (!row) {
        // Should not happen but keep server alive
        return { allowed: true, count: 1, remaining: max - 1, resetAt: now + windowMs };
      }

      return {
        allowed: row.count <= max,
        count: row.count,
        remaining: Math.max(0, max - row.count),
        resetAt: row.expiresAt.getTime(),
      };
    },
    async reset(key) {
      await client.rateLimitBucket.deleteMany({ where: { key } });
    },
  };
}

// ---------------------------------------------------------------------------
// Singleton store (lazy, per process)
// ---------------------------------------------------------------------------

let _store: RateLimitStore | null = null;

export function getRateLimitStore(): RateLimitStore {
  if (_store) return _store;
  const backend = process.env.RATE_LIMIT_BACKEND ?? "memory";
  if (backend === "prisma") {
    _store = createPrismaStore();
  } else {
    _store = createMemoryStore();
  }
  return _store;
}

// ---------------------------------------------------------------------------
// Convenience wrapper — mirrors the auth.ts call-site pattern
// ---------------------------------------------------------------------------

/** Returns true if the request is allowed, false if rate-limited. */
export async function rateLimit(
  key: string,
  windowMs: number,
  max: number,
): Promise<boolean> {
  const { allowed } = await getRateLimitStore().consume(key, windowMs, max);
  return allowed;
}