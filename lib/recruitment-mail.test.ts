import { describe, expect, test } from "bun:test";
import { decisionMail } from "./recruitment-mail";

describe("decisionMail", () => {
  test("accepted mail welcomes the candidate by name", () => {
    const m = decisionMail("Asha", "approved");
    expect(m.subject).toBe("Welcome to DevNation!");
    expect(m.text).toStartWith("Hi Asha,");
    expect(m.text).toContain("accepted");
    expect(m.html).toContain("Hi Asha,");
  });

  test("rejected mail is a different, polite message", () => {
    const m = decisionMail("Asha", "rejected");
    expect(m.subject).toBe("Your DevNation application");
    expect(m.text).toContain("apply again");
    expect(m.text).not.toContain("accepted");
  });

  test("escapes the name in HTML but keeps it raw in plain text", () => {
    const m = decisionMail('<script>alert("x")</script>', "approved");
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&lt;script&gt;");
    expect(m.text).toContain("<script>");
  });
});

describe("decisionMail layout", () => {
  test("uses the shared club frame and links the right page", () => {
    const ok = decisionMail("Asha", "approved");
    expect(ok.html).toContain("DEVNATION");
    expect(ok.html).toContain("APPLICATION ACCEPTED");
    expect(ok.html).toContain("Hi Asha, welcome aboard.");
    expect(ok.html).toContain("VISIT DEVNATION");
    const no = decisionMail("Asha", "rejected");
    expect(no.html).toContain("APPLICATION UPDATE");
    expect(no.html).toContain('href="https://www.devnation.club/#events"');
    expect(no.html).not.toContain("welcome aboard.");
  });
});
