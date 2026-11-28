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

// ── Shared email frame ──────────────────────────────────────────────────────
// Inline styles only: mail clients strip <style> blocks and classes. Tables,
// not flex or grid: Outlook and older Gmail apps ignore those.
export const MAIL_FONT =
  "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono','Courier New',monospace";
export const MAIL_COLORS = {
  page: "#0a0a0f",
  card: "#111118",
  line: "#2a2a35",
  brand: "#8b5cf6",
  brandLight: "#a78bfa",
  white: "#ffffff",
  text: "#d4d4d8",
  muted: "#8a8a96",
  warn: "#facc15",
};
const C = MAIL_COLORS;

/** Small spaced caps heading over a section. Pass escaped text. */
export const mailLabel = (s: string) =>
  `<p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;color:${C.muted};font-weight:bold">${s}</p>`;

/** Purple pixel button, centred in its own row. */
export const mailButton = (href: string, text: string) =>
  `<tr><td align="center" style="padding:28px 28px 32px">
<a href="${escapeHtml(href)}" style="display:inline-block;background:${C.brand};color:#000000;font-family:${MAIL_FONT};font-size:13px;font-weight:bold;letter-spacing:2px;text-decoration:none;padding:14px 28px;border:2px solid ${C.brandLight}">${escapeHtml(text)}</a>
</td></tr>`;

// header bar, body rows, footer: every club email looks the same
export function mailShell(o: {
  title: string;
  /** Inbox preview line. */
  preheader: string;
  /** `<tr>` rows, already escaped. */
  rows: string;
  /** Why they got this email. */
  footerNote: string;
}): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${escapeHtml(o.title)}</title></head>
<body style="margin:0;padding:0;background:${C.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.card};border:2px solid ${C.brand};font-family:${MAIL_FONT};color:${C.text}">
<tr><td style="background:${C.brand};padding:14px 28px;font-size:13px;font-weight:bold;letter-spacing:4px;color:#000000">DEVNATION <span style="letter-spacing:2px;font-weight:normal">// ORBIT</span></td></tr>
${o.rows}
<tr><td style="padding:18px 28px;border-top:1px solid ${C.line};font-size:12px;line-height:1.6;color:${C.muted}">— Team DevNation · <a href="${SITE_URL}" style="color:${C.brandLight};text-decoration:none">devnation.club</a><br>${escapeHtml(o.footerNote)}</td></tr>
</table>
</td></tr></table>
</body></html>`;
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
