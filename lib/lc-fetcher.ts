// lib/lc-fetcher.ts

// Official LeetCode GraphQL endpoint. (Was previously the third-party
// `alfa.leetcode.com` proxy, which is now dead — no DNS record.)
const LEETCODE_GRAPHQL_ENDPOINT = "https://leetcode.com/graphql";

// LeetCode is an unofficial, unsupported dependency — it can and does hang.
// Both calls below are bounded so a stalled connection can't hold a serverless
// request open: the profile preview blocks a member's "Connect" click, and the
// stats fetch runs inside the drip queue's shared wall-clock budget.
const REQUEST_TIMEOUT_MS = 10_000;

export interface LcStatsResult {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  lcRanking: number | null;
  streak: number;
}

const query = `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
      profile {
        ranking
      }
    }
  }
`;
// Note: streak (userCalendar / streakCounter) is login-gated on the official
// endpoint and returns an error anonymously, so it is intentionally omitted.
// streak therefore defaults to 0 below.

// ─── Profile preview (for the "Connect LeetCode" verify flow) ────────────────
// LeetCode has no OAuth, so we can't receive a verified login. Instead, the
// Connect button fetches the live public profile and shows it back to the user
// (avatar, display name, ranking, solved) so they confirm it's the right account
// before it's saved — catching typos and impersonation of a non-existent handle.

export interface LcProfilePreview {
  username: string;
  realName: string | null;
  avatar: string | null;
  ranking: number | null;
  totalSolved: number;
}

const profileQuery = `
  query getUserProfilePreview($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        realName
        userAvatar
        ranking
      }
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;

/**
 * Fetch a public LeetCode profile for confirmation. Throws if the handle does
 * not resolve to a real user (so the caller can reject invalid input).
 */
export async function fetchLeetCodeProfile(
  username: string,
): Promise<LcProfilePreview> {
  const response = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://leetcode.com",
    },
    body: JSON.stringify({ query: profileQuery, variables: { username } }),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`LeetCode API responded with status: ${response.status}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(
      result.errors[0]?.message || "GraphQL Error from LeetCode API",
    );
  }

  const matchedUser = result.data?.matchedUser;
  if (!matchedUser) {
    throw new Error(`User not found: ${username}`);
  }

  const submissions = matchedUser.submitStats?.acSubmissionNum ?? [];
  const all = submissions.find(
    (s: { difficulty: string; count: number }) => s.difficulty === "All",
  );

  return {
    username: matchedUser.username ?? username,
    realName: matchedUser.profile?.realName?.trim() || null,
    avatar: matchedUser.profile?.userAvatar || null,
    ranking: matchedUser.profile?.ranking || null,
    totalSolved: all ? all.count : 0,
  };
}

export async function fetchLeetCodeStats(
  username: string,
): Promise<LcStatsResult> {
  const response = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://leetcode.com",
    },
    body: JSON.stringify({
      query,
      variables: { username },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`LeetCode API responded with status: ${response.status}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(
      result.errors[0]?.message || "GraphQL Error from LeetCode API",
    );
  }

  const matchedUser = result.data?.matchedUser;
  if (!matchedUser) {
    throw new Error(`User not found: ${username}`);
  }

  const submissions = matchedUser.submitStats?.acSubmissionNum || [];

  const getCount = (difficulty: string) => {
    const item = submissions.find(
      (s: { difficulty: string; count: number }) => s.difficulty === difficulty,
    );
    return item ? item.count : 0;
  };

  const totalSolved = getCount("All");
  const easySolved = getCount("Easy");
  const mediumSolved = getCount("Medium");
  const hardSolved = getCount("Hard");

  const lcRanking = matchedUser.profile?.ranking || null;
  const streak = matchedUser.userCalendar?.streak || 0;

  return {
    totalSolved,
    easySolved,
    mediumSolved,
    hardSolved,
    lcRanking,
    streak,
  };
}
