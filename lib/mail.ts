// Transactional email through Resend's REST API — one fetch, no SDK.
//
// Never throws: a mail is a side effect of an admin action that has already
// been saved, so a failure is reported (false) rather than undoing the action.

const RESEND_URL = "https://api.resend.com/emails";

/** Public site linked from every email. */
export const SITE_URL = "https://www.devnation.club";

/** For user-supplied text placed into an email's HTML part. */
export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendMail(mail: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) {
    console.error("Mail skipped: RESEND_API_KEY or MAIL_FROM is not set");
    return false;
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, ...mail }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("Mail failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Mail failed:", err);
    return false;
  }
}
