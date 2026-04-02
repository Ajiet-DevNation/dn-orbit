# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Collaboration style

The developer working on this project is learning as they build. Do not silently implement things — explain what you are doing and why.

- **Before writing non-trivial code**: briefly explain the approach and the reasoning (e.g. why Server Component vs Client Component, why a particular Prisma query shape, why a specific HTTP status code).
- **When introducing a pattern for the first time** in this codebase (e.g. first Route Handler, first Server Action, first use of `auth()`): explain the pattern, not just the syntax.
- **When making a decision with trade-offs**: name the alternatives and say why you chose this one.
- **Prefer showing, then explaining** over just dumping code. A short "here's what this does" after a code block is encouraged.
- **Do not over-explain basics** the developer already understands — calibrate to what is new or non-obvious in context.
- If a task is large, propose a plan first and let the developer confirm before executing.

## What this project is

**dn-orbit** is the official platform for DevNation, a university developer club. It is a full-stack Next.js 16 app (App Router) with React 19, TypeScript (strict), Tailwind CSS v4, Neon PostgreSQL via Prisma ORM, NextAuth.js (GitHub OAuth only), deployed on Vercel, using Bun as the package manager.

## Commands

```bash
# Development
bun install
bunx prisma generate
bunx prisma migrate dev
bun run dev

# Production build (also runs migrations)
bun run build        # generates Prisma client, deploys migrations, builds Next.js

# Quality checks
bun run lint
bunx tsc --noEmit

# DB browser
bunx prisma studio
```

## CRITICAL — Next.js 16 & React 19

This project uses **Next.js 16.2.1** and **React 19.2.4** — do NOT assume APIs match Next.js 13/14. Before writing any Next.js or React code, check:

```
node_modules/next/dist/docs/
```

Pay attention to: App Router conventions, Server vs Client Components, fetch caching (changed in Next 15+), Route Handlers, and Middleware.

## Architecture

### Module structure

9 feature modules, each owning its API routes, components, and DB access:

| # | Module | Status |
|---|--------|--------|
| 1 | Auth & Onboarding | Done |
| 2 | GitHub Stats | Pending |
| 3 | LeetCode Stats | Pending |
| 4 | Leaderboard | Pending |
| 5 | CMS — Events | Pending |
| 6 | Members Section | Pending |
| 7 | Admin Panel | Pending |
| 8 | Infra & DevOps | Ongoing |
| 9 | Projects Showcase | Pending |

### Key files

- `lib/db.ts` — Prisma client singleton; always import `db` from here
- `lib/auth.ts` — NextAuth config + `auth()` session helper
- `proxy.ts` — Middleware for auth + RBAC (protects `/dashboard/*` and `/admin/*`)
- `prisma/schema.prisma` — source of truth for all DB models

### App Router layout

```
app/
  (auth)/             # login page
  (dashboard)/        # protected member-facing pages (leaderboard, projects, events, members)
  admin/              # admin-only pages (role === "admin" enforced by middleware)
  api/                # Route Handlers only — no page.tsx here
```

### Cross-module data sharing

| Need | Use |
|------|-----|
| Current user session | `auth()` from `lib/auth.ts` |
| Any DB query | `db` from `lib/db.ts` |
| GitHub/LC stats from another module | Read from `github_stats`/`lc_stats` table — never call APIs directly |
| Leaderboard scores | Read from `leaderboard_scores` — never recompute inline |

## Database

Never write raw SQL — always use Prisma. Key constraints:
- `registrations`, `feedback`, `project_members`, `leaderboard_scores` each have unique constraints (see `prisma/schema.prisma`)
- All cascade deletes are set — deleting a user removes all their rows
- Enums: `Role { admin member }`, `ProjectStatus { planning active completed stalled }`

## Stats caching pattern

Both GitHub and LeetCode stats follow the same pattern: check `fetched_at` on the most recent row — if older than 24 hours, refetch from external API and store a new row.

- GitHub: REST/GraphQL API using the user's OAuth access token from session
- LeetCode: public GraphQL endpoint `https://alfa.leetcode.com/graphql` using `users.lc_username`

## Leaderboard scoring

Scores computed nightly via Vercel Cron, stored in `leaderboard_scores`. Weights from `score_weights` table (admin-configurable):

```
LC Score     = (easy×1 + medium×3 + hard×5)  — normalised 0–100
GitHub Score = (commits + PRs×2 + stars)     — normalised 0–100
Event Score  = (attended / total_events) × 100
Total        = (lcScore × lcWeight) + (githubScore × githubWeight) + (eventScore × eventWeight)
```

## Projects module

- Submissions start with `is_approved = false`; admin must approve before appearing on `/projects`
- `tech_stack`: JSON string array; `milestones`: JSON `{ label: string, done: boolean }[]`
- `progress_pct` = completed milestones / total milestones × 100 — recompute on every update
- Reuse the Module 2 GitHub fetcher for commit counts — do not duplicate

## Code conventions

- **Server Components by default** — add `"use client"` only when needed; Server Actions need `"use server"`
- **Named exports** for all components (exception: `page.tsx` and `layout.tsx`)
- **No `any`**, no non-null assertions without an explanatory comment
- **Tailwind CSS v4 only** — no inline styles, no CSS modules; dark mode is the default theme
- **API routes**: validate all inputs (Zod or manual), return `NextResponse.json()` with correct HTTP status codes (400/401/403/404)
- **File naming**: components → `PascalCase.tsx`, utilities → `camelCase.ts`, route segments → `kebab-case/`

## Environment variables

Set in `.env.local` locally, Vercel dashboard for production:

```env
DATABASE_URL=       # pooled Neon connection (Prisma queries)
DIRECT_URL=         # direct Neon connection (Prisma migrations)
NEXTAUTH_SECRET=    # openssl rand -base64 32
NEXTAUTH_URL=       # http://localhost:3000 locally
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```
