import { beforeEach, describe, expect, test } from "bun:test";
import {
  __resetRateLimits,
  rateLimit,
  rateLimitKey,
  tooManyRequests,
} from "./rate-limit";

beforeEach(() => {
  __resetRateLimits();
});

describe("rateLimit", () => {
  test("allows exactly `limit` requests inside a window", () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("k", 3, 60_000, now).ok).toBe(true);
    }
    expect(rateLimit("k", 3, 60_000, now).ok).toBe(false);
  });

  test("counts down `remaining`", () => {
    const now = 1_000_000;
    expect(rateLimit("k", 3, 60_000, now).remaining).toBe(2);
    expect(rateLimit("k", 3, 60_000, now).remaining).toBe(1);
    expect(rateLimit("k", 3, 60_000, now).remaining).toBe(0);
  });

  test("resets once the window has elapsed", () => {
    const now = 1_000_000;
    rateLimit("k", 1, 60_000, now);
    expect(rateLimit("k", 1, 60_000, now).ok).toBe(false);

    // One ms before rollover: still blocked.
    expect(rateLimit("k", 1, 60_000, now + 59_999).ok).toBe(false);
    // At rollover: allowed again.
    expect(rateLimit("k", 1, 60_000, now + 60_000).ok).toBe(true);
  });

  test("keeps separate keys independent", () => {
    const now = 1_000_000;
    rateLimit("a", 1, 60_000, now);
    expect(rateLimit("a", 1, 60_000, now).ok).toBe(false);
    expect(rateLimit("b", 1, 60_000, now).ok).toBe(true);
  });

  test("reports a retry-after that shrinks as the window drains", () => {
    const now = 1_000_000;
    rateLimit("k", 1, 60_000, now);
    const early = rateLimit("k", 1, 60_000, now + 1_000);
    const late = rateLimit("k", 1, 60_000, now + 50_000);
    expect(early.retryAfterSeconds).toBe(59);
    expect(late.retryAfterSeconds).toBe(10);
  });

  test("never reports a retry-after below 1 second", () => {
    const now = 1_000_000;
    rateLimit("k", 1, 60_000, now);
    const result = rateLimit("k", 1, 60_000, now + 59_999);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
});

describe("rateLimitKey", () => {
  const req = (headers: Record<string, string>) =>
    new Request("http://localhost/x", { headers });

  test("prefers the user id so a shared campus IP doesn't self-throttle", () => {
    const key = rateLimitKey(
      req({ "x-forwarded-for": "10.0.0.1" }),
      "register",
      "user-123",
    );
    expect(key).toBe("register:user:user-123");
  });

  test("falls back to the client IP for anonymous callers", () => {
    expect(
      rateLimitKey(req({ "x-forwarded-for": "10.0.0.1" }), "register"),
    ).toBe("register:ip:10.0.0.1");
  });

  test("uses only the first x-forwarded-for hop", () => {
    // Later entries are attacker-supplied; trusting them would let a caller
    // mint a fresh bucket per request.
    const key = rateLimitKey(
      req({ "x-forwarded-for": "10.0.0.1, 1.2.3.4, 5.6.7.8" }),
      "register",
    );
    expect(key).toBe("register:ip:10.0.0.1");
  });

  test("falls back to x-real-ip, then to a constant", () => {
    expect(rateLimitKey(req({ "x-real-ip": "9.9.9.9" }), "s")).toBe(
      "s:ip:9.9.9.9",
    );
    expect(rateLimitKey(req({}), "s")).toBe("s:ip:unknown");
  });

  test("scopes keys so different endpoints don't share a budget", () => {
    expect(rateLimitKey(req({}), "a", "u1")).not.toBe(
      rateLimitKey(req({}), "b", "u1"),
    );
  });
});

describe("tooManyRequests", () => {
  test("returns 429 with Retry-After", async () => {
    const res = tooManyRequests({
      ok: false,
      remaining: 0,
      resetAt: 1_700_000_000_000,
      retryAfterSeconds: 42,
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    expect(await res.json()).toHaveProperty("error");
  });
});
