// Transactional email through Gmail SMTP, sent as the club's Gmail account
// with a Google App Password.
//
// Never throws: a mail is a side effect of an action that has already been
// saved, so a failure is reported (false) rather than undoing the action.

import { createTransport, type Transporter } from "nodemailer";

/** Public site linked from every email. */
export const SITE_URL = "https://www.devnation.club";

/** Sender name in the inbox. Gmail always sends from the account itself. */
const FROM_NAME = "DevNation";

/** For user-supplied text placed into an email's HTML part. */
export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// built on first send, so a missing env var skips mail instead of crashing
let transport: Transporter | undefined;

export async function sendMail(mail: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.error("Mail skipped: GMAIL_USER or GMAIL_APP_PASSWORD is not set");
    return false;
  }
  transport ??= createTransport({
    service: "Gmail",
    auth: { user, pass },
    // Same 10s budget the old mail API call had, per step.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });
  try {
    await transport.sendMail({
      from: { name: FROM_NAME, address: user },
      ...mail,
    });
    return true;
  } catch (err) {
    // Code and server reply only: never the whole error object.
    const e = err as {
      code?: unknown;
      responseCode?: unknown;
      message?: unknown;
    };
    console.error("Mail failed:", e.code, e.responseCode, e.message);
    return false;
  }
}
