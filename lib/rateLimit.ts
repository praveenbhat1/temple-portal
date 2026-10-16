/**
 * In-memory rate limiting for the public API routes — server-side only.
 *
 * Every route under /api that an unauthenticated visitor can reach is a lever
 * someone can pull in a loop: /api/bookings/create writes a Firestore document
 * per call, and /api/bookings/lookup is an oracle for guessing booking
 * references. Neither had a limit.
 *
 * Counters live in Upstash Redis when UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are set. That matters on Vercel: each serverless
 * instance has its own memory, so an in-process Map gives every cold start a
 * fresh allowance and barely limits anything. With Redis every instance shares
 * one counter.
 *
 * Without those variables — local development, or if Redis is unreachable —
 * it falls back to the in-memory Map. A Redis outage therefore weakens the
 * limit rather than taking bookings offline.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Drop expired buckets so the Map can't grow without bound. */
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Calls left in this window. */
  remaining: number;
  /** Seconds until the window resets — surfaced as Retry-After. */
  retryAfter: number;
}

/**
 * Count one call against `key` and say whether it is allowed.
 *
 * @param key     Identity of the caller for this limit, e.g. `create:1.2.3.4`.
 * @param limit   Calls permitted per window.
 * @param windowMs Window length in milliseconds.
 */
export async function check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const shared = await checkRedis(key, limit, windowMs);
  return shared ?? checkMemory(key, limit, windowMs);
}

/**
 * Fixed-window counter in Upstash over its REST API: INCR the key, set its
 * expiry only when the key is new (NX), and read the remaining TTL — one
 * round trip. Returns null when Redis is not configured or fails.
 */
async function checkRedis(key: string, limit: number, windowMs: number): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  const redisKey = `rl:${key}`;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["PEXPIRE", redisKey, String(windowMs), "NX"],
        ["PTTL", redisKey],
      ]),
      cache: "no-store",
      // A slow Redis must not hold a devotee's booking hostage.
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const [incr, , pttl] = (await res.json()) as { result?: number }[];
    const count = Number(incr?.result);
    if (!Number.isFinite(count)) throw new Error("unexpected response");
    const ttl = Math.max(0, Number(pttl?.result) || windowMs);
    return count > limit
      ? { ok: false, remaining: 0, retryAfter: Math.ceil(ttl / 1000) }
      : { ok: true, remaining: limit - count, retryAfter: 0 };
  } catch (err) {
    console.error("Rate limit store unavailable, using in-memory fallback:", (err as Error).message);
    return null;
  }
}

function checkMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  return { ok: true, remaining: limit - bucket.count, retryAfter: 0 };
}

/**
 * Best-effort caller IP.
 *
 * x-forwarded-for is the client's only when a trusted proxy sets it, which is
 * true on Vercel — it overwrites the header rather than appending to it. Behind
 * anything else this is spoofable, so it is a throttle, not an access control.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** 429 body + Retry-After, shaped like the other error responses in this app. */
export function tooManyRequests(result: RateLimitResult, message: string) {
  return new Response(
    JSON.stringify({ error: message, reason: "rate_limited", retryAfter: result.retryAfter }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfter),
      },
    }
  );
}
