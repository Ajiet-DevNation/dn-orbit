import { describe, expect, test } from "bun:test";
import {
  backoffMs,
  DRAIN_BUDGET_MS,
  GH_TTL_MS,
  hasBudget,
  LC_TTL_MS,
  MAX_BACKOFF_MS,
  needsAnything,
  needsGithub,
  needsLeetCode,
  nextAttemptAt,
  orderQueue,
  queuePriority,
  type StaleInput,
} from "./sync-queue";

const NOW = 1_800_000_000_000;
const state = (over: Partial<StaleInput> = {}): StaleInput => ({
  ghFetchedAt: new Date(NOW),
  lcFetchedAt: new Date(NOW),
  ghDirty: false,
  lcDirty: false,
  ...over,
});

describe("backoffMs", () => {
  test("no backoff before any failure", () => {
    expect(backoffMs(0)).toBe(0);
    expect(backoffMs(-1)).toBe(0);
  });

  test("doubles per consecutive failure", () => {
    expect(backoffMs(2)).toBe(backoffMs(1) * 2);
    expect(backoffMs(3)).toBe(backoffMs(1) * 4);
  });

  test("is capped, so a permanently broken token can't push retries past a day", () => {
    expect(backoffMs(99)).toBe(MAX_BACKOFF_MS);
    expect(backoffMs(1000)).toBe(MAX_BACKOFF_MS);
  });

  test("nextAttemptAt is now + backoff", () => {
    expect(nextAttemptAt(0, NOW).getTime()).toBe(NOW);
    expect(nextAttemptAt(3, NOW).getTime()).toBe(NOW + backoffMs(3));
  });
});

describe("staleness", () => {
  test("fresh stats need nothing", () => {
    expect(needsGithub(state(), NOW)).toBe(false);
    expect(needsLeetCode(state(), NOW)).toBe(false);
    expect(needsAnything(state(), NOW)).toBe(false);
  });

  test("never-fetched always needs a refresh, so new members appear quickly", () => {
    expect(needsGithub(state({ ghFetchedAt: null }), NOW)).toBe(true);
    expect(needsLeetCode(state({ lcFetchedAt: null }), NOW)).toBe(true);
  });

  test("each provider has its own TTL", () => {
    const justOverGh = new Date(NOW - GH_TTL_MS - 1);
    expect(needsGithub(state({ ghFetchedAt: justOverGh }), NOW)).toBe(true);
    // The same age is still fresh for LeetCode, which is polled less often.
    expect(needsLeetCode(state({ lcFetchedAt: justOverGh }), NOW)).toBe(false);
    expect(LC_TTL_MS).toBeGreaterThan(GH_TTL_MS);
  });

  test("exactly at the TTL is still fresh; one ms past is stale", () => {
    expect(
      needsGithub(state({ ghFetchedAt: new Date(NOW - GH_TTL_MS) }), NOW),
    ).toBe(false);
    expect(
      needsGithub(state({ ghFetchedAt: new Date(NOW - GH_TTL_MS - 1) }), NOW),
    ).toBe(true);
  });

  test("a webhook-set dirty flag overrides freshness", () => {
    // This is the whole point: a push just landed, refresh regardless of TTL.
    expect(needsGithub(state({ ghDirty: true }), NOW)).toBe(true);
    expect(needsAnything(state({ ghDirty: true }), NOW)).toBe(true);
  });

  test("needsAnything is true when either provider is stale", () => {
    expect(needsAnything(state({ ghFetchedAt: null }), NOW)).toBe(true);
    expect(needsAnything(state({ lcFetchedAt: null }), NOW)).toBe(true);
  });
});

describe("queue ordering", () => {
  test("dirty members sort ahead of everyone", () => {
    const dirty = state({ ghDirty: true, ghFetchedAt: new Date(NOW) });
    const ancient = state({
      ghFetchedAt: new Date(0),
      lcFetchedAt: new Date(0),
    });
    expect(queuePriority(dirty)).toBeLessThan(queuePriority(ancient));
  });

  test("otherwise it's stalest-first", () => {
    const old = state({ ghFetchedAt: new Date(NOW - 100_000) });
    const recent = state({ ghFetchedAt: new Date(NOW) });
    expect(queuePriority(old)).toBeLessThan(queuePriority(recent));
  });

  test("never-fetched sorts before any fetched member", () => {
    const never = state({ ghFetchedAt: null, lcFetchedAt: null });
    const ancient = state({
      ghFetchedAt: new Date(0),
      lcFetchedAt: new Date(0),
    });
    expect(queuePriority(never)).toBeLessThanOrEqual(queuePriority(ancient));
  });

  test("orderQueue puts dirty first, then oldest, and does not mutate its input", () => {
    const a = { id: "recent", ...state({ ghFetchedAt: new Date(NOW) }) };
    const b = { id: "old", ...state({ ghFetchedAt: new Date(NOW - 500_000) }) };
    const c = { id: "dirty", ...state({ ghDirty: true }) };
    const input = [a, b, c];
    const out = orderQueue(input);
    expect(out.map((x) => x.id)).toEqual(["dirty", "old", "recent"]);
    expect(input.map((x) => x.id)).toEqual(["recent", "old", "dirty"]);
  });
});

describe("hasBudget", () => {
  test("allows work inside the budget and stops past it", () => {
    expect(hasBudget(NOW, NOW)).toBe(true);
    expect(hasBudget(NOW, NOW + DRAIN_BUDGET_MS - 1)).toBe(true);
    expect(hasBudget(NOW, NOW + DRAIN_BUDGET_MS)).toBe(false);
  });

  test("the budget leaves headroom under the route's 60s ceiling", () => {
    expect(DRAIN_BUDGET_MS).toBeLessThan(60_000);
  });
});
