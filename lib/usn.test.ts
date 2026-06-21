import { describe, expect, test } from "bun:test";
import { AJIET_USN_REGEX, isAjietUsn } from "./usn";

describe("isAjietUsn", () => {
  test("accepts a canonical AJIET USN", () => {
    expect(isAjietUsn("4JK22CS069")).toBe(true);
  });

  test("accepts other AJIET course codes and years", () => {
    expect(isAjietUsn("4JK21CI001")).toBe(true); // AIML
    expect(isAjietUsn("4JK23IC123")).toBe(true); // ICB
    expect(isAjietUsn("4JK20ME045")).toBe(true); // Mechanical
    expect(isAjietUsn("4JK24EC010")).toBe(true); // ECE
  });

  test("is case-insensitive and trims surrounding whitespace", () => {
    expect(isAjietUsn("4jk22cs069")).toBe(true);
    expect(isAjietUsn("  4JK22CS069  ")).toBe(true);
  });

  test("rejects non-AJIET colleges (different code)", () => {
    expect(isAjietUsn("4AL22CS001")).toBe(false); // Alva's
    expect(isAjietUsn("1RV22CS001")).toBe(false);
  });

  test("rejects malformed USNs", () => {
    expect(isAjietUsn("4JK22CS01")).toBe(false); // 2-digit serial
    expect(isAjietUsn("4JK2CS069")).toBe(false); // 1-digit year
    expect(isAjietUsn("4JK22C069")).toBe(false); // 1-letter course
    expect(isAjietUsn("4JK22CS0690")).toBe(false); // trailing digit
    expect(isAjietUsn("JK22CS069")).toBe(false); // missing leading digit
    expect(isAjietUsn("")).toBe(false);
  });

  test("rejects nullish input", () => {
    expect(isAjietUsn(null)).toBe(false);
    expect(isAjietUsn(undefined)).toBe(false);
  });

  test("regex is exported for reuse", () => {
    expect(AJIET_USN_REGEX.test("4JK22CS069")).toBe(true);
  });
});
