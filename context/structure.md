DevNation CMS — Refined Module Leads & Task Delegation
Stack: Next.js (App Router) · Neon DB (Postgres + Auth) · Prisma ORM · Tailwind CSS · Vercel

Module 1 — Auth & Onboarding (Sunpreeth) 
Lead: ___ · Team: 2 devs
Configure GitHub OAuth via NextAuth.js (or Supabase Auth with GitHub provider)
Middleware for protected routes (redirect unauthenticated users)
First-login detection → redirect to onboarding
Build onboarding form: Name, USN, Branch, Year, LC Username, GitHub Username
Save completed profile to users table in DB
DevNation CMS — Refined Module Leads & Task Delegation
Stack: Next.js (App Router) · Neon DB (Postgres + Auth) · Prisma ORM · Tailwind CSS · Vercel

Module 1 — Auth & Onboarding (Sunpreeth)
Lead: ___ · Team: 2 devs
Configure GitHub OAuth via NextAuth.js (or Supabase Auth with GitHub provider)
Middleware for protected routes (redirect unauthenticated users)
First-login detection → redirect to onboarding
Build onboarding form: Name, USN, Branch, Year, LC Username, GitHub Username
Save completed profile to users table in DB
Skip onboarding for returning users Twaha


Module 2 — GitHub Stats Integration (Anirudh)
Lead:  Anirudh  · Team: 2 devs
GitHub REST / GraphQL API integration using the OAuth token from login
Fetch: public repos, total commits, PRs merged, stars received, top languages
Store results in github_stats table with fetched_at timestamp (for cache TTL)
Expose internal API route: GET /api/stats/github/[userId]
Schedule refresh: on dashbo___ard load if fetched_at > 24h old

Module 3 — LeetCode Stats Integration (Muaz)
Lead: Muaz · Team: 2 devs
Use LeetCode's unofficial public GraphQL endpoint (alfa.leetcode.com/graphql)
Fetch using the lc_username saved during onboarding
Fetch: total_solved, easy/mecmsdium/hard breakdown, global ranking, streakcms
Store in lc_stats table with fetched_at timestamp
Graceful fallback UI if lc_username is not set
Expose internal API route: GET /api/statscms/lc/[userId]

Module 4 — Leaderboard
Lead: ___ · Team: 2 devs
Scoring formula (configurable via score_weights table):
LC Score: weighted sum of (easy × 1 + medium × 3 + hard × 5) normalised
GitHub Score: weighted sum of (commits + PRs×2 + stars) normalised
Event Score: (events attended / total events) × 100
Total = (lc × lc_weight) + (github × github_weight) + (event × event_weight)
Nightly cron job (Vercel Cron) to recompute and store leaderboard_scores
Leaderboard page: sortable by total / individual score, paginatedcms
Admin control to manually trigger recompute and adjust weights (stored in score_weights)

Module 5 — CMS: Events (Jizel)
Lead: ___ · Team: 2 devs
Admin: create/edit/delete event (title, description, banner, type, date, location, published flag)
Public: event listing page (upcoming / past tabs), event detail page
Registration: authenticated members can register for an event (stored in registrations table)
Attendance: admin can mark attended = true per member per event (used in leaderboard event_score)
]]Feedback form: post-event, per member per event, rating (1–5) + comments

Module 6 — Members Section (Sunp)
Lead: ___ · Team: 1 dev
Member listing page (card grid, only is_visible = true members)
Individual bio page: auto-populated from users + github_stats + lc_stats
Admin: toggle is_visible, assign roles (Core Team / Member / Alumni), edit bio manually
Role/tag badge display on cards and bio pages

