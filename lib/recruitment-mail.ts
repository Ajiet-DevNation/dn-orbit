// The email a candidate gets when an admin accepts or rejects their
// recruitment application. Pure, so it is unit-tested; sending is lib/mail.ts.

import {
  MAIL_COLORS as C,
  escapeHtml,
  mailButton,
  mailLabel,
  mailShell,
  SITE_URL,
} from "./mail";

type Decision = "approved" | "rejected";

const BODY: Record<Decision, { subject: string; lines: string[] }> = {
  approved: {
    subject: "Welcome to DevNation!",
    lines: [
      "Congratulations, your application to DevNation has been accepted!",
      "We loved what you shared with us. Someone from the core team will reach out on WhatsApp shortly with the next steps.",
      "Welcome aboard, cadet.",
    ],
  },
  rejected: {
    subject: "Your DevNation application",
    lines: [
      "Thank you for applying to DevNation and for taking the time to tell us about yourself.",
      "We aren't able to offer you a spot this time. Keep building, and we'd be glad to see you apply again in a future recruitment.",
      "You're always welcome at our open events.",
    ],
  },
};

export function decisionMail(
  name: string,
  decision: Decision,
): { subject: string; text: string; html: string } {
  const { subject, lines } = BODY[decision];
  const text = [`Hi ${name},`, ...lines, "— Team DevNation", SITE_URL].join(
    "\n\n",
  );
  const e = escapeHtml;
  const accepted = decision === "approved";
  const [first, ...rest] = lines;
  const html = mailShell({
    title: subject,
    preheader: first,
    rows: `<tr><td style="padding:32px 28px 8px">
${mailLabel(accepted ? "APPLICATION ACCEPTED" : "APPLICATION UPDATE")}
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.35;color:${C.white};font-weight:bold">${accepted ? `Hi ${e(name)}, welcome aboard.` : `Hi ${e(name)}, about your application.`}</h1>
<p style="margin:0;font-size:14px;line-height:1.7">${e(first)}</p>
</td></tr>
<tr><td style="padding:24px 28px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};border:2px ${accepted ? "dashed" : "solid"} ${accepted ? C.brand : C.line}"><tr><td style="padding:20px 22px">
${mailLabel(accepted ? "WHAT HAPPENS NEXT" : "OUR DECISION")}
${rest.map((l) => `<p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:${C.white}">${e(l)}</p>`).join("\n")}
</td></tr></table>
</td></tr>
${
  accepted
    ? mailButton(SITE_URL, "VISIT DEVNATION")
    : mailButton(`${SITE_URL}/#events`, "SEE OPEN EVENTS")
}`,
    footerNote: "You got this because you applied to join DevNation.",
  });
  return { subject, text, html };
}
