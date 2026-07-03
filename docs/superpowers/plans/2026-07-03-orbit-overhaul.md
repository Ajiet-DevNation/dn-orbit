# ORBIT Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 10-task overhaul in `docs/superpowers/specs/2026-07-03-orbit-overhaul-design.md`: Biome tooling + husky, directory restructure, DB-backed admin bootstrap, on-visit stats sync, next.config hardening, orbit trail animation, security audit, perf/UI polish.

**Architecture:** Next.js 16 App Router + Prisma/Postgres + Auth.js v5 (JWT). Tooling lands first so every later diff is formatted and in final file locations; schema-touching tasks (4, 5 in plan order) share one migration mindset (one migration each, run via `prisma migrate dev`); visual work last.

**Tech Stack:** bun, Biome 2.x, husky + lint-staged, Prisma 7, canvas/rAF for animation.

## Global Constraints

- Branch: `feat/orbit-overhaul`. One commit per plan task (plus the dedicated repo-wide format commit).
- Verification gate before EVERY commit: `bunx tsc --noEmit` && `bun test lib` && `bunx next build` all green (build needs `.env` present — it is). After Task 1 also `bunx biome ci .`.
- Package manager is **bun** (`bun add`, `bun add -d`, `bunx`).
- Path alias `@/*` maps to repo root — file moves need import-specifier updates but no tsconfig change.
- `components/ui/8bit-toast.tsx` is vendored/minified: never lint, format, or edit it.
- Existing code style: 2-space indent, double quotes, heavy explanatory comments — match it.
- If `prisma migrate dev` cannot reach the DB, create the migration folder manually with `prisma migrate diff --from-schema-datasource --to-schema-datamodel` SQL and note it in the commit body.

---

### Task 1: Replace ESLint with Biome (spec §1)

**Files:**
- Create: `biome.json`
- Delete: `eslint.config.mjs`
- Modify: `package.json` (scripts + devDependencies), `.github/workflows/ci.yml:23`

**Interfaces:**
- Produces: `bun run lint` (= `biome check .`), `bun run lint:fix`, `bun run format`; CI step `bunx biome ci .`. Task 2 (husky) and all later tasks depend on these.

- [ ] **Step 1: Swap packages**

```bash
bun remove eslint eslint-config-next
bun add -d @biomejs/biome
rm eslint.config.mjs
```

- [ ] **Step 2: Create `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.0/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "includes": [
      "**",
      "!components/ui/8bit-toast.tsx",
      "!prisma/migrations/**",
      "!app/generated/**",
      "!next-env.d.ts"
    ]
  },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 },
  "javascript": { "formatter": { "quoteStyle": "double" } },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true },
    "domains": { "next": "recommended", "react": "recommended" }
  }
}
```

(Adjust `$schema` version to the installed Biome version. If a recommended rule fires on legitimate existing patterns repo-wide — e.g. `noExplicitAny` in vendored-ish UI files — prefer fixing the code; only downgrade a rule to `"warn"` with an inline comment in biome.json when a fix would be out-of-scope churn, and say so in the commit body.)

- [ ] **Step 3: Update `package.json` scripts**

`"lint": "biome check ."`, add `"lint:fix": "biome check --write ."`, `"format": "biome format --write ."`.

- [ ] **Step 4: CI** — in `.github/workflows/ci.yml` replace `- run: bun run lint` with `- run: bunx biome ci .`.

- [ ] **Step 5: Verify lint runs clean on new config**

Run: `bunx biome check .` — fix every error it reports (code fixes, not blanket disables).
Then run the verification gate. Commit: `chore: replace eslint with biome (lint + format)`.

- [ ] **Step 6: One-time repo format, separate commit**

```bash
bunx biome check --write .
bunx tsc --noEmit && bun test lib && bunx next build
git add -A && git commit -m "style: one-time repo-wide biome format"
```

### Task 2: Husky pre-commit (spec §2)

**Files:**
- Create: `.husky/pre-commit`
- Modify: `package.json`

**Interfaces:**
- Consumes: Biome from Task 1.
- Produces: commits are auto-formatted; unfixable lint blocks the commit.

- [ ] **Step 1:** `bun add -d husky lint-staged && bunx husky init` — then overwrite `.husky/pre-commit` with exactly `bunx lint-staged` (husky init writes an npm-flavored default).
- [ ] **Step 2:** In `package.json`: ensure `"prepare": "husky"` script exists; add top-level:

