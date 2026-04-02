# dn-orbit — Agent & AI Coding Assistant Rules

## Collaboration style

The developer working on this project is learning as they build. Do not silently implement things — explain what you are doing and why.

- **Before writing non-trivial code**: briefly explain the approach and the reasoning (e.g. why Server Component vs Client Component, why a particular Prisma query shape, why a specific HTTP status code).
- **When introducing a pattern for the first time** in this codebase (e.g. first Route Handler, first Server Action, first use of `auth()`): explain the pattern, not just the syntax.
- **When making a decision with trade-offs**: name the alternatives and say why you chose this one.
- **Prefer showing, then explaining** over just dumping code. A short "here's what this does" after a code block is encouraged.
- **Do not over-explain basics** the developer already understands — calibrate to what is new or non-obvious in context.
- If a task is large, propose a plan first and let the developer confirm before executing.

## What this project is

**dn-orbit** is the official platform for DevNation, a university developer club.
It is a full-stack web app built on **Next.js 16 (App Router) + React 19 + TypeScript**,
with **Neon (PostgreSQL) + Prisma ORM**, **Tailwind CSS v4**, and deployed on **Vercel**.

It has 9 feature modules:

| # | Module | Key responsibility |
|---|--------|--------------------|
| 1 | Auth & Onboarding | GitHub OAuth, session, onboarding form |
| 2 | GitHub Stats | GitHub API integration, stat caching |
| 3 | LeetCode Stats | LC public GraphQL API, stat caching |
| 4 | Leaderboard | Scoring engine, nightly cron, UI |
| 5 | CMS — Events | Event CRUD, registration, feedback |
| 6 | Members Section | Member cards, bio pages, visibility |
| 7 | Admin Panel | RBAC, dashboards, config |
| 8 | Infra & DevOps | Schema, CI/CD, env, Vercel setup |
| 9 | Projects Showcase | Project listing, submission, milestones |

---

## CRITICAL — Read this before writing any code

This project uses **Next.js 16.2.1** and **React 19.2.4**.
These are NOT the versions you know from training data.
APIs, conventions, and file structure may have changed significantly.

**Before writing any Next.js or React code, always read the relevant docs:**

```
node_modules/next/dist/docs/
```

Pay special attention to:
- App Router conventions (layouts, pages, loading, error)
- Server Components vs Client Components (`"use server"` / `"use client"`)
- fetch caching behaviour (changed significantly in Next 15+)
- Route Handlers (`app/api/.../route.ts`)
- Middleware (`middleware.ts`)

Do not assume any Next.js API works the same as Next.js 13/14.
Heed all deprecation notices in the docs.

---

## Project structure

```
app/
  (auth)/             # login page, OAuth callback
  (dashboard)/        # protected member-facing pages
    leaderboard/
    projects/
    events/
    members/
  admin/              # admin-only pages (RBAC enforced by middleware)
  api/                # Route Handlers only — no page.tsx files here
    auth/
    stats/
      github/[userId]/
      lc/[userId]/
    events/
    projects/
    admin/
  layout.tsx          # root layout
  globals.css

components/
  ui/                 # primitives: Button, Card, Badge, Input, etc.
  layout/             # Navbar, Sidebar, Shell, PageHeader
  features/           # module-specific components (EventCard, ProjectCard, etc.)

lib/
  db.ts               # Prisma client singleton — always import from here
  auth.ts             # Auth helpers (session, role checks)
  utils.ts            # shared utilities

prisma/
  schema.prisma       # source of truth for all DB models

middleware.ts         # auth + RBAC enforcement for /admin/* and protected routes
```

---

## Stack reference

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| UI | React 19, Tailwind CSS v4 |
| Database | Neon (PostgreSQL, serverless) |
| ORM | Prisma |
| Auth | NextAuth.js (GitHub OAuth provider only) |
| Deployment | Vercel |
| Package manager | Bun |
| Linting | ESLint 9 (eslint-config-next) |

---

## Database models (Prisma)

All models are in `prisma/schema.prisma`. Never write raw SQL — always go through Prisma.
The Prisma client singleton is in `lib/db.ts`. Always import `db` from there:

```ts
import { db } from "@/lib/db";
```

### Tables summary

- `users` — central user record, GitHub identity + onboarding data
- `github_stats` — fetched GitHub metrics, keyed by userId, has `fetched_at`
- `lc_stats` — fetched LeetCode metrics, keyed by userId, has `fetched_at`
- `events` — club events, created by admins
- `registrations` — user ↔ event join table, tracks `attended`
- `feedback` — post-event feedback per user per event
- `leaderboard_scores` — computed scores stored nightly, one row per user
- `score_weights` — singleton config for leaderboard formula weights
- `projects` — club project records with approval workflow
- `project_members` — user ↔ project join table with role field

### Enums

```prisma
enum Role         { admin  member }
enum ProjectStatus { planning  active  completed  stalled }
```

