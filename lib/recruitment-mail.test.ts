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
