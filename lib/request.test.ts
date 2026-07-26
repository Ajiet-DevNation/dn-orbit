import { describe, expect, test } from "bun:test";
import { isSameOrigin } from "./request";

const req = (
  headers: Record<string, string>,
  url = "https://orbit.test/api/sync",
) => new Request(url, { method: "POST", headers });

describe("isSameOrigin", () => {
  test("allows a request with neither Origin nor Referer (curl, server-to-server)", () => {
    expect(isSameOrigin(req({ host: "orbit.test" }))).toBe(true);
  });

  test("allows a matching Origin", () => {
    expect(
      isSameOrigin(req({ host: "orbit.test", origin: "https://orbit.test" })),
    ).toBe(true);
  });

  test("blocks a cross-site Origin", () => {
    expect(
      isSameOrigin(req({ host: "orbit.test", origin: "https://evil.example" })),
    ).toBe(false);
  });

  test("falls back to Referer when Origin is absent", () => {
    expect(
      isSameOrigin(
        req({ host: "orbit.test", referer: "https://orbit.test/leaderboard" }),
      ),
    ).toBe(true);
    expect(
      isSameOrigin(
        req({ host: "orbit.test", referer: "https://evil.example/page" }),
      ),
    ).toBe(false);
  });

  test("honours the x-forwarded-host/proto pair set by the platform", () => {
    expect(
      isSameOrigin(
        req({
          host: "internal-abc.vercel.internal",
          "x-forwarded-host": "orbit.test",
          "x-forwarded-proto": "https",
          origin: "https://orbit.test",
        }),
      ),
    ).toBe(true);
  });

  test("allows http and https for the same host (local dev)", () => {
    expect(
      isSameOrigin(
        req(
          { host: "localhost:3000", origin: "http://localhost:3000" },
          "http://localhost:3000/api/sync",
        ),
      ),
    ).toBe(true);
  });

  test("blocks a malformed Referer rather than failing open", () => {
    expect(
      isSameOrigin(req({ host: "orbit.test", referer: "not-a-url" })),
    ).toBe(false);
  });

  test("blocks a subdomain of the real host", () => {
    expect(
      isSameOrigin(
        req({ host: "orbit.test", origin: "https://orbit.test.evil.example" }),
      ),
    ).toBe(false);
  });
});
