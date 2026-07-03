import { describe, expect, test } from "bun:test";
import {
  computeLeaderboard,
  rawGithubScore,
  rawLcScore,
  type ScoringUserInput,
  type ScoringWeights,
} from "./leaderboard-scoring";

const EQUAL_WEIGHTS: ScoringWeights = {
  lcWeight: 1 / 3,
  githubWeight: 1 / 3,
  eventWeight: 1 / 3,
};

function user(
  id: string,
  over: Partial<ScoringUserInput> = {},
): ScoringUserInput {
  return { userId: id, lc: null, gh: null, attendedCount: 0, ...over };
}

describe("raw component scores", () => {
  test("LeetCode weights easy/medium/hard as 1/3/5", () => {
    expect(rawLcScore({ easySolved: 2, mediumSolved: 3, hardSolved: 1 })).toBe(
      2 + 9 + 5,
    );
  });

  test("GitHub weights commits/PRs/stars as 1/2/1", () => {
    expect(
      rawGithubScore({ totalCommits: 10, totalPrs: 4, totalStars: 5 }),
    ).toBe(10 + 8 + 5);
  });

  test("open-source PRs add perPrPoints each to the GitHub raw score", () => {
    expect(
      rawGithubScore(
        { totalCommits: 10, totalPrs: 4, totalStars: 5, openSourcePrs: 3 },
        10,
      ),
    ).toBe(10 + 8 + 5 + 30);
  });

  test("open-source PRs contribute nothing when perPrPoints defaults to 0", () => {
    expect(
      rawGithubScore({
        totalCommits: 0,
        totalPrs: 0,
        totalStars: 0,
        openSourcePrs: 5,
      }),
    ).toBe(0);
  });

  test("null stats score 0", () => {
    expect(rawLcScore(null)).toBe(0);
    expect(rawGithubScore(null)).toBe(0);
  });
});

describe("computeLeaderboard", () => {
  test("empty cohort returns empty array", () => {
    expect(computeLeaderboard([], EQUAL_WEIGHTS, 0)).toEqual([]);
  });

  test("normalises the strongest user in each axis to 100 (sqrt-compressed)", () => {
    const result = computeLeaderboard(
      [
        user("a", { lc: { easySolved: 10, mediumSolved: 0, hardSolved: 0 } }),
        user("b", { lc: { easySolved: 5, mediumSolved: 0, hardSolved: 0 } }),
      ],
      EQUAL_WEIGHTS,
      0,
    );
    const a = result.find((r) => r.userId === "a")!;
    const b = result.find((r) => r.userId === "b")!;
    expect(a.lcScore).toBe(100);
    // Compression lifts the runner-up: sqrt(5)/sqrt(10) ≈ 0.707, not 0.5.
    expect(b.lcScore).toBeCloseTo(70.71, 2);
  });

  test("square-root compression stops one outlier from crushing the field", () => {
    const result = computeLeaderboard(
      [
        user("whale", {
          gh: { totalCommits: 10000, totalPrs: 0, totalStars: 0 },
        }),
        user("mid", { gh: { totalCommits: 100, totalPrs: 0, totalStars: 0 } }),
      ],
      { lcWeight: 0, githubWeight: 1, eventWeight: 0 },
      0,
    );
    expect(result.find((r) => r.userId === "whale")!.githubScore).toBe(100);
    // Linear normalisation would give the mid user 1; sqrt gives a fair 10.
    expect(result.find((r) => r.userId === "mid")!.githubScore).toBeCloseTo(
      10,
      5,
    );
  });

  test("ranks by total score descending and numbers from 1", () => {
    const result = computeLeaderboard(
      [
        user("low", { lc: { easySolved: 1, mediumSolved: 0, hardSolved: 0 } }),
        user("high", {
          lc: { easySolved: 10, mediumSolved: 0, hardSolved: 0 },
        }),
      ],
      EQUAL_WEIGHTS,
      0,
    );
    expect(result[0]).toMatchObject({ userId: "high", rank: 1 });
    expect(result[1]).toMatchObject({ userId: "low", rank: 2 });
  });

  test("clamps event score to 100 when attendance exceeds counted events", () => {
    const [r] = computeLeaderboard(
      [user("a", { attendedCount: 5 })],
      EQUAL_WEIGHTS,
      2, // only 2 counted events, but 5 attended → ratio would be 250%
    );
    expect(r.eventScore).toBe(100);
  });

  test("zero counted events yields zero event score (no divide-by-zero)", () => {
    const [r] = computeLeaderboard(
      [user("a", { attendedCount: 3 })],
      EQUAL_WEIGHTS,
      0,
    );
    expect(r.eventScore).toBe(0);
    expect(Number.isFinite(r.totalScore)).toBe(true);
  });

  test("all-zero cohort produces finite zero scores", () => {
    const result = computeLeaderboard([user("a"), user("b")], EQUAL_WEIGHTS, 0);
    for (const r of result) {
      expect(r.totalScore).toBe(0);
      expect(Number.isFinite(r.lcScore)).toBe(true);
    }
  });

  test("ties break deterministically on userId", () => {
    const cohort = [user("zeta"), user("alpha")];
    const first = computeLeaderboard(cohort, EQUAL_WEIGHTS, 0);
    const second = computeLeaderboard([...cohort].reverse(), EQUAL_WEIGHTS, 0);
    expect(first.map((r) => r.userId)).toEqual(["alpha", "zeta"]);
    expect(second.map((r) => r.userId)).toEqual(["alpha", "zeta"]);
  });

  test("open-source PRs lift a user's GitHub-driven total", () => {
    const result = computeLeaderboard(
      [
        // Same commits; only `withOss` has qualifying open-source PRs. With a
        // GitHub-only weighting, withOss must normalise to 100 and outrank.
        user("withOss", {
          gh: {
            totalCommits: 10,
            totalPrs: 0,
            totalStars: 0,
            openSourcePrs: 5,
          },
        }),
        user("noOss", {
          gh: {
            totalCommits: 10,
            totalPrs: 0,
            totalStars: 0,
            openSourcePrs: 0,
          },
        }),
      ],
      {
        lcWeight: 0,
        githubWeight: 1,
        eventWeight: 0,
        githubOpenSourcePerPrPoints: 10,
      },
      0,
    );
    expect(result[0].userId).toBe("withOss");
    expect(result[0].githubScore).toBe(100);
    expect(result.find((r) => r.userId === "noOss")!.githubScore).toBeLessThan(
      100,
    );
  });

  test("respects weights — a 100%-weighted axis drives the total", () => {
    const result = computeLeaderboard(
      [
        // gh-strong user vs lc-strong user, but only GitHub is weighted.
        user("ghStar", {
          gh: { totalCommits: 100, totalPrs: 0, totalStars: 0 },
        }),
        user("lcStar", {
          lc: { easySolved: 100, mediumSolved: 0, hardSolved: 0 },
        }),
      ],
      { lcWeight: 0, githubWeight: 1, eventWeight: 0 },
      0,
    );
    expect(result[0].userId).toBe("ghStar");
    expect(result[0].totalScore).toBe(100);
    expect(result[1].totalScore).toBe(0);
  });
});
