import { describe, expect, test } from "bun:test";
import { errorMessage } from "./utils";

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
