import { describe, expect, it } from "bun:test";
import {
  myRegistrationWhere,
  parseRegCookie,
  regCookieName,
} from "./registration-cookie";

describe("registration cookie", () => {
  it("names one cookie per event", () => {
    expect(regCookieName("abc")).toBe("orbit_reg_abc");
  });

  it("accepts only a UUID", () => {
    const id = "2d5787a0-fc46-4dba-95c1-02d611b665d8";
    expect(parseRegCookie(id)).toBe(id);
    expect(parseRegCookie(undefined)).toBeNull();
    expect(parseRegCookie("")).toBeNull();
    expect(parseRegCookie("' OR 1=1 --")).toBeNull();
    expect(parseRegCookie(`${id}x`)).toBeNull();
  });
});

describe("myRegistrationWhere", () => {
  it("matches by cookie, account, or both", () => {
    expect(myRegistrationWhere("e", "r", null)).toEqual({
      eventId: "e",
      OR: [{ id: "r" }],
    });
    expect(myRegistrationWhere("e", null, "u")).toEqual({
      eventId: "e",
      OR: [{ userId: "u" }],
    });
    expect(myRegistrationWhere("e", "r", "u")?.OR).toHaveLength(2);
  });

  it("is null when the visitor can't be identified", () => {
    expect(myRegistrationWhere("e", null, undefined)).toBeNull();
  });
});
