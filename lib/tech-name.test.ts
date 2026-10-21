import { describe, expect, test } from "bun:test";
import {
  findTechName,
  MAX_TECH_NAME_LEN,
  normalizeTechName,
} from "./tech-name";

describe("normalizeTechName", () => {
  test("trims and collapses inner whitespace", () => {
    expect(normalizeTechName("  my   tool \n")).toBe("my tool");
  });

  test("keeps the user's casing and punctuation", () => {
    expect(normalizeTechName("shadcn/ui")).toBe("shadcn/ui");
    expect(normalizeTechName(".NET")).toBe(".NET");
  });

  test("caps at the server's limit without a trailing space", () => {
    const long = `${"a".repeat(MAX_TECH_NAME_LEN - 1)} bbbb`;
    const out = normalizeTechName(long);
    expect(out.length).toBeLessThanOrEqual(MAX_TECH_NAME_LEN);
    expect(out.endsWith(" ")).toBe(false);
  });

  test("whitespace only becomes empty", () => {
    expect(normalizeTechName("   ")).toBe("");
  });
});

describe("findTechName", () => {
  const known = ["React", "Next.js", "Hono"];

  test("matches ignoring case and returns the stored spelling", () => {
    expect(findTechName("react", known)).toBe("React");
    expect(findTechName("NEXT.JS", known)).toBe("Next.js");
  });

  test("null for a new name, including near misses", () => {
    expect(findTechName("Reactor", known)).toBeNull();
    expect(findTechName("Elysia", known)).toBeNull();
  });
});
