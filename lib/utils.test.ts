import { describe, expect, test } from "bun:test";
import { errorMessage, githubAvatarAt } from "./utils";

describe("errorMessage", () => {
  test("pulls the error field out of a JSON body", async () => {
    const res = Response.json(
      { error: "Only the President may change roles" },
      { status: 403 },
    );
    expect(await errorMessage(res)).toBe("Only the President may change roles");
  });

  test("falls back to a plain-text body", async () => {
    expect(
      await errorMessage(new Response("UNAUTHORIZED_ACCESS", { status: 403 })),
    ).toBe("UNAUTHORIZED_ACCESS");
  });

  test("falls back to the status when the body is empty", async () => {
    expect(await errorMessage(new Response(null, { status: 500 }))).toBe(
      "Request failed (500)",
    );
  });
});

describe("githubAvatarAt", () => {
  test("sizes GitHub avatars, keeping existing params", () => {
    expect(
      githubAvatarAt("https://avatars.githubusercontent.com/u/1?v=4", 64),
    ).toBe("https://avatars.githubusercontent.com/u/1?v=4&s=64");
  });
  test("replaces an existing size", () => {
    expect(
      githubAvatarAt("https://avatars.githubusercontent.com/u/1?s=460", 128),
    ).toBe("https://avatars.githubusercontent.com/u/1?s=128");
  });
  test("leaves other hosts and junk alone", () => {
    expect(githubAvatarAt("https://example.com/a.png", 64)).toBe(
      "https://example.com/a.png",
    );
    expect(githubAvatarAt("not a url", 64)).toBe("not a url");
  });
});
