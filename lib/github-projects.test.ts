import { expect, test } from "bun:test";
import {
  buildTechStack,
  type Repo,
  selectShowcaseRepos,
  snippet,
  titleFromName,
  toProjectDraft,
} from "./github-projects";

/** Minimal repo factory — only the fields the module consumes. */
function repo(partial: Partial<Repo> & { name: string }): Repo {
  return {
    full_name: `Ajiet-DevNation/${partial.name}`,
    description: "A long enough description to pass the showcase blurb filter.",
    html_url: `https://github.com/Ajiet-DevNation/${partial.name}`,
    language: null,
    pushed_at: "2026-01-01T00:00:00Z",
    archived: false,
    languages_url: `https://api.github.com/repos/Ajiet-DevNation/${partial.name}/languages`,
    ...partial,
  };
}

// ── titleFromName ─────────────────────────────────────────────────────────────

test("titleFromName maps separators to spaces and uppercases", () => {
  expect(titleFromName("DevNation-CMS")).toBe("DEVNATION CMS");
  expect(titleFromName("project_stack")).toBe("PROJECT STACK");
});

test("titleFromName splits a letter/digit boundary so years read", () => {
  expect(titleFromName("Aakar2025")).toBe("AAKAR 2025");
});

// ── snippet ───────────────────────────────────────────────────────────────────

test("snippet collapses whitespace and passes short text through", () => {
  expect(snippet("hello   world\n\nagain")).toBe("hello world again");
});

test("snippet truncates long text on a word boundary with an ellipsis", () => {
  const result = snippet("hello ".repeat(45));
  expect(result.endsWith("…")).toBe(true);
  expect(result.length).toBeLessThanOrEqual(201); // max + the ellipsis
  for (const word of result.slice(0, -1).split(" ")) {
    expect(word).toBe("hello"); // no mid-word cut
  }
});

test("snippet hard-cuts a single long word when there is no space", () => {
  expect(snippet("a".repeat(250))).toBe(`${"a".repeat(200)}…`);
});

// ── selectShowcaseRepos ───────────────────────────────────────────────────────

test("selectShowcaseRepos drops archived repos and thin descriptions", () => {
  const selected = selectShowcaseRepos([
    repo({ name: "ok" }),
    repo({ name: "archived", archived: true }),
    repo({ name: "no-desc", description: "too short" }),
    repo({ name: "null-desc", description: null }),
  ]);
  expect(selected.map((r) => r.name)).toEqual(["ok"]);
});

test("selectShowcaseRepos orders by freshest push and caps at eight", () => {
  const repos = Array.from({ length: 10 }, (_, i) =>
    repo({
      name: `repo-${i}`,
      pushed_at: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    }),
  );
  const selected = selectShowcaseRepos(repos);
  expect(selected).toHaveLength(8);
  expect(selected[0].name).toBe("repo-9"); // newest push first
  expect(selected.map((r) => r.name)).not.toContain("repo-0");
  expect(selected.map((r) => r.name)).not.toContain("repo-1");
});

// ── toProjectDraft ────────────────────────────────────────────────────────────

test("toProjectDraft marks a recent push active and an old one completed", () => {
  const now = Date.parse("2026-06-01T00:00:00Z");
  const fresh = toProjectDraft(
    repo({ name: "Aakar-26", pushed_at: "2026-05-15T00:00:00Z" }),
    ["Next.js"],
    now,
  );
  const stale = toProjectDraft(
    repo({ name: "cert-gen", pushed_at: "2025-01-01T00:00:00Z" }),
    [],
    now,
  );

  expect(fresh.status).toBe("active");
  expect(stale.status).toBe("completed");
  expect(fresh.githubRepoFullName).toBe("Ajiet-DevNation/Aakar-26");
  expect(fresh.githubRepoUrl).toBe(
    "https://github.com/Ajiet-DevNation/Aakar-26",
  );
  expect(fresh.title).toBe("AAKAR 26");
  expect(fresh.techStack).toEqual(["Next.js"]);
});

// ── buildTechStack ────────────────────────────────────────────────────────────

test("buildTechStack puts known topics first, then languages by bytes", async () => {
  const getJson = async <T>(_url: string): Promise<T> =>
    ({ TypeScript: 1000, Makefile: 300, Dockerfile: 100 }) as T;

  const stack = await buildTechStack(
    repo({ name: "x", topics: ["nextjs", "react", "nextjs"] }),
    getJson,
  );
  expect(stack).toEqual(["Next.js", "React", "TypeScript"]); // deduped, Makefile/Dockerfile skipped
});

test("buildTechStack falls back to the primary language when the call fails", async () => {
  const getJson = async <T>(_url: string): Promise<T> => {
    throw new Error("rate limited");
  };

  const stack = await buildTechStack(
    repo({ name: "x", language: "Rust" }),
    getJson,
  );
  expect(stack).toEqual(["Rust"]);
});
