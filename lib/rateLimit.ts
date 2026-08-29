/**
 * In-memory rate limiting for the public API routes — server-side only.
 *
 * Every route under /api that an unauthenticated visitor can reach is a lever
 * someone can pull in a loop: /api/bookings/create writes a Firestore document
 * per call, and /api/bookings/lookup is an oracle for guessing booking
 * references. Neither had a limit.
 *
 * The store is a Map in the server process, which has one real consequence:
 * on serverless (Vercel) each instance keeps its own counter, so a burst spread
 * across cold starts gets a fresh allowance. That is fine for what this is —
 * it stops the loop-from-one-laptop case, which is the realistic threat for a
 * temple site, and it costs nothing. If the site ever needs a hard guarantee,
 * swap the Map for Upstash Redis behind the same `check()` signature.
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
export function check(key: string, limit: number, windowMs: number): RateLimitResult {
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
