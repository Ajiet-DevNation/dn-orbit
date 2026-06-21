# dn-orbit — 9-task hardening & feature pass

Date: 2026-06-20
Branch: `feat/email-members-leaderboard-fixes`

## Context

A batch of fixes and features across the public site, auth, the leaderboard
scoring engine, and the admin panel. Sign-in is already gated by the admin
`Allowlist`, and the public Members directory is a static list
(`constants/members.ts`) separate from DB user accounts.

## Tasks & decisions

### 1. Event card height consistency (`EventsSection.tsx`)
Cards in a grid row already stretch equal; unevenness is across rows because the
text block varies (0–3 line description). Reserve a consistent content height:
title clamped to 2 lines, description box always reserving its `line-clamp-3`
space. CSS only.

### 3. Access-token leak (security) — `lib/auth.ts`, github stats route, page
`token.accessToken` was copied into the **session object**, exposed to the
browser via `/api/auth/session`. Remove it from the `session()` callback and the
`Session` type. The token remains in the encrypted httpOnly JWT and the DB
`Account` row. `app/api/stats/github/[userId]/route.ts` reads the token from the
`Account` row (same pattern as `lib/statsSync.ts`). `page.tsx` derives
`hasGithubToken` from the `Account` row it already queries.

### 5. Click-outside to close — `EventsSection.tsx`, `ProjectsSection.tsx`
Backdrop click on the detail overlay calls `close()`; card + detail wrappers
`stopPropagation`. Esc and the corner button stay.

### 6. Redundant project status badge — `ProjectsSection.tsx`
Remove the status chip from the detail panel title row; the flown-in card header
already shows it.

### 8. Double `/api/auth/session` — `app/layout.tsx`, `app/providers.tsx`
Root layout becomes async, calls `auth()` once, passes the session to
`SessionProvider`; `refetchOnWindowFocus={false}`. Client hydrates from the
server session → one call.

### 2. Auto-approval — `app/actions/onboarding.ts`, new `lib/usn.ts`
On successful onboarding (LeetCode profile verified), auto-set
`status: "approved"` **iff** the USN matches the AJIET pattern
`^4JK\d{2}[A-Z]{2}\d{3}$` (4JK = constant AJIET code). Non-matching but
allowlisted users stay `pending` for one manual click. `lib/usn.ts` owns the
matcher (edge-safe, unit-tested).

### 4. AJIET Alumni — RBAC role + directory category
- Prisma `Role` enum gains `alumni` (migration `ADD VALUE 'alumni' AFTER
  'member'`); `lib/roles.ts` adds it (label "AJIET Alumni", non-admin). Appears
  in the President's role picker automatically.
- `MemberData` gains optional `isAlumni`; `MembersSection` renders an **ALUMNI**
  badge so alumni can be showcased in the static directory.

### 7. Open-source contribution score — folded into GitHub, admin-tunable
- `lib/github.ts` adds `fetchOpenSourcePrs(username, token, minStars)` (GraphQL
  search: merged PRs to **non-owned, public** repos with `stargazerCount >=
  minStars`). `fetchGitHubStats` returns `openSourcePrs`; stored on
  `GithubStats.openSourcePrs` (migration).
- `lib/leaderboard-scoring.ts`: `rawGithubScore` adds
  `openSourcePrs * perPrPoints`. Part of the **GitHub** component — no new
  top-level weight slider.
- Two knobs on `ScoreWeight`: `ghOpenSourceMinStars` (default 10, fetch-time) and
  `ghOpenSourcePerPrPoints` (default 10, score-time). Exposed in the admin
  Leaderboard tuning panel (`WeightForm` + weights API), under the GitHub slider.
- Surfaced read-only on the player GitHub stats card.

### 9. Connect LeetCode — verify-and-confirm (no OAuth exists for LeetCode)
A **CONNECT** button next to the LeetCode input (ProfileModal + onboarding). It
calls `POST /api/stats/lc/verify`, which fetches the live LeetCode profile
(real name, avatar, ranking, solved). The UI shows the real profile so the user
confirms it's the right account before saving — typo/fake-handle proof. The
handle is only accepted once it resolves to a real profile.

## Out of scope
Real LeetCode OAuth (does not exist); migrating the static Members directory to
the DB; reworking the existing weight sum-to-1 rule.
