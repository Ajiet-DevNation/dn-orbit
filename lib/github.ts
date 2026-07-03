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
  /** Merged PRs to public repos the user doesn't own, upstream stars ≥ minStars. */
  openSourcePrs: number;
  topLanguages: Record<string, number>; // { "TypeScript": 12400, "Python": 3200 }
}

// ─── REST: fetch basic user info + repos ─────────────────────────────────────

async function fetchUserRepos(
  username: string,
  token: string,
  includePrivate: boolean,
): Promise<{
  reposCount: number;
  totalStars: number;
  topLanguages: Record<string, number>;
}> {
  // Two endpoints, chosen by whether `token` belongs to `username`:
  //   • includePrivate → GET /user/repos returns the *authenticated* user's own
  //     repos, including PRIVATE ones (requires the `repo` scope). This is only
  //     valid when the token is that same user's token, which the caller asserts
  //     via includePrivate — GitHub never exposes one user's private repos to
  //     another user's token.
  //   • otherwise → GET /users/{username}/repos returns only PUBLIC repos for an
  //     arbitrary username (e.g. an admin viewing someone else's stats).
  // `affiliation=owner` / `type=owner` both restrict to repos the user owns.
  const buildUrl = (page: number) =>
    includePrivate
      ? `${GITHUB_API}/user/repos?per_page=100&page=${page}&affiliation=owner&visibility=all`
      : `${GITHUB_API}/users/${username}/repos?per_page=100&page=${page}&type=owner`;

  // Fetch all repos (paginate up to 100 per page)
  let page = 1;
  let allRepos: Array<{ stargazers_count: number; language: string | null }> =
    [];

  while (true) {
    const res = await fetch(buildUrl(page), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!res.ok) {
      throw new Error(
        `GitHub API error fetching repos: ${res.status} ${res.statusText}`,
      );
    }

    const repos = await res.json();
    if (repos.length === 0) break;

    allRepos = allRepos.concat(repos);
    page++;
    if (repos.length < 100) break; // last page
  }

  // Count total stars across all repos
  const totalStars = allRepos.reduce(
    (sum: number, repo: { stargazers_count: number }) =>
      sum + repo.stargazers_count,
    0,
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
      .slice(0, 5),
  );

  return {
    reposCount: allRepos.length,
    totalStars,
    topLanguages,
  };
}

// ─── REST: fetch merged PRs count (via Search API) ───────────────────────────

async function fetchMergedPRs(
  username: string,
  token: string,
): Promise<number> {
  const res = await fetch(
    `${GITHUB_API}/search/issues?q=author:${username}+type:pr+is:merged&per_page=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (!res.ok) {
    throw new Error(
      `GitHub API error fetching PRs: ${res.status} ${res.statusText}`,
    );
  }

  const data = await res.json();
  return data.total_count as number;
}

// ─── GraphQL: fetch total commits (contributions) ────────────────────────────
// GitHub's REST API doesn't expose total commits easily.
// GraphQL contributionsCollection gives us the real number.

async function fetchTotalCommits(
  username: string,
  token: string,
): Promise<number> {
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
    throw new Error(
      `GitHub GraphQL query failed: ${JSON.stringify(json.errors)}`,
    );
  }

  const collection = json.data?.user?.contributionsCollection;
  const total =
    (collection?.totalCommitContributions ?? 0) +
    (collection?.restrictedContributionsCount ?? 0);

  return total as number;
}

// ─── GraphQL: count open-source contributions ────────────────────────────────
// "Open source" here means merged PRs the user authored into PUBLIC repos they
// do NOT own, where the upstream repo has at least `minStars` stars — i.e. real
// contributions to other people's projects, not their own. Uses the search API
// (merged PRs are public regardless of whose token queries them) and reads each
// PR's repository stars in the same query, so no per-PR follow-up requests.
// Paginated with a hard page cap so one prolific contributor can't run the
// request unbounded.

const OPEN_SOURCE_MAX_PAGES = 4; // up to 400 most-recent merged PRs

interface OpenSourceSearchNode {
  repository?: {
    stargazerCount: number;
    isPrivate: boolean;
    owner: { login: string };
  };
}

interface OpenSourceSearchResponse {
  data?: {
    search?: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: OpenSourceSearchNode[];
    };
  };
  errors?: unknown;
}

async function fetchOpenSourcePrs(
  username: string,
  token: string,
  minStars: number,
): Promise<number> {
  const query = `
    query($q: String!, $after: String) {
      search(query: $q, type: ISSUE, first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          ... on PullRequest {
            repository {
              stargazerCount
              isPrivate
              owner { login }
            }
          }
        }
      }
    }
  `;
  const q = `author:${username} type:pr is:merged`;
  const owner = username.toLowerCase();

  let after: string | null = null;
  let qualifying = 0;

  for (let page = 0; page < OPEN_SOURCE_MAX_PAGES; page++) {
    const res = await fetch(GITHUB_GRAPHQL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: { q, after } }),
    });

    if (!res.ok) {
      throw new Error(`GitHub GraphQL error: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as OpenSourceSearchResponse;
    if (json.errors) {
      throw new Error(
        `GitHub GraphQL query failed: ${JSON.stringify(json.errors)}`,
      );
    }

    const search = json.data?.search;
    const nodes = search?.nodes ?? [];

    for (const node of nodes) {
      const repo = node.repository;
      if (!repo || repo.isPrivate) continue;
      if (repo.owner.login.toLowerCase() === owner) continue; // own repo
      if (repo.stargazerCount >= minStars) qualifying++;
    }

    if (!search?.pageInfo?.hasNextPage) break;
    after = search.pageInfo.endCursor;
  }

  return qualifying;
}

// ─── Main export: fetch everything ───────────────────────────────────────────

export async function fetchGitHubStats(
  username: string,
  token: string,
  options: { includePrivate?: boolean; openSourceMinStars?: number } = {},
): Promise<GitHubStats> {
  // includePrivate must only be set when `token` is `username`'s own token.
  // It is what unlocks private-repo stats (repos, stars, languages); private
  // commits/PRs are already counted server-side by GitHub for the owning token
  // (restrictedContributionsCount + the merged-PR search), so they need no flag.
  const { includePrivate = false, openSourceMinStars = 10 } = options;

  // Run all fetches in parallel for speed
  const [repoData, totalCommits, totalPrs, openSourcePrs] = await Promise.all([
    fetchUserRepos(username, token, includePrivate),
    fetchTotalCommits(username, token),
    fetchMergedPRs(username, token),
    fetchOpenSourcePrs(username, token, openSourceMinStars),
  ]);

  return {
    reposCount: repoData.reposCount,
    totalCommits,
    totalPrs,
    totalStars: repoData.totalStars,
    openSourcePrs,
    topLanguages: repoData.topLanguages,
  };
}