Module 7 — Admin Panel (Arjun R)
Lead: ___ · Team: 2 devs
Role-based access control: role = admin required for all /admin/* routes
Admin dashboard: total members, events count, registrations today, leaderboard last updated
Member management: table view, role assignment, visibility toggle, manual stat refresh trigger
Event management: full CRUD (links to Module 5)
Leaderboard config: adjust github_weight, lc_weight, event_weight → saves to score_weights table
First admin: set manually in DB; subsequent admins promoted from admin panel

Module 8 — Infra & DevOps (Twaha)
Lead: ___ · Team: 2 devs
Initialise Next.js 14 monorepo (App Router, TypeScript, Tailwind)
Set up Supabase project: Postgres DB, Row Level Security policies
Prisma schema covering all 8 tables, migrations workflow
Environment config (.env.local, .env.production, Vercel env vars)
GitHub Actions CI: lint + type-check on PR, auto-deploy to Vercel on main merge
Vercel Cron setup for nightly leaderboard recompute

Team Allocation Summary (15 devs)
Module 1 — Auth & Onboarding: 2 devs
Module 2 — GitHub Stats: 2 devs
Module 3 — LeetCode Stats: 2 devs
Module 4 — Leaderboard: 2 devs
Module 5 — CMS Events: 2 devs
Module 6 — Members Section: 1 dev
Module 7 — Admin Panel: 2 devs
Module 8 — Infra & DevOps: 2 devs

Build Order (suggested sprint sequence)
Sprint 1 — Infra setup (M8) + Auth & Onboarding (M1)
Sprint 2 — GitHub Stats (M2) + LC Stats (M3) in parallel
Sprint 3 — CMS Events (M5) + Members Section (M6) in parallel
Sprint 4 — Leaderboard (M4) — depends on M2, M3, M5
Sprint 5 — Admin Panel (M7) — integrates all modules
Sprint 6 — Polish, QA, deployment
Skip onboarding for returning users Twaha


Module 2 — GitHub Stats Integration (Anirudh)
Lead:  Anirudh  · Team: 2 devs
GitHub REST / GraphQL API integration using the OAuth token from login
Fetch: public repos, total commits, PRs merged, stars received, top languages
Store results in github_stats table with fetched_at timestamp (for cache TTL)
Expose internal API route: GET /api/stats/github/[userId]
Schedule refresh: on dashbo___ard load if fetched_at > 24h old

Module 3 — LeetCode Stats Integration (Muaz)
Lead: Muaz · Team: 2 devs
Use LeetCode's unofficial public GraphQL endpoint (alfa.leetcode.com/graphql)
Fetch using the lc_username saved during onboarding
Fetch: total_solved, easy/mecmsdium/hard breakdown, global ranking, streakcms
Store in lc_stats table with fetched_at timestamp
Graceful fallback UI if lc_username is not set
Expose internal API route: GET /api/statscms/lc/[userId]

Module 4 — Leaderboard
Lead: ___ · Team: 2 devs
Scoring formula (configurable via score_weights table):
LC Score: weighted sum of (easy × 1 + medium × 3 + hard × 5) normalised
GitHub Score: weighted sum of (commits + PRs×2 + stars) normalised
Event Score: (events attended / total events) × 100
Total = (lc × lc_weight) + (github × github_weight) + (event × event_weight)
Nightly cron job (Vercel Cron) to recompute and store leaderboard_scores
Leaderboard page: sortable by total / individual score, paginatedcms
Admin control to manually trigger recompute and adjust weights (stored in score_weights)

Module 5 — CMS: Events (Jizel)
Lead: ___ · Team: 2 devs
Admin: create/edit/delete event (title, description, banner, type, date, location, published flag)
Public: event listing page (upcoming / past tabs), event detail page
Registration: authenticated members can register for an event (stored in registrations table)
Attendance: admin can mark attended = true per member per event (used in leaderboard event_score)
]]Feedback form: post-event, per member per event, rating (1–5) + comments

Module 6 — Members Section (Sunp) 
Lead: ___ · Team: 1 dev
Member listing page (card grid, only is_visible = true members)
Individual bio page: auto-populated from users + github_stats + lc_stats
Admin: toggle is_visible, assign roles (Core Team / Member / Alumni), edit bio manually
Role/tag badge display on cards and bio pages

Module 7 — Admin Panel (Arjun R)
Lead: ___ · Team: 2 devs
Role-based access control: role = admin required for all /admin/* routes
Admin dashboard: total members, events count, registrations today, leaderboard last updated
Member management: table view, role assignment, visibility toggle, manual stat refresh trigger
Event management: full CRUD (links to Module 5)
Leaderboard config: adjust github_weight, lc_weight, event_weight → saves to score_weights table
First admin: set manually in DB; subsequent admins promoted from admin panel

Module 8 — Infra & DevOps (Twaha)
Lead: ___ · Team: 2 devs
Initialise Next.js 14 monorepo (App Router, TypeScript, Tailwind)
Set up Supabase project: Postgres DB, Row Level Security policies
Prisma schema covering all 8 tables, migrations workflow
Environment config (.env.local, .env.production, Vercel env vars)
GitHub Actions CI: lint + type-check on PR, auto-deploy to Vercel on main merge
Vercel Cron setup for nightly leaderboard recompute

Team Allocation Summary (15 devs)
Module 1 — Auth & Onboarding: 2 devs
Module 2 — GitHub Stats: 2 devs
Module 3 — LeetCode Stats: 2 devs
Module 4 — Leaderboard: 2 devs
Module 5 — CMS Events: 2 devs
Module 6 — Members Section: 1 dev
Module 7 — Admin Panel: 2 devs
Module 8 — Infra & DevOps: 2 devs

Build Order (suggested sprint sequence)
Sprint 1 — Infra setup (M8) + Auth & Onboarding (M1)
Sprint 2 — GitHub Stats (M2) + LC Stats (M3) in parallel
Sprint 3 — CMS Events (M5) + Members Section (M6) in parallel
Sprint 4 — Leaderboard (M4) — depends on M2, M3, M5
Sprint 5 — Admin Panel (M7) — integrates all modules
Sprint 6 — Polish, QA, deployment