import { describe, expect, test } from "bun:test";
import {
  createEventSchema,
  createProjectSchema,
  feedbackSchema,
  parseBody,
  scoreWeightsSchema,
  updateEventSchema,
  updateProjectSchema,
} from "./validation";

function jsonReq(body: unknown): Request {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("parseBody", () => {
  test("returns a 400-able error for malformed JSON instead of throwing", async () => {
    const req = new Request("http://localhost/test", {
      method: "POST",
      body: "{not json",
    });
    const result = await parseBody(req, createEventSchema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Invalid JSON body");
  });

  test("reports the offending field path", async () => {
    const result = await parseBody(
      jsonReq({ title: "", eventDate: "2026-08-01" }),
      createEventSchema,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toStartWith("title:");
  });

  test("drops unknown keys rather than rejecting the request", async () => {
    const result = await parseBody(
      jsonReq({
        title: "Hack Night",
        eventDate: "2026-08-01T18:00:00.000Z",
        somethingAnOlderClientSends: true,
      }),
      createEventSchema,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).not.toHaveProperty("somethingAnOlderClientSends");
    }
  });
});

describe("createEventSchema", () => {
  test("accepts a minimal valid event and coerces the date", async () => {
    const result = await parseBody(
      jsonReq({ title: "  Hack Night  ", eventDate: "2026-08-01T18:00:00Z" }),
      createEventSchema,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe("Hack Night");
      expect(result.data.eventDate).toBeInstanceOf(Date);
    }
  });

  test("requires eventDate", async () => {
    const result = await parseBody(jsonReq({ title: "X" }), createEventSchema);
    expect(result.ok).toBe(false);
  });

  test("rejects an unparseable eventDate", async () => {
    const result = await parseBody(
      jsonReq({ title: "X", eventDate: "not-a-date" }),
      createEventSchema,
    );
    expect(result.ok).toBe(false);
  });

  test("accepts every audience defined in the Prisma enum", async () => {
    for (const audience of [
      "public",
      "members",
      "college",
      "members_college",
    ]) {
      const result = await parseBody(
        jsonReq({ title: "X", eventDate: "2026-08-01T00:00:00Z", audience }),
        createEventSchema,
      );
      expect(result.ok).toBe(true);
    }
  });

  test("rejects an audience outside the enum", async () => {
    const result = await parseBody(
      jsonReq({
        title: "X",
        eventDate: "2026-08-01T00:00:00Z",
        audience: "everyone",
      }),
      createEventSchema,
    );
    expect(result.ok).toBe(false);
  });

  test("rejects a javascript: bannerUrl", async () => {
    const result = await parseBody(
      // biome-ignore lint/suspicious/noExplicitAny: deliberately hostile input
      jsonReq({
        title: "X",
        eventDate: "2026-08-01T00:00:00Z",
        bannerUrl: "javascript:alert(1)",
      } as any),
      createEventSchema,
    );
    expect(result.ok).toBe(false);
  });

  test("normalises an empty bannerUrl to undefined", async () => {
    const result = await parseBody(
      jsonReq({ title: "X", eventDate: "2026-08-01T00:00:00Z", bannerUrl: "" }),
      createEventSchema,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.bannerUrl).toBeUndefined();
  });

  test("rejects a non-positive capacity", async () => {
    const result = await parseBody(
      jsonReq({ title: "X", eventDate: "2026-08-01T00:00:00Z", capacity: 0 }),
      createEventSchema,
    );
    expect(result.ok).toBe(false);
  });
});

describe("updateEventSchema", () => {
  test("allows a single-field patch", async () => {
    const result = await parseBody(
      jsonReq({ isPublished: true }),
      updateEventSchema,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.isPublished).toBe(true);
  });

  test("still validates the fields that are present", async () => {
    const result = await parseBody(
      jsonReq({ audience: "nope" }),
      updateEventSchema,
    );
    expect(result.ok).toBe(false);
  });
});

describe("createProjectSchema", () => {
  test("requires an http(s) githubRepoUrl", async () => {
    const missing = await parseBody(
      jsonReq({ title: "Orbit" }),
      createProjectSchema,
    );
    expect(missing.ok).toBe(false);

    const bad = await parseBody(
      jsonReq({ title: "Orbit", githubRepoUrl: "javascript:alert(1)" }),
      createProjectSchema,
    );
    expect(bad.ok).toBe(false);

    const good = await parseBody(
      jsonReq({
        title: "Orbit",
        githubRepoUrl: "https://github.com/Ajiet-DevNation/dn-orbit",
      }),
      createProjectSchema,
    );
    expect(good.ok).toBe(true);
  });

  test("rejects a status outside the Prisma enum", async () => {
    const result = await parseBody(
      jsonReq({
        title: "Orbit",
        githubRepoUrl: "https://github.com/x/y",
        status: "on-fire",
      }),
      createProjectSchema,
    );
    expect(result.ok).toBe(false);
  });

  test("rejects malformed milestones", async () => {
    const result = await parseBody(
      jsonReq({
        title: "Orbit",
        githubRepoUrl: "https://github.com/x/y",
        milestones: [{ label: "ship it" }],
      }),
      createProjectSchema,
    );
    expect(result.ok).toBe(false);
  });

  test("accepts well-formed milestones", async () => {
    const result = await parseBody(
      jsonReq({
        title: "Orbit",
        githubRepoUrl: "https://github.com/x/y",
        milestones: [
          { label: "ship it", done: true },
          { label: "polish", done: false },
        ],
      }),
      createProjectSchema,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.milestones).toHaveLength(2);
  });

  test("rejects progressPct outside 0-100", async () => {
    for (const progressPct of [-1, 101]) {
      const result = await parseBody(
        jsonReq({
          title: "Orbit",
          githubRepoUrl: "https://github.com/x/y",
          progressPct,
        }),
        createProjectSchema,
      );
      expect(result.ok).toBe(false);
    }
  });
});

describe("updateProjectSchema", () => {
  test("does not require githubRepoUrl on a patch", async () => {
    const result = await parseBody(
      jsonReq({ status: "active" }),
      updateProjectSchema,
    );
    expect(result.ok).toBe(true);
  });
});

describe("feedbackSchema", () => {
  test("accepts ratings 1-5 and rejects anything outside", async () => {
    for (const rating of [1, 3, 5]) {
      expect((await parseBody(jsonReq({ rating }), feedbackSchema)).ok).toBe(
        true,
      );
    }
    for (const rating of [0, 6, 2.5]) {
      expect((await parseBody(jsonReq({ rating }), feedbackSchema)).ok).toBe(
        false,
      );
    }
  });

  test("caps comment length", async () => {
    const result = await parseBody(
      jsonReq({ rating: 5, comments: "x".repeat(2001) }),
      feedbackSchema,
    );
    expect(result.ok).toBe(false);
  });
});

describe("scoreWeightsSchema", () => {
  test("accepts weights that total 1.00", async () => {
    const result = await parseBody(
      jsonReq({ githubWeight: 0.33, lcWeight: 0.33, eventWeight: 0.34 }),
      scoreWeightsSchema,
    );
    expect(result.ok).toBe(true);
  });

  test("rejects weights that do not total 1.00", async () => {
    const result = await parseBody(
      jsonReq({ githubWeight: 0.5, lcWeight: 0.5, eventWeight: 0.5 }),
      scoreWeightsSchema,
    );
    expect(result.ok).toBe(false);
  });

  test("rejects the all-zero config that used to flatten every score", async () => {
    const result = await parseBody(
      jsonReq({ githubWeight: 0, lcWeight: 0, eventWeight: 0 }),
      scoreWeightsSchema,
    );
    expect(result.ok).toBe(false);
  });

  test("allows the float drift the admin sliders produce", async () => {
    // Three sliders at 33/33/34 percent can land a hair off 1.0 after the /100.
    const result = await parseBody(
      jsonReq({ githubWeight: 0.333, lcWeight: 0.333, eventWeight: 0.333 }),
      scoreWeightsSchema,
    );
    expect(result.ok).toBe(true);
  });

  test("rejects a weight outside 0-1", async () => {
    const result = await parseBody(
      jsonReq({ githubWeight: 1.5, lcWeight: -0.5, eventWeight: 0 }),
      scoreWeightsSchema,
    );
    expect(result.ok).toBe(false);
  });

  test("rejects a negative open-source knob", async () => {
    const result = await parseBody(
      jsonReq({
        githubWeight: 0.33,
        lcWeight: 0.33,
        eventWeight: 0.34,
        ghOpenSourceMinStars: -1,
      }),
      scoreWeightsSchema,
    );
    expect(result.ok).toBe(false);
  });
});
