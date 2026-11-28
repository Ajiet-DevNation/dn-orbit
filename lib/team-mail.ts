// The confirmation a registrant gets after signing up for a team event. The
// team creator's copy is how they get the invite code back if they lose the
// success screen. Pure, so it is unit-tested; sending is lib/mail.ts.

import { escapeHtml, SITE_URL } from "./mail";

export interface TeamMailInput {
  name: string;
  eventTitle: string;
  /** e.g. "DEC 03, 2026" */
  date: string;
  /** e.g. "11:00 AM" */
  time: string;
  location: string | null;
  /** The event's register page: teammates join from here. */
  eventUrl: string;
  role: "created" | "joined";
  teamName: string;
  /** Display form, e.g. "K7QX-29MD". */
  code: string;
  /** Member names, this registrant last. */
  members: string[];
  minSize: number;
  maxSize: number;
  /** e.g. "4–6 members" */
  sizeLabel: string;
  /** What every member shares, e.g. "CSE"; null when the event has no rule. */
  matchValue: string | null;
}

// Inline styles only: mail clients strip <style> blocks and classes. Tables,
// not flex or grid: Outlook and older Gmail apps ignore those.
const FONT =
  "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono','Courier New',monospace";
const C = {
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

const label = (s: string) =>
  `<p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;color:${C.muted};font-weight:bold">${s}</p>`;

export function teamRegistrationMail(i: TeamMailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const size = i.members.length;
  const missing = Math.max(0, i.minSize - size);
  const rule = `Teams need ${i.sizeLabel}${i.matchValue ? `, all from ${i.matchValue}` : ""}.`;
  const status =
    missing > 0
      ? `needs ${missing} more to compete`
      : size >= i.maxSize
        ? "full"
        : "ready to compete";
  const lead =
    i.role === "created"
      ? `Your team "${i.teamName}" is set up for ${i.eventTitle}. Share the invite code below with your teammates.`
      : `You joined "${i.teamName}" for ${i.eventTitle}. Bring in more teammates with the invite code below.`;
  const steps = [
    "Open the event page (link below).",
    "Register with their own details.",
    "Pick JOIN A TEAM and type the invite code.",
  ];

  const subject =
    i.role === "created"
      ? `${i.eventTitle}: team "${i.teamName}" is set up (code ${i.code})`
      : `${i.eventTitle}: you joined team "${i.teamName}"`;

  const text = [
    `Hi ${i.name},`,
    lead,
    `Team invite code: ${i.code}`,
    [
      `When: ${i.date} · ${i.time}`,
      ...(i.location ? [`Where: ${i.location}`] : []),
    ].join("\n"),
    [
      `Team "${i.teamName}" (${size} of ${i.maxSize}, ${status}):`,
      ...i.members.map((m, n) => `${n + 1}. ${m}`),
    ].join("\n"),
    [
      "How teammates join:",
      ...steps.map((s, n) => `${n + 1}. ${s}`),
      rule,
    ].join("\n"),
    `Event page: ${i.eventUrl}`,
    "— Team DevNation",
    SITE_URL,
  ].join("\n\n");

  const e = escapeHtml;
  const detail = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;width:72px;font-size:11px;letter-spacing:2px;color:${C.muted};vertical-align:top">${k}</td><td style="padding:6px 0;font-size:14px;color:${C.white}">${e(v)}</td></tr>`;
  const memberRows = i.members
    .map(
      (m, n) =>
        `<tr><td style="padding:10px 14px;border-top:${n ? `1px solid ${C.line}` : "0"};font-size:12px;color:${C.brandLight};width:28px">${String(n + 1).padStart(2, "0")}</td><td style="padding:10px 14px 10px 0;border-top:${n ? `1px solid ${C.line}` : "0"};font-size:14px;color:${C.white}">${e(m)}${n === size - 1 ? ` <span style="font-size:11px;color:${C.muted}">(you)</span>` : ""}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${e(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Team invite code: ${e(i.code)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.card};border:2px solid ${C.brand};font-family:${FONT};color:${C.text}">
<tr><td style="background:${C.brand};padding:14px 28px;font-size:13px;font-weight:bold;letter-spacing:4px;color:#000000">DEVNATION <span style="letter-spacing:2px;font-weight:normal">// ORBIT</span></td></tr>
<tr><td style="padding:32px 28px 8px">
${label(i.role === "created" ? "TEAM CREATED" : "TEAM JOINED")}
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.35;color:${C.white};font-weight:bold">Hi ${e(i.name)}, you&#39;re registered.</h1>
<p style="margin:0;font-size:14px;line-height:1.7">${e(lead)}</p>
</td></tr>
<tr><td style="padding:24px 28px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};border:2px dashed ${C.brand}"><tr><td align="center" style="padding:22px 12px">
${label("TEAM INVITE CODE")}
<p style="margin:0;font-size:34px;line-height:1.2;font-weight:bold;letter-spacing:6px;color:${C.white}">${e(i.code)}</p>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 28px 8px">
${label("EVENT")}
<p style="margin:0 0 8px;font-size:17px;color:${C.white};font-weight:bold">${e(i.eventTitle)}</p>
<table role="presentation" cellpadding="0" cellspacing="0">${detail("DATE", i.date)}${detail("TIME", i.time)}${i.location ? detail("VENUE", i.location) : ""}</table>
</td></tr>
<tr><td style="padding:24px 28px 8px">
${label(`TEAM ${e(i.teamName.toUpperCase())} · ${size} / ${i.maxSize}`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${C.line}">${memberRows}</table>
<p style="margin:10px 0 0;font-size:12px;color:${missing > 0 ? C.warn : C.brandLight}">${e(status.toUpperCase())}</p>
</td></tr>
${
  size >= i.maxSize
    ? ""
    : `<tr><td style="padding:24px 28px 8px">
${label("HOW TEAMMATES JOIN")}
${steps.map((s, n) => `<p style="margin:0 0 6px;font-size:13px;line-height:1.6"><span style="color:${C.brandLight}">${n + 1}.</span> ${e(s)}</p>`).join("\n")}
<p style="margin:10px 0 0;font-size:12px;color:${C.muted}">${e(rule)}</p>
</td></tr>`
}
<tr><td align="center" style="padding:28px 28px 32px">
<a href="${e(i.eventUrl)}" style="display:inline-block;background:${C.brand};color:#000000;font-family:${FONT};font-size:13px;font-weight:bold;letter-spacing:2px;text-decoration:none;padding:14px 28px;border:2px solid ${C.brandLight}">OPEN EVENT PAGE</a>
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid ${C.line};font-size:12px;line-height:1.6;color:${C.muted}">— Team DevNation · <a href="${SITE_URL}" style="color:${C.brandLight};text-decoration:none">devnation.club</a><br>You got this because you registered for ${e(i.eventTitle)}.</td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { subject, text, html };
}
