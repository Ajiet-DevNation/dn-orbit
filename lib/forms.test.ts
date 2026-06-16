import { describe, expect, test } from "bun:test";
import {
  type FormFieldDef,
  type EventAudience,
  validateSubmission,
} from "./forms";

const field = (over: Partial<FormFieldDef>): FormFieldDef => ({
  id: "f1",
  type: "short_text",
  label: "Field",
  required: false,
  ...over,
});

const base = {
  audience: "public" as EventAudience,
  schema: [] as FormFieldDef[],
};

describe("validateSubmission", () => {
  test("requires name and email always", () => {
    const r = validateSubmission({ ...base, input: { name: "", email: "" } });
    expect(r.ok).toBe(false);
    expect(r.errors.name).toBeTruthy();
    expect(r.errors.email).toBeTruthy();
  });

  test("rejects malformed email", () => {
    const r = validateSubmission({
      ...base,
      input: { name: "A", email: "nope" },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.email).toBeTruthy();
  });

  test("accepts a minimal valid public submission", () => {
    const r = validateSubmission({
      ...base,
      input: { name: "A", email: "a@b.com" },
    });
    expect(r.ok).toBe(true);
    expect(Object.keys(r.errors)).toHaveLength(0);
  });

  test("college audience requires usn", () => {
    const r = validateSubmission({
      audience: "college",
      schema: [],
      input: { name: "A", email: "a@b.com" },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.usn).toBeTruthy();
  });

  test("college usn pattern enforced when provided", () => {
    const r = validateSubmission({
      audience: "college",
      schema: [],
      usnPattern: "^1MS\\d{2}[A-Z]{2}\\d{3}$",
      input: { name: "A", email: "a@b.com", usn: "BAD" },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.usn).toBeTruthy();
  });

  test("required custom field missing fails", () => {
    const r = validateSubmission({
      ...base,
      schema: [field({ id: "x", type: "short_text", required: true })],
      input: { name: "A", email: "a@b.com", responses: {} },
    });
    expect(r.ok).toBe(false);
    expect(r.errors["x"]).toBeTruthy();
  });

  test("single_choice value must be one of options", () => {
    const r = validateSubmission({
      ...base,
      schema: [
        field({ id: "x", type: "single_choice", required: true, options: ["A", "B"] }),
      ],
      input: { name: "N", email: "a@b.com", responses: { x: "C" } },
    });
    expect(r.ok).toBe(false);
    expect(r.errors["x"]).toBeTruthy();
  });

  test("multi_choice values must all be in options", () => {
    const r = validateSubmission({
      ...base,
      schema: [
        field({ id: "x", type: "multi_choice", required: true, options: ["A", "B"] }),
      ],
      input: { name: "N", email: "a@b.com", responses: { x: ["A", "Z"] } },
    });
    expect(r.ok).toBe(false);
  });

  test("number field rejects non-numeric", () => {
    const r = validateSubmission({
      ...base,
      schema: [field({ id: "x", type: "number", required: true })],
      input: { name: "N", email: "a@b.com", responses: { x: "abc" } },
    });
    expect(r.ok).toBe(false);
  });

  test("coerces and returns clean values", () => {
    const r = validateSubmission({
      ...base,
      schema: [field({ id: "x", type: "number", required: true })],
      input: { name: "N", email: "a@b.com", responses: { x: "42" } },
    });
    expect(r.ok).toBe(true);
    expect(r.value.responses.x).toBe(42);
  });
});