### Key constraints to respect

- `registrations`: unique on `(userId, eventId)` — one registration per user per event
- `feedback`: unique on `(userId, eventId)` — one feedback per user per event
- `project_members`: unique on `(projectId, userId)` — one membership per user per project
- `leaderboard_scores`: unique on `userId` — one score row per user
- All cascade deletes are set — deleting a user removes all their related rows

---

## Auth & roles

- Auth provider: **GitHub OAuth only** (no email/password, no other providers)
- Session managed by NextAuth.js
- Two roles: `admin` and `member` (stored in `users.role`)
- First admin must be set manually in the DB
- All `/admin/*` routes must be protected by middleware checking `role === "admin"`
- All dashboard routes require a valid session — redirect to login if unauthenticated
- Onboarding: on first login, if user has no `usn` set, redirect to `/onboarding`

---

## Stats fetching pattern

Both GitHub and LeetCode stats follow the same cache pattern:

1. On dashboard load, check `fetched_at` on the most recent stats row
2. If `fetched_at` is older than 24 hours → refetch from external API
3. Store new row in DB with updated `fetched_at`
4. Always use the most recent row for display

GitHub stats use the GitHub REST/GraphQL API with the OAuth token from the user's session.
LeetCode stats use the unofficial public GraphQL endpoint: `https://alfa.leetcode.com/graphql`
with the `lc_username` stored in the `users` table.

---

## Leaderboard scoring formula

Scores are computed nightly via a Vercel Cron job and stored in `leaderboard_scores`.
Weights come from the `score_weights` table (admin-configurable).

```
LC Score    = (easy×1 + medium×3 + hard×5)  — normalised 0–100
GitHub Score = (commits + PRs×2 + stars)    — normalised 0–100
Event Score  = (attended / total_events) × 100

Total = (lcScore × lcWeight) + (githubScore × githubWeight) + (eventScore × eventWeight)
```

Never compute scores on-the-fly for the leaderboard page — always read from `leaderboard_scores`.

---

## Projects module rules

- Any authenticated member can submit a project (`is_approved = false` initially)
- Admin must approve before it appears on `/projects`
- `tech_stack` is stored as a JSON array of strings e.g. `["Next.js", "Tailwind"]`
- `milestones` is stored as a JSON array: `{ label: string, done: boolean }[]`
- `progress_pct` = `(completed milestones / total milestones) × 100` — computed on update
- GitHub commit count reuses the Module 2 GitHub fetcher — do not duplicate that logic
- `origin_event_id` is optional — projects do not need to be tied to an event

---

## Code conventions

### General

- TypeScript strict mode is on — no `any`, no non-null assertions without a comment
- Use named exports for components, not default exports (exception: page.tsx and layout.tsx)
- All server-side DB access goes in Server Components or Route Handlers — never in Client Components
- Client Components must be marked with `"use client"` at the top
- Server Actions must be marked with `"use server"`

### API routes

- All API routes live in `app/api/` as `route.ts` files
- Return typed `Response` objects using `NextResponse.json()`
- Always validate request body — use Zod or manual checks
- Return proper HTTP status codes (400 for bad input, 401 for unauth, 403 for forbidden, 404 for not found)

### Styling

- Use Tailwind CSS v4 utility classes only
- No inline styles
- No CSS modules (unless a very specific edge case — discuss first)
- Dark mode is the default theme for this project

### File naming

- Components: `PascalCase.tsx`
- Utilities/lib: `camelCase.ts`
- Route segments: `kebab-case/` (Next.js convention)

---

## Environment variables

Never hardcode secrets. All env vars must be in `.env.local` locally and set in Vercel dashboard for production.

```env
# Neon DB
DATABASE_URL=          # pooled connection string (for Prisma queries)
DIRECT_URL=            # direct connection string (for Prisma migrations)

# NextAuth
NEXTAUTH_SECRET=       # random secret — generate with: openssl rand -base64 32
NEXTAUTH_URL=          # http://localhost:3000 locally, your Vercel URL in prod

# GitHub OAuth App
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Do not commit `.env.local`. `.env.example` with blank values is committed.

---

## Module boundaries — do not cross these

Each module owns its own API routes, components, and DB access.
Cross-module data sharing happens **only** through the DB or through internal API routes.

| If you need... | Use this |
|----------------|----------|
| Current user's session | `auth()` helper from `lib/auth.ts` |
| Any DB query | `db` from `lib/db.ts` |
| GitHub stats in another module | Read from `github_stats` table, don't call the GitHub API directly |
| LC stats in another module | Read from `lc_stats` table |
| Leaderboard scores | Read from `leaderboard_scores` table — never recompute inline |

---

## Running the project

```bash
bun install
bunx prisma generate
bunx prisma migrate dev
bun run dev
```

Prisma Studio (visual DB browser):
```bash
bunx prisma studio
```

Lint + typecheck:
```bash
bun run lint
bunx tsc --noEmit
```