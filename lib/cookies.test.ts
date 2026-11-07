import { expect, test } from "bun:test";
import { authSecret, usesSecureCookies } from "./cookies";

test("https request uses secure cookies", () => {
  expect(usesSecureCookies("https:", null)).toBe(true);
});

test("http localhost request does not use secure cookies", () => {
  expect(usesSecureCookies("http:", null)).toBe(false);
});

test("x-forwarded-proto is authoritative when present (Vercel/proxy TLS termination)", () => {
  // Edge proxy may see an internal http URL while the public edge is https.
  expect(usesSecureCookies("http:", "https")).toBe(true);
  expect(usesSecureCookies("https:", "http")).toBe(false);
});

test("x-forwarded-proto takes the first hop and trims/normalizes", () => {
  expect(usesSecureCookies("http:", "https, http")).toBe(true);
  expect(usesSecureCookies("http:", " HTTPS ")).toBe(true);
});

test("nullish inputs default to insecure (safe for HTTP)", () => {
  expect(usesSecureCookies(null, null)).toBe(false);
  expect(usesSecureCookies(undefined, undefined)).toBe(false);
});

test("authSecret prefers AUTH_SECRET, then NEXTAUTH_SECRET", () => {
  expect(authSecret({ AUTH_SECRET: "a", NEXTAUTH_SECRET: "b" })).toBe("a");
  expect(authSecret({ NEXTAUTH_SECRET: "b" })).toBe("b");
});

test("authSecret fails loud at runtime when no secret is set", () => {
  expect(() => authSecret({})).toThrow("AUTH_SECRET");
  expect(() => authSecret({ AUTH_SECRET: "" })).toThrow("AUTH_SECRET");
});

test("authSecret only allows a throwaway secret while next build runs", () => {
  const s = authSecret({ NEXT_PHASE: "phase-production-build" });
  expect(s.length).toBeGreaterThanOrEqual(32);
  expect(s).not.toBe(authSecret({ NEXT_PHASE: "phase-production-build" }));
});
