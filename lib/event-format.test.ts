import { describe, expect, it } from "bun:test";
import {
  formatEventDateLong,
  formatEventDateShort,
  formatEventDateTime,
  formatEventTime,
} from "./event-format";

// The whole point of this module is that output does not depend on the machine
// running it, so every case asserts an exact string for a fixed instant.
const AT_1830Z = new Date("2026-07-15T18:30:00.000Z");
const NEAR_MIDNIGHT_Z = new Date("2026-07-15T23:59:00.000Z");
const JUST_AFTER_MIDNIGHT_Z = new Date("2026-07-16T00:05:00.000Z");

describe("formatEventDateLong", () => {
  it("renders the long card/header form", () => {
    expect(formatEventDateLong(AT_1830Z)).toBe("JUL 15, 2026");
  });

  it("does not roll the date backwards for late-evening events", () => {
    // A naive `toLocaleDateString()` on a machine west of UTC would report
    // JUL 15 here; pinning the zone keeps the organizer's wall-clock date.
    expect(formatEventDateLong(JUST_AFTER_MIDNIGHT_Z)).toBe("JUL 16, 2026");
  });

  it("zero-pads single-digit days", () => {
    expect(formatEventDateLong(new Date("2026-03-05T09:00:00.000Z"))).toBe(
      "MAR 05, 2026",
    );
  });
});

describe("formatEventDateShort", () => {
  it("omits the year for the announcement strip", () => {
    expect(formatEventDateShort(AT_1830Z)).toBe("JUL 15");
  });
});

describe("formatEventTime", () => {
  it("renders a 12-hour clock with an uppercase meridiem", () => {
    expect(formatEventTime(AT_1830Z)).toBe("6:30 PM");
  });

  it("renders midnight as 12 AM rather than 0", () => {
    expect(formatEventTime(new Date("2026-07-15T00:00:00.000Z"))).toBe(
      "12:00 AM",
    );
  });

  it("renders noon as 12 PM", () => {
    expect(formatEventTime(new Date("2026-07-15T12:00:00.000Z"))).toBe(
      "12:00 PM",
    );
  });
});

describe("formatEventDateTime", () => {
  it("joins both halves for deadline copy", () => {
    expect(formatEventDateTime(NEAR_MIDNIGHT_Z)).toBe(
      "JUL 15, 2026 · 11:59 PM",
    );
  });
});
