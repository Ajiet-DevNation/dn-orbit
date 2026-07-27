import { describe, expect, test } from "bun:test";
import {
  senderLogin,
  signPayload,
  verifyGithubSignature,
} from "./webhook-signature";

const SECRET = "s3cr3t-webhook-key";
const BODY = JSON.stringify({
  ref: "refs/heads/main",
  sender: { login: "muaz" },
});

describe("verifyGithubSignature", () => {
  test("accepts a correctly signed payload", () => {
    const sig = signPayload(BODY, SECRET);
    expect(verifyGithubSignature(BODY, sig, SECRET).ok).toBe(true);
  });

  test("fails closed when no secret is configured", () => {
    // Critical: an unset env var must not turn the endpoint public.
    const sig = signPayload(BODY, SECRET);
    const result = verifyGithubSignature(BODY, sig, undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no-secret");
    expect(verifyGithubSignature(BODY, sig, "").ok).toBe(false);
  });

  test("rejects a missing signature header", () => {
    const result = verifyGithubSignature(BODY, null, SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no-signature");
  });

  test("rejects the wrong secret", () => {
    const sig = signPayload(BODY, "not-the-secret");
    expect(verifyGithubSignature(BODY, sig, SECRET).ok).toBe(false);
  });

  test("rejects a tampered body", () => {
    const sig = signPayload(BODY, SECRET);
    const tampered = JSON.stringify({
      ref: "refs/heads/main",
      sender: { login: "attacker" },
    });
    expect(verifyGithubSignature(tampered, sig, SECRET).ok).toBe(false);
  });

  test("rejects a signature without the sha256= prefix", () => {
    const raw = signPayload(BODY, SECRET).replace("sha256=", "");
    const result = verifyGithubSignature(BODY, raw, SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("malformed");
  });

  test("rejects a sha1 signature (the deprecated header format)", () => {
    expect(
      verifyGithubSignature(BODY, "sha1=abcdef0123456789", SECRET).ok,
    ).toBe(false);
  });

  test("rejects a non-hex or wrong-length digest without throwing", () => {
    for (const bad of [
      "sha256=",
      "sha256=zzzz",
      "sha256=abc",
      `sha256=${"a".repeat(63)}`,
      `sha256=${"a".repeat(65)}`,
      `sha256=${"g".repeat(64)}`,
    ]) {
      const result = verifyGithubSignature(BODY, bad, SECRET);
      expect(result.ok).toBe(false);
    }
  });

  test("accepts an upper-case digest", () => {
    const sig = signPayload(BODY, SECRET)
      .toUpperCase()
      .replace("SHA256=", "sha256=");
    expect(verifyGithubSignature(BODY, sig, SECRET).ok).toBe(true);
  });

  test("is sensitive to every byte of the body", () => {
    const sig = signPayload(BODY, SECRET);
    expect(verifyGithubSignature(`${BODY} `, sig, SECRET).ok).toBe(false);
    expect(verifyGithubSignature(BODY.slice(0, -1), sig, SECRET).ok).toBe(
      false,
    );
  });

  test("an empty body still signs and verifies", () => {
    expect(verifyGithubSignature("", signPayload("", SECRET), SECRET).ok).toBe(
      true,
    );
  });
});

describe("senderLogin", () => {
  test("reads the sender login", () => {
    expect(senderLogin({ sender: { login: "muaz" } })).toBe("muaz");
  });

  test("returns null for payloads without a usable sender", () => {
    expect(senderLogin({})).toBeNull();
    expect(senderLogin({ sender: null })).toBeNull();
    expect(senderLogin({ sender: {} })).toBeNull();
    expect(senderLogin({ sender: { login: "" } })).toBeNull();
    expect(senderLogin({ sender: { login: 42 } })).toBeNull();
    expect(senderLogin(null)).toBeNull();
    expect(senderLogin("nope")).toBeNull();
    expect(senderLogin(undefined)).toBeNull();
  });
});
