import { db } from "@/lib/db";
import {
  decryptToken,
  encryptToken,
  isEncryptedToken,
} from "@/lib/token-crypto";

/**
 * A member's GitHub OAuth token, decrypted, or null. The one place that reads
 * Account.access_token for use. A legacy plaintext token is re-encrypted the
 * first time it is read, so existing rows migrate without a script.
 */
export async function githubAccessToken(
  userId: string,
): Promise<string | null> {
  const account = await db.account.findFirst({
    where: { userId, provider: "github", access_token: { not: null } },
    select: { id: true, access_token: true },
  });
  const stored = account?.access_token;
  if (!account || !stored) return null;
  const token = decryptToken(stored);
  if (token && !isEncryptedToken(stored)) {
    const encrypted = encryptToken(token);
    if (encrypted && encrypted !== stored) {
      await db.account
        .update({
          where: { id: account.id },
          data: { access_token: encrypted },
        })
        .catch((e) => console.error("[github-token] re-encrypt failed:", e));
    }
  }
  return token;
}