```json
"lint-staged": {
  "*.{ts,tsx,js,jsx,mjs,json,css}": "biome check --write --no-errors-on-unmatched"
}
```

- [ ] **Step 3: Prove the hook works** — stage a file with a deliberate format error, run `git commit`, confirm the committed file is formatted; then verification gate and commit `chore: husky pre-commit with biome via lint-staged`.

### Task 3: Directory restructure (spec §3, Tasks 3+7)

**Files (all moves via `git mv`):**
- `app/(auth)/login/page.tsx` → `app/login/page.tsx`; delete `app/(auth)/`
- `app/(main)/_sections/use{Coverflow,ScrollGlide,ScrubProgress,ViewportWidth,FlipDetail,CardPowerOn}.ts` → `hooks/`
- `app/(main)/_sections/{V2Header,Footer,BrandLink}.tsx` → `components/layout/`
- `app/(main)/_sections/stats-utils.ts` → `lib/stats-utils.ts`
- remaining `app/(main)/_sections/*` → `components/home/`
- `components/v2/AsciiBackground.tsx` → `components/home/AsciiBackground.tsx`; delete `components/v2/`
- `utils/supabase/{client,server}.ts` → `lib/supabase/`; delete `utils/` (FIRST read `lib/supabase.ts` — if it collides conceptually, unify: keep one clear module boundary, e.g. `lib/supabase/admin.ts` for the service-role client)

**Interfaces:**
- Produces: import roots `@/components/home/*`, `@/components/layout/*`, `@/hooks/*`, `@/lib/stats-utils`, `@/lib/supabase/*`. Later tasks import from these paths.

- [ ] **Step 1:** Perform the moves with `git mv`.
- [ ] **Step 2:** Update every import specifier: `grep -rn "_sections\|components/v2\|utils/supabase" app components lib hooks --include="*.ts*"` and fix each (relative `./_sections/X` becomes `@/components/home/X` etc.). Also check `components.json` aliases and `V2Header`'s self-references.
- [ ] **Step 3:** `bunx tsc --noEmit` until zero errors; confirm `/login` still routes (URL was `/login` before and after — the group added no URL segment, so no redirects/links change; verify with `grep -rn '"/login"' app lib proxy.ts` that nothing referenced the group path).
- [ ] **Step 4:** Full verification gate; commit `refactor: consolidate _sections/components split, dissolve (auth) group`.

### Task 4: ADMIN_GITHUB_USERNAMES → DB (spec §4)

**Files:**
- Modify: `prisma/schema.prisma` (Allowlist), `lib/auth.ts`, `prisma/seed.ts`, `app/admin/members/AllowlistManager.tsx` (copy referencing the env var), `.env.example`

**Interfaces:**
- Produces: `Allowlist.grantRole: Role?` column (`grant_role`); auth no longer reads `ADMIN_GITHUB_USERNAMES` at runtime.

- [ ] **Step 1: Schema** — in `model Allowlist` add:

```prisma
  /// Role granted (with approved status) when this person first signs in.
  /// Replaces the ADMIN_GITHUB_USERNAMES env bootstrap; normally only used
  /// to bootstrap the first president on a fresh deploy (via prisma db seed).
  grantRole Role? @map("grant_role")
```

Run `bunx prisma migrate dev --name allowlist_grant_role` (fallback per Global Constraints).

- [ ] **Step 2: `lib/auth.ts`** — delete `bootstrapAdminUsernames`/`isBootstrapAdmin` and all three call sites (signIn gate branch, createUser role/status ternaries, both JWT re-elevation blocks). In `createUser`, look up the allowlist row once:

```ts
const grant = await db.allowlist.findFirst({
  where: {
    OR: [
      ...(u.githubUsername ? [{ githubUsername: u.githubUsername.toLowerCase() }] : []),
      ...(u.email ? [{ email: u.email.toLowerCase() }] : []),
    ],
  },
  select: { grantRole: true },
});
```

then `role: grant?.grantRole ?? "ajiet_student"`, `status: grant?.grantRole ? "approved" : "pending"`. Update the comment block above the membership gate.

