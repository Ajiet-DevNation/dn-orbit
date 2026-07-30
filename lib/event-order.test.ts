import { describe, expect, it } from "bun:test";
import { orderForDisplay } from "./event-order";

// `now` is always injected so these assertions do not rot as the clock moves.
const NOW = new Date("2026-07-30T12:00:00.000Z");

const ev = (label: string, iso: string) => ({
  label,
  eventDate: new Date(iso),
});

describe("orderForDisplay", () => {
  it("puts upcoming events first, soonest first", () => {
    const out = orderForDisplay(
      [
        ev("october", "2026-10-03T16:00:00Z"),
        ev("august", "2026-08-08T11:00:00Z"),
        ev("september", "2026-09-15T09:15:00Z"),
      ],
      NOW,
    );
    expect(out.map((e) => e.label)).toEqual(["august", "september", "october"]);
  });

  it("puts past events after upcoming ones, most recent first", () => {
    const out = orderForDisplay(
      [
        ev("february", "2026-02-14T10:00:00Z"),
        ev("july-past", "2026-07-18T09:00:00Z"),
        ev("august", "2026-08-08T11:00:00Z"),
        ev("april", "2026-04-11T09:30:00Z"),
      ],
      NOW,
    );
    // This is the case that matters: the announcement strip slices the first N,
    // and February must never be one of them while August is pending.
    expect(out.map((e) => e.label)).toEqual([
      "august",
      "july-past",
      "april",
      "february",
    ]);
  });

  it("treats an event starting exactly now as upcoming", () => {
    const out = orderForDisplay(
      [ev("yesterday", "2026-07-29T12:00:00Z"), ev("now", NOW.toISOString())],
      NOW,
    );
    expect(out.map((e) => e.label)).toEqual(["now", "yesterday"]);
  });

  it("handles all-past and all-upcoming inputs", () => {
    const allPast = orderForDisplay(
      [ev("a", "2026-01-01T00:00:00Z"), ev("b", "2026-06-01T00:00:00Z")],
      NOW,
    );
    expect(allPast.map((e) => e.label)).toEqual(["b", "a"]);

    const allFuture = orderForDisplay(
      [ev("a", "2027-01-01T00:00:00Z"), ev("b", "2026-09-01T00:00:00Z")],
      NOW,
    );
    expect(allFuture.map((e) => e.label)).toEqual(["b", "a"]);
  });

  it("returns an empty array unchanged", () => {
    expect(orderForDisplay([], NOW)).toEqual([]);
  });

  it("does not mutate the input array's order", () => {
    const input = [
      ev("february", "2026-02-14T10:00:00Z"),
      ev("august", "2026-08-08T11:00:00Z"),
    ];
    orderForDisplay(input, NOW);
    expect(input.map((e) => e.label)).toEqual(["february", "august"]);
  });
});
