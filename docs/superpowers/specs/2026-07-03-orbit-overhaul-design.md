# ORBIT Overhaul — Design Spec

Date: 2026-07-03
Branch: `feat/orbit-overhaul` (off `origin/main` @ c051c53)
Status: user was away during clarification — the recommended option was taken for
each open decision and is marked **[assumed]** below. Revisit any of them freely.

## Scope

Ten tasks requested in one pass. Ordered here by implementation sequence (tooling
first so later diffs land formatted and in final locations), not by request order.

---

## 1. Tooling: ESLint → Biome (Task 2)

- Drop `eslint`, `eslint-config-next`, `eslint.config.mjs`.
- Add `@biomejs/biome` (dev dependency, pinned) with `biome.json`:
  - Linter: recommended rules + `react` / `next` domains (replaces
    eslint-config-next's core-web-vitals coverage).
  - Formatter: enabled, 2-space indent, double quotes — matches the dominant
    existing style so the one-time format commit is minimal.
  - Ignores: `.next/`, `node_modules/`, `app/generated/`, `prisma/migrations/`,
    `components/ui/8bit-toast.tsx` (vendored, minified, `@ts-nocheck`'d).
- Scripts: `lint` → `biome check .`, `lint:fix` → `biome check --write .`,
  `format` → `biome format --write .`.
- CI (`.github/workflows/ci.yml`): `bun run lint` → `bunx biome ci .`.
- One dedicated repo-wide format commit so functional diffs stay reviewable.

## 2. Husky pre-commit (Task 6)

- `husky` + `lint-staged`, both dev deps. `prepare` script installs hooks.
- `.husky/pre-commit` → `bunx lint-staged`.
- lint-staged config: `*.{ts,tsx,js,jsx,json,css}` → `biome check --write
  --no-errors-on-unmatched`. Formats staged files and blocks the commit on
  unfixable lint errors.

## 3. Directory restructure (Tasks 3 + 7) — **[assumed: consolidate in place, no `src/` move]**

Rationale: the `_sections`/`components` split has no rule ("route-private" vs
"shared" was never enforced — `_sections` components import from `components/`
and vice-versa is one hop away). Consolidate on ONE home for components,
organized by surface:

- `app/(auth)/login/page.tsx` → `app/login/page.tsx` — the group wrapped a
  single route and added nothing (no layout, no shared UI). `(main)` group
  STAYS: it carries a real shared layout.
- `app/(main)/_sections/*` →
  - pure hooks (`useCoverflow`, `useScrollGlide`, `useScrubProgress`,
    `useViewportWidth`, `useFlipDetail`, `useCardPowerOn`) → `hooks/`
  - `V2Header.tsx`, `Footer.tsx`, `BrandLink.tsx` → `components/layout/`
  - remaining landing-page sections/modals → `components/home/`
  - `stats-utils.ts` → `lib/stats-utils.ts`; `techStack.tsx` stays with its
    consumers in `components/home/`
- `components/v2/AsciiBackground.tsx` → `components/home/` (kills the `v2/`
  one-file directory; "v2" is meaningless naming).
- `utils/supabase/{client,server}.ts` → `lib/supabase/` (delete top-level
  `utils/`; `lib/supabase.ts` reviewed for merge/rename collision first).
- No path-alias changes needed (`@/*` covers the repo root).

## 4. `ADMIN_GITHUB_USERNAMES` → DB (Task 4) — **[assumed: seed + DB-only]**

Today the env var is (a) a sign-in allowlist bypass, (b) a role source that
re-elevates on every JWT sync, (c) referenced in AllowlistManager UI copy.

- Schema: `Allowlist` gains `grantRole Role?` — "role granted on first
  sign-in". Admin UI may set it; seed sets `president` for bootstrap admins.
- `createUser` (lib/auth.ts): looks up the allowlist row for the new user's
  login/email; applies `grantRole` + `approved` when present. Default stays
  `ajiet_student`/`pending`.
- All `bootstrapAdminUsernames`/`isBootstrapAdmin` runtime checks removed. The
  DB `role` column is the single source of truth (live role-sync already
  re-reads it every ≤30 s).
- `prisma/seed.ts`: imports `ADMIN_GITHUB_USERNAMES` (seed-time only) into
  allowlist rows with `grantRole: president`, and promotes matching existing
  users. Fresh-deploy story: set the var, run `prisma db seed`, sign in.
- `.env.example` updated: var documented as seed-time-only.

## 5. Sync revamp: cron → on-visit (Task 8) — **[assumed: stale-while-revalidate, cron deleted]**

- Schema: `SyncRun { key @id, lastRunAt, lockedUntil }` — one row, key
  `"stats"`.
- `lib/sync.ts`: `runStatsSyncIfStale()` —
  1. Fresh (< `SYNC_STALE_MINUTES`, default 15)? → return `{skipped}`.
  2. Atomic lock: `updateMany WHERE lockedUntil < now() SET lockedUntil =
     now()+5min`; zero rows updated → someone else is syncing → return.
     (Row is upserted on first ever call.)
  3. Run `syncAllStats()` + `recomputeLeaderboardScores()`, stamp
     `lastRunAt`, release lock in `finally`.
- `POST /api/sync` (`maxDuration = 60`): no auth needed — it can only trigger
  work already rate-limited to once per interval by the DB lock, same
  economics as the old secret-gated cron but self-throttling.
- Tiny client component on the landing page fires `fetch("/api/sync",
  {method:"POST"})` once after mount (`requestIdleCallback`) — page TTFB and
  render never wait on it; the *next* visit sees fresh data (SWR semantics).
- Deleted: `app/api/cron/*`, `.github/workflows/leaderboard-cron.yml`,
  `CRON_SECRET`/`CRON_URL` docs. Admin "refresh member" route stays.
- Trade-off accepted: zero-traffic gaps mean stale stats — irrelevant, since
  staleness only exists when nobody is looking.

## 6. `next.config.ts` (Task 5)

- `images`: `formats: ["image/avif", "image/webp"]`, `remotePatterns` for the
  Supabase storage host + `avatars.githubusercontent.com`; long
  `minimumCacheTTL`.
- `poweredByHeader: false`, `reactStrictMode: true`, `compress: true`.
- Security headers via `headers()`: HSTS, `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`.
- `experimental.optimizePackageImports`: `lucide-react`, `react-icons`.

## 7. Orbit trails (Task 1) — **[assumed: pixel-block ghost trail]**

In `PixelLoadingScreen.tsx` (existing orbit/shatter physics):

- Per-planet ring buffer of trail particles `{x, y, bornAt, scale}` (cap ~40).
- Emission: every physics frame in which a planet's displacement since last
  frame exceeds ~1.4× its baseline orbital step — i.e. trails appear during
  fast drag-spins, the shatter fling, and the reform pull-in, and never during
  calm orbiting. This satisfies "pulled apart" AND "return" with one rule.
- Render: on the existing front orbit canvas each frame — squares snapped to
  an 8 px grid, planet brand color (GitHub `#a371f7`, LeetCode `#FFA116`,
  LinkedIn `#38bdf8`), opacity decays in 4 discrete steps over ~500 ms,
  size steps down with age. Reads as 8-bit ghosting, not motion blur.
- The ring-redraw cache (`lastOpacity`/`lastScale` skip) must be bypassed
  while any trail particle is alive, then restored.
- `prefers-reduced-motion`: no emission (matches the site's flattened-motion
  policy; the JS physics itself already runs for everyone).

## 8. Security audit (Task 9)

Route-by-route authz review (all `app/api/**` + server actions + admin pages),
upload route content validation, CSV export injection check, secret handling,
dependency hygiene (`knip` is currently a PROD dependency — move/remove), and
the headers from §6. Findings fixed in-branch; anything requiring user
decisions (e.g. rotating a leaked secret) reported instead.

## 9. Performance + UI polish (Task 10)

- Dynamic-import heavy client components not needed for first paint.
- Verify no oversized images ship unoptimized; audit bundle for the two icon
  libraries (both `lucide-react` and `react-icons` are shipped — consolidate
  where trivial).
- Targeted 8-bit consistency fixes in admin panel surfaces that still use the
  plain (non-pixel) shadcn variants where a pixel variant exists.
- No wholesale visual redesign — polish only.

## Testing / verification (every task)

`bunx tsc --noEmit` + `bun test lib` + `bunx next build` green before each
commit; `biome ci .` once Biome lands. Manual verification of the orbit trail
and sync flow via `next dev` where possible.

## Explicitly out of scope

- `src/` migration / feature-folder architecture (rejected for diff risk).
- Replacing the GitHub-Actions *scrape-announcements* workflow (different
  concern from the leaderboard cron).
- Auth provider or session-strategy changes.
