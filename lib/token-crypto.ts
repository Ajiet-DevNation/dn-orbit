import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// At-rest encryption for members' GitHub OAuth tokens. They carry `repo` scope
// (read + write on private repos), so a leaked DB dump must not hand them out.
// AES-256-GCM with a key from TOKEN_ENCRYPTION_KEY (32 bytes, base64).
//
// Stored form: "enc:v1:<iv>.<tag>.<ciphertext>" (base64url). Anything without
// the prefix is a legacy plaintext token: still readable, and re-encrypted by
// the reader (lib/github-token.ts) the first time it is used.

const PREFIX = "enc:v1:";

function encryptionKey(): Buffer | null {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be 32 bytes, base64 (openssl rand -base64 32)",
    );
  }
  return key;
}

let warnedMissingKey = false;
function warnMissingKey() {
  if (warnedMissingKey) return;
  warnedMissingKey = true;
  console.error(
    "[token-crypto] TOKEN_ENCRYPTION_KEY is unset — GitHub tokens are stored unencrypted.",
  );
}

export function isEncryptedToken(value: string): boolean {
  return value.startsWith(PREFIX);
}

/** Encrypt for storage. With no key configured it stores plaintext (and says
 *  so once) rather than locking every member out of sign-in. */
export function encryptToken(
  plain: string | null | undefined,
): string | null | undefined {
  if (!plain || isEncryptedToken(plain)) return plain;
  const key = encryptionKey();
  if (!key) {
    warnMissingKey();
    return plain;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${ct.toString("base64url")}`;
}

/** Decrypt a stored value. Legacy plaintext passes through; a value that can't
 *  be decrypted (wrong/missing key, tampered) yields null — never a guess. */
export function decryptToken(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!isEncryptedToken(stored)) return stored;
  const key = encryptionKey();
  if (!key) {
    warnMissingKey();
    return null;
  }
  const [iv, tag, ct] = stored.slice(PREFIX.length).split(".");
  if (!iv || !tag || !ct) return null;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ct, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
