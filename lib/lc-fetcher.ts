// lib/lc-fetcher.ts

const LEETCODE_GRAPHQL_ENDPOINT = "https://leetcode.com/graphql";

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
      userCalendar {
        streak
      }
    }
  }
`;

export async function fetchLeetCodeStats(username: string): Promise<LcStatsResult> {
  const response = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Referer": "https://leetcode.com"
    },
    body: JSON.stringify({
      query,
      variables: { username }
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`LeetCode API responded with status: ${response.status}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0]?.message || "GraphQL Error from LeetCode API");
  }

  const matchedUser = result.data?.matchedUser;
  if (!matchedUser) {
    throw new Error(`User not found: ${username}`);
  }

  const submissions = matchedUser.submitStats?.acSubmissionNum || [];

  const getCount = (difficulty: string) => {
    const item = submissions.find((s: Record<string, any>) => s.difficulty === difficulty);
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
