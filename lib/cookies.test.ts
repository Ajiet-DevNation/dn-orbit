import { expect, test } from "bun:test";
import { usesSecureCookies } from "./cookies";

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
