// The email a candidate gets when an admin accepts or rejects their
// recruitment application. Pure, so it is unit-tested; sending is lib/mail.ts.

type Decision = "approved" | "rejected";

const SITE_URL = "https://www.devnation.club";

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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
  // Inline styles only: mail clients strip <style> blocks and classes.
  const html = `<div style="font-family:monospace;max-width:520px;margin:0 auto;padding:24px;background:#050505;color:#e4e4e7;border:2px solid #22c55e">
<p style="margin:0 0 16px;color:#22c55e;font-weight:bold;letter-spacing:2px">DEVNATION</p>
<p>Hi ${escapeHtml(name)},</p>
${lines.map((l) => `<p style="line-height:1.6">${escapeHtml(l)}</p>`).join("\n")}
<p>— Team DevNation<br><a href="${SITE_URL}" style="color:#22c55e">devnation.club</a></p>
</div>`;
  return { subject, text, html };
}
