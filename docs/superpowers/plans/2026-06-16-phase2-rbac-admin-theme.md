# Phase 2: RBAC Tiers + Admin Theme — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the binary admin/member role with a four-tier model (President / Vice President / Core Member / Member), gate all admin surfaces on the three admin tiers, restrict role changes to President, seed Muaz → President, and restyle the admin panel to the public 8-bit theme.

**Architecture:** A single edge-safe `lib/roles.ts` holds the role union and the two authorization predicates (`canAccessAdmin`, `canManageRoles`); every gate across proxy, layouts, pages, and API routes calls them. A hand-written Postgres migration swaps the enum and maps existing `admin → president`. The admin UI opts into the `[data-v2]` pixel theme and the shared `Tactical*` primitives are restyled to the 8-bit look.

**Tech Stack:** Next.js 16, NextAuth v5 (JWT), Prisma 7 / Postgres, Tailwind v4, `bun test` for the predicates.

**DB note:** The migration + seed need a live DB. This plan writes them; the developer runs `bunx prisma migrate deploy` then `bun prisma/seed.ts`.

---

### Task 1: `lib/roles.ts` authorization predicates — TDD

**Files:** Create `lib/roles.ts`, `lib/roles.test.ts`

- [ ] **Step 1: Failing test**

```ts
// lib/roles.test.ts
import { test, expect } from "bun:test";
import { canAccessAdmin, canManageRoles, isRole, ROLES } from "./roles";

test("admin tiers can access admin, member cannot", () => {
  expect(canAccessAdmin("president")).toBe(true);
  expect(canAccessAdmin("vice_president")).toBe(true);
  expect(canAccessAdmin("core_member")).toBe(true);
  expect(canAccessAdmin("member")).toBe(false);
});

test("canAccessAdmin rejects nullish / unknown", () => {
  expect(canAccessAdmin(null)).toBe(false);
  expect(canAccessAdmin(undefined)).toBe(false);
  expect(canAccessAdmin("admin")).toBe(false); // legacy value gone
});

test("only president can manage roles", () => {
  expect(canManageRoles("president")).toBe(true);
  expect(canManageRoles("vice_president")).toBe(false);
  expect(canManageRoles("core_member")).toBe(false);
  expect(canManageRoles("member")).toBe(false);
  expect(canManageRoles(null)).toBe(false);
});

test("isRole narrows valid values only", () => {
  expect(isRole("president")).toBe(true);
  expect(isRole("member")).toBe(true);
  expect(isRole("admin")).toBe(false);
  expect(isRole(42)).toBe(false);
});

test("ROLES lists all four tiers", () => {
  expect(ROLES).toEqual(["president", "vice_president", "core_member", "member"]);
});
```

- [ ] **Step 2: Run — expect fail** — `bun test lib/roles.test.ts` → cannot find module.

- [ ] **Step 3: Implement**

```ts
// lib/roles.ts
// Single source of truth for role tiers + authorization predicates. No imports
// (DB-free) so the Edge runtime in proxy.ts can use it. Mirrors the Prisma
// `Role` enum in prisma/schema.prisma — keep the two in sync.

export const ROLES = [
  "president",
  "vice_president",
  "core_member",
  "member",
] as const;

export type Role = (typeof ROLES)[number];

// The three tiers allowed into the admin panel. `member` is excluded.
export const ADMIN_ROLES: readonly Role[] = [
  "president",
  "vice_president",
  "core_member",
];

export const ROLE_LABELS: Record<Role, string> = {
  president: "President",
  vice_president: "Vice President",
  core_member: "Core Member",
  member: "Member",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** May this role open the admin panel / call admin APIs? */
export function canAccessAdmin(role: string | null | undefined): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}

/** May this role change other users' role tiers? President only. */
export function canManageRoles(role: string | null | undefined): boolean {
  return role === "president";
}
```

