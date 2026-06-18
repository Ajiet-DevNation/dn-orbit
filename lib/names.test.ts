import { describe, expect, it } from "bun:test";
import { toTitleCase } from "./names";

describe("toTitleCase", () => {
  it("title-cases all-caps names", () => {
    expect(toTitleCase("JIYA HUSSSAIN")).toBe("Jiya Husssain");
  });

  it("title-cases lowercase names", () => {
    expect(toTitleCase("arjun r")).toBe("Arjun R");
  });

  it("capitalises after apostrophes and hyphens", () => {
    expect(toTitleCase("JIZEL PRINCE D'SOUZA")).toBe("Jizel Prince D'Souza");
    expect(toTitleCase("anne-marie")).toBe("Anne-Marie");
  });

  it("handles already-correct names", () => {
    expect(toTitleCase("Muaz Ismail Mohammed")).toBe("Muaz Ismail Mohammed");
  });

  it("returns empty string for null/undefined/empty", () => {
    expect(toTitleCase(null)).toBe("");
    expect(toTitleCase(undefined)).toBe("");
    expect(toTitleCase("")).toBe("");
  });
});
