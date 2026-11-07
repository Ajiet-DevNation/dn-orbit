import { afterEach, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { decryptToken, encryptToken, isEncryptedToken } from "./token-crypto";

const KEY = randomBytes(32).toString("base64");
const original = process.env.TOKEN_ENCRYPTION_KEY;
afterEach(() => {
  process.env.TOKEN_ENCRYPTION_KEY = original;
});

describe("token-crypto", () => {
  test("round-trips and never stores the plaintext", () => {
    process.env.TOKEN_ENCRYPTION_KEY = KEY;
    const enc = encryptToken("gho_secret123");
    expect(enc).not.toContain("gho_secret123");
    expect(isEncryptedToken(enc as string)).toBe(true);
    expect(decryptToken(enc)).toBe("gho_secret123");
  });

  test("same token encrypts differently each time (random IV)", () => {
    process.env.TOKEN_ENCRYPTION_KEY = KEY;
    expect(encryptToken("gho_x")).not.toBe(encryptToken("gho_x"));
  });

  test("legacy plaintext passes through decrypt", () => {
    process.env.TOKEN_ENCRYPTION_KEY = KEY;
    expect(decryptToken("gho_legacy")).toBe("gho_legacy");
  });

  test("already-encrypted values are not double-encrypted", () => {
    process.env.TOKEN_ENCRYPTION_KEY = KEY;
    const enc = encryptToken("gho_y") as string;
    expect(encryptToken(enc)).toBe(enc);
  });

  test("tampering or a wrong key yields null, not garbage", () => {
    process.env.TOKEN_ENCRYPTION_KEY = KEY;
    const enc = encryptToken("gho_z") as string;
    const flipped = `${enc.slice(0, -2)}${enc.endsWith("A") ? "B" : "A"}${enc.slice(-1)}`;
    expect(decryptToken(flipped)).toBeNull();
    process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(decryptToken(enc)).toBeNull();
  });

  test("without a key: stores plaintext, cannot read encrypted", () => {
    process.env.TOKEN_ENCRYPTION_KEY = KEY;
    const enc = encryptToken("gho_w");
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(encryptToken("gho_w")).toBe("gho_w");
    expect(decryptToken(enc)).toBeNull();
  });

  test("rejects a key of the wrong length", () => {
    process.env.TOKEN_ENCRYPTION_KEY = randomBytes(16).toString("base64");
    expect(() => encryptToken("gho_v")).toThrow();
  });

  test("null and empty pass through", () => {
    expect(encryptToken(null)).toBeNull();
    expect(decryptToken(undefined)).toBeNull();
  });
});
