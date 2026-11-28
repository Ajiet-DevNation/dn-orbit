import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";

// fake Gmail transport: records each mail, or fails when told to
const sent: Record<string, unknown>[] = [];
let failWith: Error | null = null;
mock.module("nodemailer", () => ({
  createTransport: () => ({
    sendMail: async (m: Record<string, unknown>) => {
      if (failWith) throw failWith;
      sent.push(m);
      return {};
    },
  }),
}));
const { sendMail } = await import("./mail");

const MAIL = {
  to: "a@example.com",
  subject: "Hi",
  text: "t",
  html: "<p>t</p>",
};
const FAKE_PASS = "fake-app-password";
const saved = {
  user: process.env.GMAIL_USER,
  pass: process.env.GMAIL_APP_PASSWORD,
};
const restoreEnv = (key: string, value: string | undefined) => {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
};

describe("sendMail", () => {
  afterEach(() => {
    restoreEnv("GMAIL_USER", saved.user);
    restoreEnv("GMAIL_APP_PASSWORD", saved.pass);
    sent.length = 0;
    failWith = null;
  });

  test("skips with false, naming the vars, when not configured", async () => {
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
    const log = spyOn(console, "error").mockImplementation(() => {});
    expect(await sendMail(MAIL)).toBe(false);
    expect(String(log.mock.calls[0]?.[0])).toContain("GMAIL_APP_PASSWORD");
    expect(sent).toHaveLength(0);
    log.mockRestore();
  });

  test("sends as DevNation from the Gmail account", async () => {
    process.env.GMAIL_USER = "club@example.com";
    process.env.GMAIL_APP_PASSWORD = FAKE_PASS;
    expect(await sendMail(MAIL)).toBe(true);
    expect(sent[0]).toEqual({
      from: { name: "DevNation", address: "club@example.com" },
      ...MAIL,
    });
  });

  test("a failed send returns false and never logs the password", async () => {
    process.env.GMAIL_USER = "club@example.com";
    process.env.GMAIL_APP_PASSWORD = FAKE_PASS;
    failWith = Object.assign(new Error("Invalid login: 535 5.7.8"), {
      code: "EAUTH",
      responseCode: 535,
    });
    const log = spyOn(console, "error").mockImplementation(() => {});
    expect(await sendMail(MAIL)).toBe(false);
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain("EAUTH");
    expect(logged).not.toContain(FAKE_PASS);
    log.mockRestore();
  });
});
