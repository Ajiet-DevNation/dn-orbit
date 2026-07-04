import { describe, expect, test } from "bun:test";
import { isStale, STALE_MS } from "@/lib/sync";

describe("isStale", () => {
  test("never-synced is stale", () => {
    expect(isStale(null, Date.now())).toBe(true);
  });

  test("just-synced is fresh", () => {
    const now = Date.now();
    expect(isStale(new Date(now - 1000), now)).toBe(false);
  });

  test("exactly at the window edge is fresh (strictly-older triggers)", () => {
    const now = Date.now();
    expect(isStale(new Date(now - STALE_MS), now)).toBe(false);
  });

  test("older than the window is stale", () => {
    const now = Date.now();
    expect(isStale(new Date(now - STALE_MS - 1), now)).toBe(true);
  });
});