- [ ] **Step 4: Run — expect pass** — `bun test lib/roles.test.ts` (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/roles.ts lib/roles.test.ts
git commit -m "feat(rbac): add role tiers + canAccessAdmin/canManageRoles predicates"
```

---

### Task 2: Prisma enum + migration (developer runs migration)

**Files:** Modify `prisma/schema.prisma`; Create `prisma/migrations/20260616130000_rbac_tiers/migration.sql`

- [ ] **Step 1: Edit the enum** in `prisma/schema.prisma`

```prisma
enum Role {
  president
  vice_president
  core_member
  member
}
```

The `@default(member)` on `User.role` stays valid (member is still a member).

- [ ] **Step 2: Write the migration SQL** (hand-written — Prisma's auto-diff would try to DROP the in-use `admin` value and fail)

```sql
-- prisma/migrations/20260616130000_rbac_tiers/migration.sql
-- Swap the Role enum from {admin, member} to the four-tier model, mapping
-- existing admins to president. Postgres can't drop an in-use enum value, so we
-- rename the old type, create the new one, convert the column, then drop the old.

ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM ('president', 'vice_president', 'core_member', 'member');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role"
  USING (
    CASE "role"::text
      WHEN 'admin' THEN 'president'::"Role"
      ELSE 'member'::"Role"
    END
  );

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'member';

DROP TYPE "Role_old";
```

- [ ] **Step 3: Regenerate the client + typecheck (no DB needed)**

Run: `bunx prisma generate`
Expected: client regenerates with the new `Role` enum. Then `bunx tsc --noEmit` (errors expected until Tasks 3–9 update consumers — that's fine; this step just confirms the schema parses and generates).

- [ ] **Step 4: Commit (schema + migration)**

```bash
git add prisma/schema.prisma prisma/migrations/20260616130000_rbac_tiers
git commit -m "feat(rbac): four-tier Role enum + migration mapping admin->president"
```

> **Developer action (later, with DB):** `bunx prisma migrate deploy`

---

### Task 3: Auth wiring (`lib/auth.ts`)

**Files:** Modify `lib/auth.ts`

- [ ] **Step 1: Import the Role type** — add near the top imports:

```ts
import type { Role } from "@/lib/roles";
```

- [ ] **Step 2: Replace the two `"admin" | "member"` unions** in the `declare module "next-auth"` block — both `Session.user.role` and `User.role` become `role: Role;`.

- [ ] **Step 3: Bootstrap grants President** — in `customAdapter.createUser`, change:

```ts
        role: isBootstrapAdmin(u.githubUsername) ? "president" : "member",
```

- [ ] **Step 4: jwt callback** — change the bootstrap elevation line:

```ts
        if (isBootstrapAdmin((user as { githubUsername?: string }).githubUsername)) {
          token.role = "president";
        }
```

- [ ] **Step 5: session callback** — change the cast:

```ts
      session.user.role = token.role as Role;
```

- [ ] **Step 6: profile() default** — the GitHub `profile()` returns `role: "member"`; leave as-is (valid). Typecheck: `bunx tsc --noEmit` (consumer errors still expected until later tasks).

- [ ] **Step 7: Commit**

```bash
git add lib/auth.ts
git commit -m "feat(rbac): auth types + bootstrap president elevation"
```

---

### Task 4: Proxy admin gate (`proxy.ts`)

**Files:** Modify `proxy.ts`

- [ ] **Step 1: Import + replace the gate**

Add import: `import { canAccessAdmin } from "@/lib/roles";`

Replace:

```ts
    if (path.startsWith("/admin") && role !== "admin") {
```

with:

```ts
    if (path.startsWith("/admin") && !canAccessAdmin(role)) {
```

- [ ] **Step 2: Commit**

```bash
git add proxy.ts
git commit -m "feat(rbac): proxy gates /admin on canAccessAdmin"
```

---

### Task 5: Admin-gate checks → `canAccessAdmin` (pages, layout, admin APIs)

These all currently redirect/403 when `role !== "admin"`. Replace each with `!canAccessAdmin(session?.user?.role)` (or `!canAccessAdmin(session.user.role)` where session is already checked), and add `import { canAccessAdmin } from "@/lib/roles";` to each file.

**Files + lines (redirect pages):**
- `app/admin/layout.tsx:23`
- `app/admin/page.tsx:11`
- `app/admin/members/page.tsx:10`
- `app/admin/events/page.tsx:11`
- `app/admin/events/new/page.tsx:13`
- `app/admin/events/[id]/page.tsx:17`
- `app/admin/leaderboard/page.tsx:9`
- `app/admin/projects/page.tsx:9`

Pattern — replace `if (session?.user?.role !== "admin") {` with `if (!canAccessAdmin(session?.user?.role)) {`.

**Files + lines (server action — throws):**
- `app/admin/projects/actions.ts:9` and `:20` — replace `if (session?.user?.role !== "admin") throw ...` with `if (!canAccessAdmin(session?.user?.role)) throw ...`.

**Files + lines (API routes — 403):**
- `app/api/admin/allowlist/route.ts:12`, `:25`
- `app/api/admin/allowlist/[id]/route.ts:15`
- `app/api/admin/config/weights/route.ts:8`, `:32`
- `app/api/admin/members/[id]/refresh/route.ts:10`
- `app/api/admin/members/[id]/route.ts:11`
- `app/api/admin/projects/[id]/approve/route.ts:10`

Pattern — replace `if (!session || session.user.role !== "admin") {` with `if (!session || !canAccessAdmin(session.user.role)) {`.

- [ ] **Step 1:** Edit every file above, adding the import and swapping the check.
- [ ] **Step 2:** `bunx tsc --noEmit` — expect only remaining errors in Task 6/7 files.
- [ ] **Step 3: Commit**

```bash
git add app/admin app/api/admin
git commit -m "feat(rbac): gate all admin pages, actions, and APIs on canAccessAdmin"
```

---

### Task 6: Capability checks in feature routes → `canAccessAdmin`

These use admin status to grant elevated capability (manage events, edit any project, view others' stats). Admin tiers should all qualify. Add the import and replace.

- `app/api/events/[id]/route.ts:24`, `:50` — `!canAccessAdmin(session.user.role)`
- `app/api/events/[id]/attendance/route.ts:12` — `if (!canAccessAdmin(session?.user?.role)) {`
- `app/api/events/[id]/feedback/route.ts:46` — `if (!canAccessAdmin(session.user.role)) return ...`
- `app/api/events/route.ts:27` — `const isAdmin = canAccessAdmin(session.user.role);`
- `app/api/projects/[id]/route.ts:23` — `project.leadId !== session.user.id && !canAccessAdmin(session.user.role)`
- `app/api/projects/[id]/members/route.ts:10` — `if (canAccessAdmin(role)) return true;`
- `app/api/stats/github/[userId]/route.ts:24` — `const isAdmin = canAccessAdmin(session.user.role);`
- `app/api/stats/lc/[userId]/route.ts:23` — `const isAdmin = canAccessAdmin(session.user.role);`
- `app/(main)/page.tsx:47` — `const isAdmin = canAccessAdmin(session?.user?.role);`

- [ ] **Step 1:** Edit each (add `import { canAccessAdmin } from "@/lib/roles";`).
- [ ] **Step 2:** `bunx tsc --noEmit` — expect only Task 7/8 errors.
- [ ] **Step 3: Commit**

```bash
git add app/api app/\(main\)/page.tsx
git commit -m "feat(rbac): feature routes grant admin capability to all admin tiers"
```

---

### Task 7: Role-change endpoint — President-only + enum validation

**Files:** Modify `app/api/admin/members/[id]/route.ts`

Currently any admin can set `role` to an unvalidated string. Now: any admin tier may toggle `isVisible`/`bio`, but a `role` change requires President and a valid tier.

- [ ] **Step 1: Edit the PATCH handler** — replace the body-handling block:

```ts
import { isRole, canManageRoles } from "@/lib/roles";
// ...
    const { isVisible, role, bio } = body;

    const updateData: Prisma.UserUpdateInput = {};
    if (isVisible !== undefined) updateData.isVisible = Boolean(isVisible);
    if (bio !== undefined) updateData.bio = String(bio);

    if (role !== undefined) {
      if (!canManageRoles(session.user.role)) {
        return NextResponse.json(
          { error: "Only the President may change roles" },
          { status: 403 }
        );
      }
      if (!isRole(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      // Don't let the President strip their own management ability and lock out.
      if (id === session.user.id && role !== "president") {
        return NextResponse.json(
          { error: "You cannot demote yourself from President" },
          { status: 400 }
        );
      }
      updateData.role = role;
    }
```

(The existing `canAccessAdmin` gate from Task 5 still guards the top of the handler.)

- [ ] **Step 2:** `bunx tsc --noEmit`.
- [ ] **Step 3: Commit**

```bash
git add app/api/admin/members/\[id\]/route.ts
git commit -m "feat(rbac): role changes require President + valid tier"
```

---

### Task 8: MemberTable — tier selector (President-only)

**Files:** Modify `app/admin/members/MemberTable.tsx`

Replace the admin/member toggle with a tier `<select>` that's enabled only for the President; other admins see the role read-only. Add `currentUserRole` to props.

- [ ] **Step 1: Update props + call site**

In `MemberTableProps` add `currentUserRole: string;`. In `app/admin/members/page.tsx`, pass it: `<MemberTable initialMembers={...} currentUserId={session!.user.id} currentUserRole={session!.user.role} />` (page already has `session`).

- [ ] **Step 2: Replace `handleRoleToggle` with a setter**

```ts
import { ROLES, ROLE_LABELS, canManageRoles, type Role } from "@/lib/roles";
// ...
  const canEdit = canManageRoles(currentUserRole);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    if (userId === currentUserId && newRole !== "president") {
      setFeedback({
        message: "SECURITY_BLOCK: YOU_CANNOT_DEMOTE_YOURSELF_FROM_PRESIDENT",
        type: "error",
      });
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/members/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
        setFeedback({
          message: `CLEARANCE_UPDATED: ${ROLE_LABELS[newRole].toUpperCase()}`,
          type: "success",
        });
      } catch (err) {
        setFeedback({
          message: "CLEARANCE_FAILURE: " + (err instanceof Error ? err.message : "UNKNOWN"),
          type: "error",
        });
      }
    });
  };
```

- [ ] **Step 3: Replace the ROLE column render + ACTIONS column**

ROLE column shows the tier label as a chip. ACTIONS column: when `canEdit`, render a native `<select>` of `ROLES` (labels from `ROLE_LABELS`) calling `handleRoleChange`; otherwise render a read-only dash. Example ACTIONS render:

```tsx
      render: (m: Member) =>
        canEdit ? (
          <select
            aria-label={`Set role for ${m.name ?? m.id}`}
            value={m.role}
            disabled={isPending}
            onChange={(e) => handleRoleChange(m.id, e.target.value as Role)}
            className="retro border-2 border-white/20 bg-[#0a0a0a] px-2 py-1 text-[10px] text-white focus:border-[#22c55e] focus:outline-none"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-[10px] text-zinc-600">LOCKED</span>
        ),
```

And the ROLE column render uses `ROLE_LABELS[m.role as Role] ?? m.role` for display.

- [ ] **Step 4:** `bunx tsc --noEmit` + `bun run lint`.
- [ ] **Step 5: Commit**

```bash
git add app/admin/members/MemberTable.tsx app/admin/members/page.tsx
git commit -m "feat(rbac): tier selector in MemberTable, editable only by President"
```

---

### Task 9: Member counts by tier (`app/admin/members/page.tsx`)

**Files:** Modify `app/admin/members/page.tsx`

- [ ] **Step 1:** Replace the binary counts:

```ts
  const adminCount = users.filter((u) => canAccessAdmin(u.role)).length;
  const memberCount = users.filter((u) => u.role === "member").length;
```

Add `import { canAccessAdmin } from "@/lib/roles";` (if not already from Task 5). The header labels referencing these counts stay (e.g. "ADMINS" now means admin-tier staff).

- [ ] **Step 2:** Commit (folded into Task 8 commit is fine if done together).

---

### Task 10: Seed Muaz → President

**Files:** Create `prisma/seed.ts`

- [ ] **Step 1: Write the seed**

```ts
// prisma/seed.ts
// Idempotent: elevate the developer account to President so the lockout is
// resolved. Run with: `bun prisma/seed.ts` (needs DATABASE_URL).
// NOTE: design target is Core Member; set to President for testing per request —
// change PRESIDENT_LOGIN's target role to "core_member" later.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const LOGIN = "MuazTPM-YT";

async function main() {
  const result = await db.user.updateMany({
    where: { githubUsername: { equals: LOGIN, mode: "insensitive" } },
    data: { role: "president" },
  });
  console.log(`Seed: set ${result.count} user(s) matching '${LOGIN}' -> president`);
  if (result.count === 0) {
    console.log("(No row yet — sign in once, then re-run the seed.)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
```

- [ ] **Step 2: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(rbac): seed script to elevate Muaz to President"
```

> **Developer action (after migrate deploy):** `bun prisma/seed.ts`

---

### Task 11: Admin theme → 8-bit alignment

**Files:** Modify `app/admin/layout.tsx`, `components/ui/TacticalCard.tsx`, `TacticalButton.tsx`, `TacticalTable.tsx`, `TacticalFeedback.tsx`, `TacticalLoading.tsx`, `components/layout/SidebarBrand.tsx`; spot-touch admin page header accent colors.

Approach: opt the admin tree into `[data-v2]` (enables the `.retro` pixel font scope, square-corner revert, `.pixelated`), then restyle the shared `Tactical*` primitives — which the pages compose — to the public palette: green `#22c55e` accent, white/zinc text on near-black surfaces, chunky pixel borders (`border-2`/`border-4`/`border-white/10`), `.retro` font on labels/buttons, and `dot-grid-bg` where the tactical noise was. Recolor page-level accent classes (`text-emerald-500`, `text-blue-500`, `text-purple-500`, `text-red-500` decorative) toward the green accent / white for consistency.

- [ ] **Step 1:** In `app/admin/layout.tsx`, add `data-v2` to the root wrapper div and switch the noise/grain `<main>` background to `dot-grid-bg`; restyle the sidebar nav links + session card + TERMINATE button with `.retro`, pixel borders, and the green accent. Keep the nav structure/links.

- [ ] **Step 2:** Read each `Tactical*` component and restyle its internal Tailwind classes to the 8-bit palette (pixel borders, `.retro` headings/labels, green accent, near-black surfaces). Keep their props/API identical so pages don't change.

- [ ] **Step 3:** In `app/admin/page.tsx`, `members/page.tsx`, `settings/page.tsx`, `leaderboard/page.tsx`, `events/*`, `projects/page.tsx`: recolor decorative accent classes to the green accent / white-zinc and add `.retro` to small tracking labels. Do not change data/logic.

- [ ] **Step 4: Verify** — `bunx tsc --noEmit`, `bun run lint`, then `bun run dev` and visually confirm the admin panel reads as 8-bit and matches the public site. (Requires signing in as an admin tier.)

- [ ] **Step 5: Commit**

```bash
git add app/admin components/ui/Tactical*.tsx components/layout/SidebarBrand.tsx
git commit -m "feat(admin): restyle admin panel to the 8-bit pixel theme"
```

---

### Task 12: Phase verification

- [ ] `bun test lib` — all pass (incl. roles).
- [ ] `bunx tsc --noEmit` — clean.
- [ ] `bun run lint` — clean.
- [ ] Render smoke: `bun run dev`, confirm `/` renders 200 and `/admin` redirects an anonymous/member visitor (proxy log shows redirect).
- [ ] Hand off to developer: run `bunx prisma migrate deploy` then `bun prisma/seed.ts`; then verify in-app that a `member` is denied `/admin` (all three layers) and only President sees the role selector.

---

## Self-Review

- **Spec coverage:** enum expand (T2); `lib/roles.ts` single source (T1); canAccessAdmin gating proxy/layout/pages/APIs (T4–T6); President-only role change UI + server (T7–T8); Muaz → President seed (T10, President per request); admin 8-bit theme (T11). `member` excluded everywhere via `canAccessAdmin`. Covered. (Phase 3 adds the `status`/approval-queue — intentionally not here.)
- **Placeholder scan:** none — predicate/migration/auth/seed code is complete; the repetitive gate edits (T5/T6) list every file:line with the exact replacement pattern.
- **Type consistency:** `Role` from `lib/roles.ts` reused in `lib/auth.ts` (T3) and `MemberTable` (T8); `canAccessAdmin`/`canManageRoles`/`isRole`/`ROLES`/`ROLE_LABELS` signatures consistent across T1/T4–T8.
- **Risk:** enum migration is destructive-ish — mapping is explicit (`admin→president`, else `member`); existing members preserved. Theme task is visual/iterative — expect a feedback pass.
