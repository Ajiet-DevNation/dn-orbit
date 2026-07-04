# dn-orbit

Official platform for **DevNation**, a university developer club. **dn-orbit** is a full-stack web application designed to manage club activities, track member contributions (GitHub & LeetCode), and showcase projects.

## Project Modules

| # | Module            | Key Responsibility                                             |
| - | ----------------- | -------------------------------------------------------------- |
| 1 | Auth & Onboarding | GitHub OAuth, session management, and onboarding profile setup |
| 2 | GitHub Stats      | GitHub API integration and statistic caching                   |
| 3 | LeetCode Stats    | LeetCode public GraphQL API integration and caching            |
| 4 | Leaderboard       | Scoring engine, nightly computation cron, and UI               |
| 5 | CMS — Events     | Event management (CRUD), registration, and feedback            |
| 6 | Members Section   | Public member directory, bios, and visibility controls         |
| 7 | Admin Panel       | Role-Based Access Control (RBAC) and administrative dashboards |
| 8 | Infra & DevOps    | Schema management, CI/CD, and Vercel environment setup         |
| 9 | Projects Showcase | Project submission, approval workflow, and milestone tracking  |

---

## Technical Stack

| Layer                     | Technology                      |
| ------------------------- | ------------------------------- |
| **Framework**       | Next.js 16.2.1 (App Router)     |
| **Language**        | TypeScript (Strict Mode)        |
| **UI**              | React 19.2.4, Tailwind CSS v4   |
| **Database**        | Neon (PostgreSQL, Serverless)   |
| **ORM**             | Prisma 7                        |
| **Auth**            | NextAuth.js (GitHub OAuth only) |
| **Deployment**      | Vercel                          |
| **Package Manager** | Bun                             |
| **Linting**         | ESLint 9                        |

---

## Project Structure

```text
app/
  (auth)/             # login page, OAuth callback
  (dashboard)/        # protected member-facing pages (leaderboard, projects, etc.)
  admin/              # admin-only pages (RBAC enforced)
  api/                # Route Handlers only (no page.tsx files)
  layout.tsx          # root layout
  globals.css

components/
  ui/                 # primitive UI components
  layout/             # shell components (Navbar, Sidebar)
  features/           # module-specific components

lib/
  db.ts               # Prisma client singleton (import from here)
  auth.ts             # Auth and session helpers (session, role checks)
  utils.ts            # shared utilities

prisma/
  schema.prisma       # database schema source of truth
```

---

## Development Guidelines

### Getting Started

1. **Install dependencies**:
   ```bash
   bun install
   ```
2. **Setup environment**:
   ```bash
   cp .env.example .env
   # Fill in DATABASE_URL, NEXTAUTH_SECRET, and GITHUB keys
   ```
3. **Database initialization**:
   ```bash
   bunx prisma generate
   bunx prisma migrate dev
   ```
4. **Run development server**:
   ```bash
   bun dev
   ```

### Database & ORM

- **Singleton Pattern**: Always import `db` from `@/lib/db`.
- **No Raw SQL**: All database access must go through Prisma.
- **Constraints**:
  - `registrations`: Unique on `(userId, eventId)`.
  - `feedback`: Unique on `(userId, eventId)`.
  - `project_members`: Unique on `(projectId, userId)`.

### Auth & Roles

- **Provider**: GitHub OAuth is the only supported method.
- **Roles**: `admin` and `member` (stored in `users.role`).
- **Middleware**: Authentication and RBAC are enforced for `/admin/*` and protected routes.
- **Onboarding**: Users with no `usn` are redirected to `/onboarding`.

### Stats & Leaderboard

- **Cache Pattern**: Stats are cached for 24 hours. Check `fetched_at` before refetching from external APIs.
- **Leaderboard Formula**: Computed nightly via cron.
  - `LC Score = (easy×1 + medium×3 + hard×5)` (normalised 0–100)
  - `GitHub Score = (commits + PRs×2 + stars)` (normalised 0–100)
  - `Event Score = (attended / total_events) × 100`
  - `Total = (lcScore × lcWeight) + (githubScore × githubWeight) + (eventScore × eventWeight)`

### Code Conventions

- **Exports**: Use named exports (except for `page.tsx` and `layout.tsx`).
- **Boundaries**: Modules must only share data via the database.
- **Strict Typing**: No `any` types; no non-null assertions without justification.
- **Styling**: Use Tailwind CSS v4 utility classes exclusively. No inline styles.

---

## Environment Variables

The following variables must be configured in your `.env` file:

- `DATABASE_URL`: Pooled connection string.
- `DIRECT_URL`: Direct connection string for migrations.
- `NEXTAUTH_SECRET`: Random secret for session encryption.
- `NEXTAUTH_URL`: Canonical application URL.
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: GitHub OAuth credentials.

### Stats sync

Member stats (GitHub + LeetCode) and the leaderboard refresh on demand, not on
a cron: a visit to the landing page fires `POST /api/sync`, which re-syncs the
whole cohort and recomputes `leaderboard_scores` only when the last run is
older than `SYNC_STALE_MINUTES` (default 15). A DB lock guarantees a single
runner, so concurrent visitors — or curl — can't stampede the external APIs.
No repository secrets or GitHub Actions required.
