// lib/github.ts
// Module 2 — GitHub Stats Integration
// Fetches public repos, commits, PRs, stars, and top languages
// from the GitHub API using the user's OAuth access token.

const GITHUB_API = "https://api.github.com";
const GITHUB_GRAPHQL = "https://api.github.com/graphql";

export interface GitHubStats {
  reposCount: number;
  totalCommits: number;
  totalPrs: number;
  totalStars: number;
  topLanguages: Record<string, number>; // { "TypeScript": 12400, "Python": 3200 }
}

// ─── REST: fetch basic user info + repos ─────────────────────────────────────

async function fetchUserRepos(
  username: string,
  token: string
): Promise<{ reposCount: number; totalStars: number; topLanguages: Record<string, number> }> {
  // Fetch all repos (paginate up to 100 per page)
  let page = 1;
  let allRepos: Array<{ stargazers_count: number; language: string | null }> = [];

  while (true) {
    const res = await fetch(
      `${GITHUB_API}/users/${username}/repos?per_page=100&page=${page}&type=owner`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`GitHub API error fetching repos: ${res.status} ${res.statusText}`);
    }

    const repos = await res.json();
    if (repos.length === 0) break;

    allRepos = allRepos.concat(repos);
    page++;
    if (repos.length < 100) break; // last page
  }

  // Count total stars across all repos
  const totalStars = allRepos.reduce(
    (sum: number, repo: { stargazers_count: number }) => sum + repo.stargazers_count,
    0
  );

  // Aggregate top languages
  const languageCounts: Record<string, number> = {};
  for (const repo of allRepos) {
    if (repo.language) {
      languageCounts[repo.language] = (languageCounts[repo.language] ?? 0) + 1;
    }
  }

  // Sort and keep top 5 languages
  const topLanguages = Object.fromEntries(
    Object.entries(languageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  );

  return {
    reposCount: allRepos.length,
    totalStars,
    topLanguages,
  };
}

// ─── REST: fetch merged PRs count (via Search API) ───────────────────────────

async function fetchMergedPRs(username: string, token: string): Promise<number> {
  const res = await fetch(
    `${GITHUB_API}/search/issues?q=author:${username}+type:pr+is:merged&per_page=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`GitHub API error fetching PRs: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.total_count as number;
}

// ─── GraphQL: fetch total commits (contributions) ────────────────────────────
// GitHub's REST API doesn't expose total commits easily.
// GraphQL contributionsCollection gives us the real number.

async function fetchTotalCommits(username: string, token: string): Promise<number> {
  const query = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          totalCommitContributions
          restrictedContributionsCount
        }
      }
    }
  `;

  const res = await fetch(GITHUB_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { username } }),
  });

  if (!res.ok) {
    throw new Error(`GitHub GraphQL error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  if (json.errors) {
    throw new Error(`GitHub GraphQL query failed: ${JSON.stringify(json.errors)}`);
  }

  const collection = json.data?.user?.contributionsCollection;
  const total =
    (collection?.totalCommitContributions ?? 0) +
    (collection?.restrictedContributionsCount ?? 0);

  return total as number;
}

// ─── Main export: fetch everything ───────────────────────────────────────────

export async function fetchGitHubStats(
  username: string,
  token: string
): Promise<GitHubStats> {
  // Run all fetches in parallel for speed
  const [repoData, totalCommits, totalPrs] = await Promise.all([
    fetchUserRepos(username, token),
    fetchTotalCommits(username, token),
    fetchMergedPRs(username, token),
  ]);

  return {
    reposCount: repoData.reposCount,
    totalCommits,
    totalPrs,
    totalStars: repoData.totalStars,
    topLanguages: repoData.topLanguages,
  };
}
