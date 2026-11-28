import { describe, expect, test } from "bun:test";
import { type TeamMailInput, teamRegistrationMail } from "./team-mail";

const base: TeamMailInput = {
  name: "Asha",
  eventTitle: "Capture The Flag 2.0",
  date: "DEC 03, 2026",
  time: "11:00 AM",
  location: "Room 426",
  eventUrl: "https://www.devnation.club/events/e1/register",
  role: "created",
  teamName: "Byte Me",
  code: "K7QX-29MD",
  members: ["Asha"],
  minSize: 4,
  maxSize: 6,
  sizeLabel: "4–6 members",
  matchValue: "CSE",
};

describe("teamRegistrationMail", () => {
  test("creator mail carries the code, the team and the rules", () => {
    const m = teamRegistrationMail(base);
    expect(m.subject).toContain("K7QX-29MD");
    expect(m.text).toStartWith("Hi Asha,");
    expect(m.text).toContain("Team invite code: K7QX-29MD");
    expect(m.text).toContain('Your team "Byte Me" is set up');
    expect(m.text).toContain("4–6 members, all from CSE");
    expect(m.html).toContain("K7QX-29MD");
  });

  test("joiner mail lists every member and what the team still needs", () => {
    const m = teamRegistrationMail({
      ...base,
      name: "Ravi",
      role: "joined",
      members: ["Asha", "Meera", "Ravi"],
    });
    expect(m.subject).toContain('you joined team "Byte Me"');
    expect(m.text).toContain('You joined "Byte Me"');
    expect(m.text).toContain("(3 of 6, needs 1 more to compete)");
    expect(m.text).toContain("1. Asha\n2. Meera\n3. Ravi");
    expect(m.html).toContain("Meera");
    expect(m.html).toContain("Ravi <span");
  });

  test("links the event page and drops join steps once the team is full", () => {
    const open = teamRegistrationMail(base);
    expect(open.html).toContain(
      'href="https://www.devnation.club/events/e1/register"',
    );
    expect(open.html).toContain("HOW TEAMMATES JOIN");
    const full = teamRegistrationMail({
      ...base,
      members: ["a", "b", "c", "d", "e", "Asha"],
    });
    expect(full.text).toContain("(6 of 6, full)");
    expect(full.html).not.toContain("HOW TEAMMATES JOIN");
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
