// The confirmation a registrant gets after signing up for a team event. The
// team creator's copy is how they get the invite code back if they lose the
// success screen. Pure, so it is unit-tested; sending is lib/mail.ts.

import { escapeHtml, SITE_URL } from "./mail";

export interface TeamMailInput {
  name: string;
  eventTitle: string;
  /** e.g. "DEC 03, 2026 · 11:00 AM · Room 426" */
  when: string;
  role: "created" | "joined";
  teamName: string;
  /** Display form, e.g. "K7QX-29MD". */
  code: string;
  /** Members including this registrant. */
  size: number;
  /** e.g. "4–6 members" */
  sizeLabel: string;
  /** What every member shares, e.g. "CSE"; null when the event has no rule. */
  matchValue: string | null;
}

export function teamRegistrationMail(i: TeamMailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const rule = `Teams need ${i.sizeLabel}${i.matchValue ? `, all from ${i.matchValue}` : ""}.`;
  const members = `${i.size} member${i.size === 1 ? "" : "s"}`;
  const lines =
    i.role === "created"
      ? [
          `You're registered for ${i.eventTitle} (${i.when}) and your team "${i.teamName}" is set up.`,
          `Share the invite code below with your teammates. Each of them registers on the event page, picks JOIN A TEAM and types the code. ${rule}`,
        ]
      : [
          `You're registered for ${i.eventTitle} (${i.when}) as a member of "${i.teamName}".`,
          `Your team has ${members} so far. ${rule} Bring in more teammates with the invite code below.`,
        ];

  const subject =
    i.role === "created"
      ? `${i.eventTitle}: team "${i.teamName}" is set up (code ${i.code})`
      : `${i.eventTitle}: you joined team "${i.teamName}"`;

  const text = [
    `Hi ${i.name},`,
    ...lines,
    `Team invite code: ${i.code}`,
    "— Team DevNation",
    SITE_URL,
  ].join("\n\n");

  // Inline styles only: mail clients strip <style> blocks and classes.
  const html = `<div style="font-family:monospace;max-width:520px;margin:0 auto;padding:24px;background:#050505;color:#e4e4e7;border:2px solid #8b5cf6">
<p style="margin:0 0 16px;color:#a78bfa;font-weight:bold;letter-spacing:2px">DEVNATION</p>
<p>Hi ${escapeHtml(i.name)},</p>
${lines.map((l) => `<p style="line-height:1.6">${escapeHtml(l)}</p>`).join("\n")}
<p style="margin:24px 0 4px;color:#a1a1aa;font-size:12px;letter-spacing:2px">TEAM INVITE CODE</p>
<p style="margin:0 0 24px;font-size:28px;font-weight:bold;letter-spacing:4px;color:#ffffff">${escapeHtml(i.code)}</p>
<p>— Team DevNation<br><a href="${SITE_URL}" style="color:#a78bfa">devnation.club</a></p>
</div>`;

  return { subject, text, html };
}