- [ ] **Step 3: Seed** — read `prisma/seed.ts` first; add an idempotent block: for each name in `ADMIN_GITHUB_USERNAMES` (read at seed time only), upsert an `Allowlist` row `{ githubUsername: name, grantRole: "president", note: "bootstrap admin (seeded)" }` and, if a `User` with that `githubUsername` already exists, update to `role: "president", status: "approved"`.
- [ ] **Step 4:** Update `.env.example` (mark seed-time-only) and the AllowlistManager copy. `grep -rn "ADMIN_GITHUB_USERNAMES"` must return only seed + docs.
- [ ] **Step 5:** Verification gate (includes `bun test lib` covering roles); commit `feat: move admin bootstrap from env var to DB allowlist grantRole`.

### Task 5: Cron → on-visit stats sync (spec §5)

**Files:**
- Modify: `prisma/schema.prisma` (add SyncRun)
- Create: `lib/sync.ts`, `lib/sync.test.ts`, `app/api/sync/route.ts`, `components/home/StatsSyncPing.tsx`
- Modify: `app/(main)/page.tsx` (mount ping)
- Delete: `app/api/cron/stats-sync/route.ts`, `app/api/cron/leaderboard/route.ts`, `.github/workflows/leaderboard-cron.yml`

**Interfaces:**
- Consumes: `syncAllStats()` from `lib/statsSync.ts`, `recomputeLeaderboardScores()` from `lib/leaderboard.ts` (both exist).
- Produces: `runStatsSyncIfStale(): Promise<"fresh" | "locked" | "synced" | "failed">`; `POST /api/sync`.

- [ ] **Step 1: Schema**

```prisma
// Single-row-per-key coordination table for the on-visit stats sync: records
// when the last full sync finished and holds a short-lived lock so concurrent
// visitors can't stampede the external APIs.
model SyncRun {
  key         String    @id
  lastRunAt   DateTime? @map("last_run_at")
  lockedUntil DateTime? @map("locked_until")

  @@map("sync_runs")
}
```

`bunx prisma migrate dev --name sync_run`.

- [ ] **Step 2: Failing tests for the pure staleness/lock predicates** — put the decision logic in exported pure helpers so it's unit-testable without a DB. `lib/sync.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { isStale, STALE_MS } from "@/lib/sync";

describe("isStale", () => {
  test("never-synced is stale", () => {
    expect(isStale(null, Date.now())).toBe(true);
  });
  test("just-synced is fresh", () => {
    const now = Date.now();
    expect(isStale(new Date(now - 1000), now)).toBe(false);
  });
  test("older than the window is stale", () => {
    const now = Date.now();
    expect(isStale(new Date(now - STALE_MS - 1), now)).toBe(true);
  });
});
```

Run `bun test lib/sync.test.ts` → fails (module missing).

- [ ] **Step 3: `lib/sync.ts`**

```ts
import { db } from "@/lib/db";
import { recomputeLeaderboardScores } from "@/lib/leaderboard";
import { syncAllStats } from "@/lib/statsSync";

// How old the last full sync may be before a visit triggers a new one.
export const STALE_MS =
  (Number(process.env.SYNC_STALE_MINUTES) || 15) * 60_000;
// Lock TTL: generously above the 60s route budget so a crashed run can't
// wedge the sync forever, but short enough to self-heal within minutes.
const LOCK_MS = 5 * 60_000;
const KEY = "stats";

export function isStale(lastRunAt: Date | null, now: number): boolean {
  return !lastRunAt || now - lastRunAt.getTime() > STALE_MS;
}

export type SyncOutcome = "fresh" | "locked" | "synced" | "failed";

// Stale-while-revalidate replacement for the old GitHub Actions cron: pages
// always serve cached DB stats; a visit only *triggers* this, never waits on
// it. The WHERE clause re-checks both staleness and the lock atomically, so
// concurrent visitors race on the DB row, not on app-level reads.
export async function runStatsSyncIfStale(): Promise<SyncOutcome> {
  const now = new Date();
  const row = await db.syncRun.upsert({
    where: { key: KEY },
    create: { key: KEY },
    update: {},
  });
  if (!isStale(row.lastRunAt, now.getTime())) return "fresh";

  const staleBefore = new Date(now.getTime() - STALE_MS);
  const acquired = await db.syncRun.updateMany({
    where: {
      key: KEY,
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
      AND: [{ OR: [{ lastRunAt: null }, { lastRunAt: { lt: staleBefore } }] }],
    },
    data: { lockedUntil: new Date(now.getTime() + LOCK_MS) },
  });
  if (acquired.count === 0) return "locked";

  try {
    await syncAllStats();
    await recomputeLeaderboardScores();
    await db.syncRun.update({
      where: { key: KEY },
      data: { lastRunAt: new Date(), lockedUntil: null },
    });
    return "synced";
  } catch (error) {
    console.error("[sync] on-visit stats sync failed:", error);
    await db.syncRun.update({
      where: { key: KEY },
      data: { lockedUntil: null },
    });
    return "failed";
  }
}
```

Run `bun test lib/sync.test.ts` → passes.

- [ ] **Step 4: Route `app/api/sync/route.ts`**

```ts
import { NextResponse } from "next/server";
import { runStatsSyncIfStale } from "@/lib/sync";

