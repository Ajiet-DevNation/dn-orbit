import { createHmac, timingSafeEqual } from "node:crypto";

// GitHub webhook signature verification.
//
// GitHub signs each delivery with HMAC-SHA256 over the RAW request body, using
// the secret configured on the webhook, and sends it as:
//
//   X-Hub-Signature-256: sha256=<hex>
//
// Without this check the endpoint would let anyone mark any member's stats
// dirty and drive unlimited outbound GitHub API calls from our deployment.

export const SIGNATURE_HEADER = "x-hub-signature-256";
const PREFIX = "sha256=";

export type VerifyResult =
  | { ok: true }
  | {
      ok: false;
      reason: "no-secret" | "no-signature" | "malformed" | "mismatch";
    };

/**
 * Verify a delivery's signature against the shared secret.
 *
 * @param rawBody   The body EXACTLY as received. Re-serialising parsed JSON
 *                  changes the bytes and will never match.
 * @param signature The X-Hub-Signature-256 header value.
 * @param secret    GITHUB_WEBHOOK_SECRET.
 */
export function verifyGithubSignature(
  rawBody: string,
  signature: string | null,
  secret: string | undefined,
): VerifyResult {
  // An unset secret must FAIL CLOSED. Treating "no secret configured" as
  // "accept everything" would silently make the endpoint public the moment the
  // env var went missing.
  if (!secret) return { ok: false, reason: "no-secret" };
  if (!signature) return { ok: false, reason: "no-signature" };
  if (!signature.startsWith(PREFIX)) return { ok: false, reason: "malformed" };

  const provided = signature.slice(PREFIX.length);
  // Hex of a SHA-256 digest is always 64 chars; anything else can't match and
  // would make the length check below the thing that rejects it.
  if (!/^[0-9a-f]{64}$/i.test(provided))
    return { ok: false, reason: "malformed" };

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  // Constant-time compare. A plain === leaks how many leading characters were
  // correct through its early return, which is enough to forge a signature byte
  // by byte given enough attempts.
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided.toLowerCase(), "utf8");
  if (a.length !== b.length) return { ok: false, reason: "mismatch" };

  return timingSafeEqual(a, b)
    ? { ok: true }
    : { ok: false, reason: "mismatch" };
}

/** Test/tooling helper: produce the header GitHub would send. */
export function signPayload(rawBody: string, secret: string): string {
  return PREFIX + createHmac("sha256", secret).update(rawBody).digest("hex");
}

// ─── Payload shapes we care about ────────────────────────────────────────────

/** Events worth reacting to — everything else is acknowledged and ignored. */
export const HANDLED_EVENTS = ["push", "pull_request", "create"] as const;

/**
 * The GitHub login that caused a delivery.
 *
 * `sender` is present on every event type we handle and is the account that
 * actually performed the action, which is what we want — `pusher` on a push
 * carries a display name rather than a login.
 */
export function senderLogin(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const sender = (payload as { sender?: unknown }).sender;
  if (typeof sender !== "object" || sender === null) return null;
  const login = (sender as { login?: unknown }).login;
  return typeof login === "string" && login.length > 0 ? login : null;
}
