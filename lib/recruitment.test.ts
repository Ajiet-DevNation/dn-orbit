import { describe, expect, test } from "bun:test";
import {
  countWords,
  fieldErrors,
  looksLikePdf,
  recruitmentApplicationSchema,
} from "./recruitment";

const valid = {
  name: "Asha Rao",
  email: "Asha@Example.com",
  usn: " 4jk24cs069 ",
  branch: "CSE",
  year: "2",
  whatsapp: "+91 98765-43210",
  about: "I build things.",
  githubUsername: "asha-rao",
  lcUsername: "asha_rao",
  linkedinUrl: "",
  xHandle: "@asha",
};

describe("recruitmentApplicationSchema", () => {
  test("accepts and normalises a valid application", () => {
    const r = recruitmentApplicationSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.usn).toBe("4JK24CS069");
    expect(r.data.email).toBe("asha@example.com");
    expect(r.data.year).toBe(2);
    expect(r.data.whatsapp).toBe("+919876543210");
    expect(r.data.xHandle).toBe("asha");
    expect(r.data.linkedinUrl).toBeUndefined();
  });

  test("rejects a non-AJIET USN", () => {
    const r = recruitmentApplicationSchema.safeParse({
      ...valid,
      usn: "1DS21CS123",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).usn).toBeDefined();
  });

  test("rejects an about over 150 words", () => {
    const r = recruitmentApplicationSchema.safeParse({
      ...valid,
      about: "word ".repeat(151),
    });
    expect(r.success).toBe(false);
  });

  test("rejects a GitHub URL in place of a username", () => {
    const r = recruitmentApplicationSchema.safeParse({
      ...valid,
      githubUsername: "https://github.com/asha-rao",
    });
    expect(r.success).toBe(false);
  });

  test("rejects a non-LinkedIn URL", () => {
    const r = recruitmentApplicationSchema.safeParse({
      ...valid,
      linkedinUrl: "https://evil.example/linkedin.com/",
    });
    expect(r.success).toBe(false);
  });

  test("requires LeetCode username", () => {
    const r = recruitmentApplicationSchema.safeParse({
      ...valid,
      lcUsername: "",
    });
    expect(r.success).toBe(false);
  });
});

test("countWords ignores surrounding and repeated whitespace", () => {
  expect(countWords("")).toBe(0);
  expect(countWords("  a  b\n c ")).toBe(3);
});

test("looksLikePdf checks the %PDF- header, not the file name", () => {
  const enc = new TextEncoder();
  expect(looksLikePdf(enc.encode("%PDF-1.7\n..."))).toBe(true);
  expect(looksLikePdf(enc.encode("\x89PNG...."))).toBe(false);
  expect(looksLikePdf(new Uint8Array())).toBe(false);
});
