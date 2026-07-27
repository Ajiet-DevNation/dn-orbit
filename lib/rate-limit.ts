// Fixed-window rate limiter, in process memory.
//
// Scope and honesty about what this is: the counters live in the memory of a
// single serverless instance, so a request that lands on a cold/second instance
// starts from a fresh window. It is therefore a speed bump, not a guarantee —
// it stops a naive loop hammering an endpoint (which is the actual risk here:
// anonymous event registrations, and proxying traffic to LeetCode's unofficial
// API from one Vercel egress IP), and it costs no external infrastructure.
//
// If the club ever needs a hard guarantee across instances, this module is the
// single seam to swap for a Redis/Upstash-backed implementation — every caller
// goes through `rateLimit()` and nothing else touches the internals.

export interface RateLimitResult {
  ok: boolean;
  /** Requests still allowed in the current window. */
  remaining: number;
  /** Epoch ms at which the current window rolls over. */
  resetAt: number;
  /** Seconds until reset — for the Retry-After header. */
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Sweep threshold: only prune when the map has grown enough to be worth it, so
// the common path stays a single Map lookup.
const SWEEP_AT_SIZE = 5_000;

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Consume one token for `key`.
 *
 * @param key    Caller identity — see `rateLimitKey`.
 * @param limit  Requests allowed per window.
 * @param windowMs Window length in ms.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  if (buckets.size >= SWEEP_AT_SIZE) sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      ok: true,
      remaining: limit - 1,
      resetAt,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((existing.resetAt - now) / 1000),
  );

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds,
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
    retryAfterSeconds,
  };
}

/**
 * Build a limiter key for a request.
 *
 * Prefers the authenticated user id — it survives NAT and shared campus Wi-Fi,
 * where a whole cohort shares one egress IP and would otherwise throttle each
 * other. Falls back to the proxy-provided client IP for anonymous callers.
 *
 * Only the FIRST entry of x-forwarded-for is used: on Vercel that hop is set by
 * the platform, while later entries are attacker-controllable.
 */
export function rateLimitKey(
  req: Request,
  scope: string,
  userId?: string | null,
): string {
  if (userId) return `${scope}:user:${userId}`;

  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown";

  return `${scope}:ip:${ip}`;
}

/** Standard 429 response with the headers clients expect. */
export function tooManyRequests(result: RateLimitResult): Response {
  return Response.json(
    { error: "Too many requests. Slow down and try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "RateLimit-Remaining": "0",
        "RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    },
  );
}

/** Test-only: drop all state so cases don't leak into each other. */
export function __resetRateLimits(): void {
  buckets.clear();
}
