import { describe, expect, test } from "bun:test";
import { type TeamMailInput, teamRegistrationMail } from "./team-mail";

const base: TeamMailInput = {
  name: "Asha",
  eventTitle: "Capture The Flag 2.0",
  when: "DEC 03, 2026 · 11:00 AM · Room 426",
  role: "created",
  teamName: "Byte Me",
  code: "K7QX-29MD",
  size: 1,
  sizeLabel: "4–6 members",
  matchValue: "CSE",
};

describe("teamRegistrationMail", () => {
  test("creator mail carries the code, the team and the rules", () => {
    const m = teamRegistrationMail(base);
    expect(m.subject).toContain("K7QX-29MD");
    expect(m.text).toStartWith("Hi Asha,");
    expect(m.text).toContain("Team invite code: K7QX-29MD");
    expect(m.text).toContain('team "Byte Me" is set up');
    expect(m.text).toContain("4–6 members, all from CSE");
    expect(m.html).toContain("K7QX-29MD");
  });

  test("joiner mail names the team and its size", () => {
    const m = teamRegistrationMail({ ...base, role: "joined", size: 3 });
    expect(m.subject).toContain('you joined team "Byte Me"');
    expect(m.text).toContain('as a member of "Byte Me"');
    expect(m.text).toContain("3 members so far");
  });

  test("leaves out the shared-answer rule when the event has none", () => {
    const m = teamRegistrationMail({ ...base, matchValue: null });
    expect(m.text).toContain("Teams need 4–6 members.");
    expect(m.text).not.toContain("all from");
  });

  test("escapes registrant text in HTML but keeps it raw in plain text", () => {
    const m = teamRegistrationMail({ ...base, name: "<b>x</b>" });
    expect(m.html).not.toContain("<b>x</b>");
    expect(m.html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(m.text).toContain("<b>x</b>");
  });
});