// Unauthenticated by design: the DB staleness check + lock make this
// self-rate-limiting (at most one real sync per STALE_MS window, one runner
// at a time), so an attacker can't trigger more work than a normal visitor.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const outcome = await runStatsSyncIfStale();
  return NextResponse.json(
    { outcome },
    { status: outcome === "failed" ? 500 : 200 },
  );
}
```

- [ ] **Step 5: Ping component `components/home/StatsSyncPing.tsx`**

```tsx
"use client";

import { useEffect } from "react";

// Fire-and-forget: nudges the server to refresh stats if they're stale (SWR —
// this visitor sees cached data, the next one sees fresh). Delayed past first
// paint so it never competes with hydration.
export function StatsSyncPing() {
  useEffect(() => {
    const id = window.setTimeout(() => {
      fetch("/api/sync", { method: "POST", keepalive: true }).catch(() => {});
    }, 2500);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}
```

Mount `<StatsSyncPing />` once in `app/(main)/page.tsx` output.

- [ ] **Step 6: Delete the cron surface** — remove `app/api/cron/` (both routes), `.github/workflows/leaderboard-cron.yml`; grep for `CRON_SECRET`/`CRON_URL` and scrub docs/`.env.example` (`scripts/test-api.mjs` may reference the cron routes — update it).
- [ ] **Step 7:** Verification gate; manual check via `bun run dev`: hit `POST /api/sync` twice, expect `synced` then `fresh`. Commit `feat: replace stats/leaderboard cron with on-visit stale-while-revalidate sync`.

### Task 6: next.config.ts (spec §6)

**Files:** Modify `next.config.ts`.

- [ ] **Step 1:** Find the Supabase storage hostname (`grep -rn "supabase" .env.example lib/supabase* utils 2>/dev/null`, look for the public URL env) and every remote image host actually used (`grep -rn "https://" app components --include="*.tsx" | grep -i "img\|image\|avatar" | head -30`).
- [ ] **Step 2:** Write the config:

```ts
import type { NextConfig } from "next";

const securityHeaders = [
  // 2y HSTS incl. subdomains; safe because the site is HTTPS-only on Vercel.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      // + the project's Supabase storage host discovered in Step 1
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "react-icons"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
```

(If the login page or any embed relies on being framed — it doesn't today — X-Frame-Options would break it; verify with a grep for `iframe`.)

- [ ] **Step 3:** Verification gate; confirm headers appear via `curl -sI localhost:3000` under `bun run dev` (dev serves `headers()` too). Commit `feat: harden next.config (images, security headers, package-import optimization)`.

### Task 7: Orbit pixel trails (spec §7, request Task 1)

**Files:**
- Create: `lib/orbit-trail.ts`, `lib/orbit-trail.test.ts`
- Modify: `components/home/PixelLoadingScreen.tsx` (post-restructure home of the hero; if it stayed in `components/ui/`, modify there)

**Interfaces:**
- Produces (lib/orbit-trail.ts):

```ts
export interface TrailParticle { x: number; y: number; bornAt: number; back: boolean }
export const TRAIL_MAX_AGE_MS = 500;
export function trailAlpha(ageMs: number): number;      // 4 discrete steps 0.5→0, 0 when expired
export function trailSize(ageMs: number, cell: number): number; // steps down with age
export function snapToGrid(v: number, cell: number): number;
export function shouldEmit(distPx: number, deltaMs: number): boolean; // > ~1.4× orbital baseline speed
```

- [ ] **Step 1: Failing tests** (`bun test lib/orbit-trail.test.ts`):

```ts
import { describe, expect, test } from "bun:test";
import {
  TRAIL_MAX_AGE_MS, shouldEmit, snapToGrid, trailAlpha, trailSize,
} from "@/lib/orbit-trail";

describe("trailAlpha", () => {
  test("newborn is strongest step", () => expect(trailAlpha(0)).toBeCloseTo(0.5));
  test("decays in discrete steps", () => {
    expect(trailAlpha(130)).toBeLessThan(trailAlpha(0));
    expect(trailAlpha(130)).toBe(trailAlpha(200)); // same step → same alpha
  });
  test("expired is 0", () => expect(trailAlpha(TRAIL_MAX_AGE_MS + 1)).toBe(0));
});
describe("snapToGrid", () => {
  test("snaps to cell multiples", () => expect(snapToGrid(13, 8)).toBe(8));
});
describe("shouldEmit", () => {
  // baseline orbital speed ≈0.14 px/ms; calm orbit in a 16ms frame ≈2.3px
  test("calm orbit does not emit", () => expect(shouldEmit(2.3, 16)).toBe(false));
  test("fling emits", () => expect(shouldEmit(12, 16)).toBe(true));
});
describe("trailSize", () => {
  test("shrinks with age", () =>
    expect(trailSize(400, 8)).toBeLessThan(trailSize(0, 8)));
});
```

- [ ] **Step 2: Implement `lib/orbit-trail.ts`**

```ts
// Pure math for the hero orbit's 8-bit ghost trail. Kept out of the component
// so the stepped-decay behaviour is unit-testable without canvas/rAF.

export interface TrailParticle {
  x: number;
  y: number;
  bornAt: number;
  back: boolean;
}

export const TRAIL_MAX_AGE_MS = 500;
const ALPHA_STEPS = 4; // discrete 8-bit decay, not a smooth fade
const PEAK_ALPHA = 0.5;

// Baseline orbital speed: ellipse circumference ≈ 2π·avg(410,135) ≈ 1712 px
// per 12000 ms period ≈ 0.143 px/ms. Emit only when meaningfully faster —
// drag-flings, shatter, reform — never during calm orbiting.
const BASELINE_PX_PER_MS = 0.143;
const EMIT_FACTOR = 1.4;

export function trailAlpha(ageMs: number): number {
  if (ageMs >= TRAIL_MAX_AGE_MS || ageMs < 0) return 0;
  const step = Math.floor((ageMs / TRAIL_MAX_AGE_MS) * ALPHA_STEPS);
  return PEAK_ALPHA * (1 - step / ALPHA_STEPS);
}

export function trailSize(ageMs: number, cell: number): number {
  if (ageMs >= TRAIL_MAX_AGE_MS) return 0;
  const step = Math.floor((ageMs / TRAIL_MAX_AGE_MS) * ALPHA_STEPS);
  return cell * (1.5 - (step / ALPHA_STEPS) * 0.75);
}

export function snapToGrid(v: number, cell: number): number {
  return Math.round(v / cell) * cell;
}

export function shouldEmit(distPx: number, deltaMs: number): boolean {
  if (deltaMs <= 0) return false;
  return distPx / deltaMs > BASELINE_PX_PER_MS * EMIT_FACTOR;
}
```

Run tests → pass.

- [ ] **Step 3: Wire into `PixelLoadingScreen`**
  - Refs: `trailsRef = useRef<Record<"github" | "leetcode" | "linkedin", TrailParticle[]>>({github: [], leetcode: [], linkedin: []})`, `lastTrailPosRef` (same keys, `{x,y} | null`), `reducedMotionRef` (set once from `matchMedia("(prefers-reduced-motion: reduce)")` in an effect).
  - **Emission** — in `updatePositions` (the physics rAF), after the new positions are known (both the calm `targetPositions` branch and the shattered branch), for each planet: `dist = hypot(newX - last.x, newY - last.y)`; if `!reducedMotionRef.current && shouldEmit(dist, delta)` push `{x: newX, y: newY, bornAt: now, back: z <= 0}` and cap the buffer at 40 (`shift()` overflow). Always update `lastTrailPosRef`.
  - **Render** — in `drawOrbitRing`: the existing `lastOpacity/lastScale` early-return must ALSO redraw whenever any trail particle is alive; add `const trailsAlive = Object.values(trailsRef.current).some(a => a.length > 0)` to the skip condition. After stroking each ring, draw that canvas's particles (back canvas: `p.back === true`, front: `false`): prune expired, then per particle with planet color (github `163,113,247`, leetcode `255,161,22`, linkedin `56,189,248`):

```ts
const age = now - p.bornAt;
const alpha = trailAlpha(age);
if (alpha <= 0) continue;
const size = trailSize(age, 8);
ctx.fillStyle = `rgba(${color}, ${alpha * ringOpacity})`;
ctx.fillRect(
  snapToGrid(cx + p.x, 8) - size / 2,
  snapToGrid(cy + p.y, 8) - size / 2,
  size,
  size,
);
```

  (`imageSmoothingEnabled = false`; no shadowBlur on trails — squares stay crisp. Note during shatter `ringOpacity` is 0 while trails must still show, so use `Math.max(ringOpacity, phys.isShattered ? 1 : ringOpacity)` — i.e. trails ignore the ring fade during shatter; also skip the `ringOpacity <= 0` early-clear-and-return when trails are alive.)
- [ ] **Step 4: Manual verification** — `bun run dev`, drag-fling the orbit: trails must appear on fling, persist through the scatter drift only while moving fast, reappear during the reform pull-in, and never appear during calm orbiting or icon hover-pause. Check with DevTools "Emulate prefers-reduced-motion" that no trails emit.
- [ ] **Step 5:** Verification gate; commit `feat: 8-bit ghost trails on orbit fling and reform`.

### Task 8: Security audit (spec §8, request Task 9)

**Files:** Findings drive edits; expected hot spots: `app/api/upload/route.ts`, `app/api/events/[id]/registrations.csv/route.ts`, `app/api/admin/**`, `app/actions/*.ts`, `package.json` (`knip` in prod deps), `lib/forms.ts`.

- [ ] **Step 1: Enumerate + review every mutation surface** — for each route in `app/api/**` and each server action: (a) is there an auth check, (b) is the *role* checked for admin surfaces (the proxy gates `/admin` pages but NOT `/api/admin/*` — verify each route re-checks), (c) is input validated/bounded, (d) does output leak tokens/emails to non-admins.
- [ ] **Step 2: Specific checks** — upload route: content-type + size limits + path traversal in filenames; CSV export: prefix `=`, `+`, `-`, `@` cells (formula injection); `lib/forms.ts` responses: unbounded string/array sizes; all `findFirst` on user-supplied ids scoped to the session user where applicable; no secret ever serialized into a client component's props.
- [ ] **Step 3: Dependency hygiene** — move `knip` out of prod deps (or drop it); `bun pm ls` sanity pass; confirm `ws`, `pg` etc. are actually used or remove.
- [ ] **Step 4:** Fix findings (each its own focused change within the commit), document non-fixable items (e.g. "rotate X") in the commit body. Verification gate; commit `fix: security audit hardening across API routes and actions`.

### Task 9: Performance + UI polish (spec §9, request Task 10)

**Files:** discovered; expected: `app/(main)/page.tsx`, `components/home/*`, `app/admin/**`, `app/layout.tsx`.

- [ ] **Step 1: Measure first** — `bunx next build` output: note route JS sizes before/after; identify client components > ~30 kB gz in the landing path.
- [ ] **Step 2: Perf changes** — `next/dynamic` for below-the-fold heavy client components (carousel, modals, sections not needed for first paint — keep the hero eager); confirm remote images go through `next/image` where they're photos (pixel-art assets keep `<img>`+`pixelated` with explicit width/height); check `react-icons` imports are per-icon (`react-icons/si` style) not barrel.
- [ ] **Step 3: UI consistency pass** — inventory admin surfaces still using plain shadcn (`components/ui/{button,card,input,select,tabs,dialog}.tsx`) where an 8-bit twin exists (`8bit-*.tsx`); swap where the pixel variant is a drop-in; align spacing/heading treatment with `PixelPageHeader`/`PixelPanel`. No redesigns.
- [ ] **Step 4:** Verification gate + before/after build-size note in the commit body; commit `perf: bundle trims + admin 8-bit consistency polish`.

### Task 10: Finish

- [ ] Full gate one last time (`biome ci`, `tsc`, `bun test lib`, `next build`), re-grep for `ADMIN_GITHUB_USERNAMES|CRON_SECRET|_sections|eslint`, update `README`/`.env.example` remnants, then use superpowers:finishing-a-development-branch (push + PR to `main`).
