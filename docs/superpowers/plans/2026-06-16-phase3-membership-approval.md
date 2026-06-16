# Phase 3: Membership Approval Queue — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** New members can sign in + onboard but land in PENDING and get member access only after an admin approves; rejected users can't sign in (but can still browse publicly); admins (any admin tier) review requests in a new Access Requests tab. Allowlist remains the first gate (double-gate).

**Architecture:** A `User.status` enum (pending/approved/rejected). The `signIn` callback adds a status gate (rejected denied) on top of the allowlist. Member write-actions are gated **server-side against the live DB status** (not the possibly-stale JWT) via `lib/access.ts#isApproved`. Pending users are excluded from DB-driven public listings (leaderboard) and shown a banner. The existing `PATCH /api/admin/members/[id]` (already `canAccessAdmin`-gated) is extended to accept `status`, so all admin tiers can approve/reject; only role changes stay President-only.

**DB note:** migration written here, run by developer (`bunx prisma migrate deploy`).

---

### Task 1: `lib/status.ts` — approval status type + helpers (TDD)

**Files:** Create `lib/status.ts`, `lib/status.test.ts`

- [ ] **Step 1: Failing test**

```ts
// lib/status.test.ts
import { test, expect } from "bun:test";
import { APPROVAL_STATUSES, isApprovalStatus, STATUS_LABELS } from "./status";

test("APPROVAL_STATUSES lists the three states", () => {
  expect(APPROVAL_STATUSES).toEqual(["pending", "approved", "rejected"]);
});

test("isApprovalStatus narrows valid values only", () => {
  expect(isApprovalStatus("pending")).toBe(true);
  expect(isApprovalStatus("approved")).toBe(true);
  expect(isApprovalStatus("rejected")).toBe(true);
  expect(isApprovalStatus("banned")).toBe(false);
  expect(isApprovalStatus(7)).toBe(false);
});

test("STATUS_LABELS has a label per status", () => {
  expect(STATUS_LABELS.pending).toBe("Pending");
  expect(STATUS_LABELS.approved).toBe("Approved");
  expect(STATUS_LABELS.rejected).toBe("Rejected");
});
```

- [ ] **Step 2: Run — fail** — `bun test lib/status.test.ts`.

- [ ] **Step 3: Implement**

```ts
// lib/status.ts
// Membership approval status — edge-safe (no imports). Mirrors the Prisma
// `ApprovalStatus` enum; keep the two in sync.

export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export function isApprovalStatus(value: unknown): value is ApprovalStatus {
  return (
    typeof value === "string" &&
    (APPROVAL_STATUSES as readonly string[]).includes(value)
  );
}
```

- [ ] **Step 4: Run — pass.** **Step 5: Commit** `feat(approval): add ApprovalStatus type + helpers`.

---

### Task 2: Prisma enum + `User.status` + migration

**Files:** Modify `prisma/schema.prisma`; Create `prisma/migrations/20260616140000_membership_status/migration.sql`

- [ ] **Step 1: schema** — add enum + field on `User` (after `role`):

```prisma
enum ApprovalStatus {
  pending
  approved
  rejected
}
```
```prisma
  status          ApprovalStatus @default(pending)
```

- [ ] **Step 2: migration SQL**

```sql
-- prisma/migrations/20260616140000_membership_status/migration.sql
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE "users"
  ADD COLUMN "status" "ApprovalStatus" NOT NULL DEFAULT 'pending';

-- Grandfather everyone already in: existing members stay approved.
UPDATE "users" SET "status" = 'approved';
```

- [ ] **Step 3:** `bunx prisma generate` then `bunx tsc --noEmit` (consumer errors expected until later tasks).
- [ ] **Step 4: Commit** `feat(approval): User.status enum + migration (existing users approved)`.

> **Developer action:** `bunx prisma migrate deploy`.

---

### Task 3: Auth — status in types, createUser, profile, signIn gate, callbacks

**Files:** Modify `lib/auth.ts`

- [ ] **Step 1: import** `import type { ApprovalStatus } from "@/lib/status";`
- [ ] **Step 2: augment types** — add `status: ApprovalStatus;` to both `Session["user"]` and `User` interfaces.
- [ ] **Step 3: createUser** — bootstrap admins are auto-approved; everyone else pending:

```ts
        role: isBootstrapAdmin(u.githubUsername) ? "president" : "member",
        status: isBootstrapAdmin(u.githubUsername) ? "approved" : "pending",
```

- [ ] **Step 4: profile()** — add `status: "pending",` to the returned object (type completeness; createUser/DB is the real source).
- [ ] **Step 5: rejected sign-in gate** — add a helper and call it in `signIn`:

```ts
async function isRejected(
  githubUsername?: string | null,
  email?: string | null
): Promise<boolean> {
  const u = githubUsername?.toLowerCase() || null;
  const e = email?.toLowerCase() || null;
  if (!u && !e) return false;
  const or: object[] = [];
  if (u) or.push({ githubUsername: { equals: u, mode: "insensitive" } });
  if (e) or.push({ email: { equals: e, mode: "insensitive" } });
  const row = await db.user.findFirst({ where: { OR: or }, select: { status: true } });
  return row?.status === "rejected";
}
```

In `signIn` callback, after computing githubUsername/email:

```ts
      if (!(await isAllowedToSignIn(githubUsername, email))) return false;
      if (await isRejected(githubUsername, email)) return false;
      return true;
```

- [ ] **Step 6: jwt** — in the `if (user)` block add `token.status = user.status;` and force `token.status = "approved"` inside the bootstrap branch (alongside `token.role = "president"`).
- [ ] **Step 7: session** — add `session.user.status = token.status as ApprovalStatus;`
- [ ] **Step 8:** `bunx tsc --noEmit`. **Commit** `feat(approval): double-gate sign-in + status in session`.

---

### Task 4: `lib/access.ts` — live approval check

**Files:** Create `lib/access.ts`

```ts
// lib/access.ts
// Server-side, live approval check against the DB (not the JWT, which can be
// stale after an admin approves). Used to gate member write-actions.
import { db } from "@/lib/db";

export async function isApproved(userId: string): Promise<boolean> {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  return u?.status === "approved";
}
```

- [ ] **Commit** `feat(approval): isApproved live-status helper`.

---

### Task 5: Gate member write-actions (403 unless approved)

Add `import { isApproved } from "@/lib/access";` and, right after the auth check, `if (!(await isApproved(session.user.id))) return NextResponse.json({ error: "Pending approval" }, { status: 403 });`

**Files + handlers:**
- `app/api/events/[id]/register/route.ts` — `POST` (not DELETE).
- `app/api/events/[id]/feedback/route.ts` — the feedback-submit `POST` (after its session check, before insert).
- `app/api/projects/route.ts` — `POST`.
- `app/api/projects/[id]/members/route.ts` — the join/add `POST` (after auth; admins still allowed via existing `isAuthorized`, but a self-join by a pending member is blocked).

- [ ] Edit each; `bunx tsc --noEmit`. **Commit** `feat(approval): block member write-actions for non-approved users`.

---

### Task 6: Exclude pending users from the leaderboard

**Files:** Modify `app/(main)/page.tsx`

- [ ] In the `db.leaderboardScore.findMany` query, change `where: { user: { isVisible: true } }` to `where: { user: { isVisible: true, status: "approved" } }`. **Commit** (fold into Task 5 or its own).

---

### Task 7: Pending banner

**Files:** Create `app/(main)/_sections/PendingBanner.tsx`; modify `app/(main)/layout.tsx`

- [ ] **Step 1: component**

```tsx
// app/(main)/_sections/PendingBanner.tsx
export function PendingBanner() {
  return (
    <div className="relative z-40 border-b-2 border-[#22c55e]/40 bg-[#22c55e]/10 px-6 py-3 text-center">
      <span className="retro text-[10px] leading-relaxed text-[#22c55e]">
        MEMBERSHIP PENDING APPROVAL — SOME ACTIONS ARE LOCKED UNTIL AN ADMIN VERIFIES YOU.
      </span>
    </div>
  );
}
```

- [ ] **Step 2: render** in `app/(main)/layout.tsx` inside the `relative z-2` wrapper, above `<V2Header />`, when pending:

```tsx
{session?.user?.status === "pending" && <PendingBanner />}
```

(add the import). **Commit** `feat(approval): pending-approval banner`.

---

### Task 8: Access Requests admin tab

**Files:** Create `app/admin/requests/page.tsx`, `app/admin/requests/RequestsTable.tsx`; modify `app/admin/layout.tsx` (nav).

- [ ] **Step 1: nav item** — in `app/admin/layout.tsx` `navItems`, add after MEMBERS: `{ label: "REQUESTS", href: "/admin/requests", icon: UserCheck }` and import `UserCheck` from lucide-react.

- [ ] **Step 2: page (server)** — gate `canAccessAdmin`; fetch pending + rejected users:

```tsx
// app/admin/requests/page.tsx
import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminHeading } from "@/components/ui/AdminHeading";
import { RequestsTable } from "./RequestsTable";

export default async function AdminRequestsPage() {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) redirect("/");

  const requests = await db.user.findMany({
    where: { status: { in: ["pending", "rejected"] } },
    select: {
      id: true, name: true, email: true, usn: true,
      branch: true, year: true, githubUsername: true, status: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-12 p-8">
      <AdminHeading title="ACCESS REQUESTS" sub="MEMBERSHIP_VERIFICATION_QUEUE" code={`${requests.length} PENDING`} />
      <RequestsTable initialRequests={requests} />
    </div>
  );
}
```

- [ ] **Step 3: client table** — columns name/email/USN/branch/year/github/status + Approve/Reject; PATCH `/api/admin/members/[id]` with `{ status }`; uses `TacticalTable`, `TacticalButton`, `TacticalFeedback`:

```tsx
// app/admin/requests/RequestsTable.tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TacticalTable } from "@/components/ui/TacticalTable";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { TacticalFeedback } from "@/components/ui/TacticalFeedback";
import { STATUS_LABELS, type ApprovalStatus } from "@/lib/status";

interface Req {
  id: string; name: string | null; email: string | null; usn: string | null;
  branch: string | null; year: number | null; githubUsername: string; status: string;
}

export function RequestsTable({ initialRequests }: { initialRequests: Req[] }) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const router = useRouter();

  const setStatus = (userId: string, status: ApprovalStatus) =>
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/members/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
        setFeedback({ message: `MEMBER_${status.toUpperCase()}`, type: "success" });
      } catch (err) {
        setFeedback({ message: "ACTION_FAILED: " + (err instanceof Error ? err.message : "UNKNOWN"), type: "error" });
      }
    });

  const columns = [
    { key: "name", header: "NAME", render: (r: Req) => (
      <div className="flex flex-col"><span className="text-white font-black">{r.name || "UNNAMED"}</span>
      <span className="text-[9px] text-zinc-600">{r.email}</span></div>) },
    { key: "usn", header: "USN", render: (r: Req) => r.usn || "N_A" },
    { key: "branch", header: "BRANCH/YEAR", render: (r: Req) => r.branch ? `${r.branch} (${r.year}Y)` : "N/A" },
    { key: "github", header: "GITHUB", render: (r: Req) => r.githubUsername },
    { key: "status", header: "STATUS", render: (r: Req) => (
      <span className={`retro text-[9px] ${r.status === "rejected" ? "text-red-500" : "text-[#22c55e]"}`}>
        {STATUS_LABELS[r.status as ApprovalStatus] ?? r.status}</span>) },
    { key: "actions", header: "ACTIONS", render: (r: Req) => (
      <div className="flex justify-end gap-2">
        <TacticalButton variant="primary" size="sm" prefix="" disabled={isPending} onClick={() => setStatus(r.id, "approved")}>APPROVE</TacticalButton>
        <TacticalButton variant="danger" size="sm" prefix="" disabled={isPending} onClick={() => setStatus(r.id, "rejected")}>REJECT</TacticalButton>
      </div>) },
  ];

  return (
    <>
      <TacticalTable data={initialRequests} columns={columns} id="REQ_QUEUE" />
      <TacticalFeedback key={feedback?.message || "none"} message={feedback?.message || null}
        type={feedback?.type || "success"} onClear={() => setFeedback(null)} />
    </>
  );
}
```

- [ ] **Step 4:** `bunx tsc --noEmit` + `bun run lint`. **Commit** `feat(approval): Access Requests admin tab`.

---

### Task 9: Extend member PATCH to accept `status`

**Files:** Modify `app/api/admin/members/[id]/route.ts`

- [ ] Add `isApprovalStatus` import from `@/lib/status`; destructure `status` from body; handle it (route is already `canAccessAdmin`-gated, so any admin tier may approve/reject — no President requirement):

```ts
    if (status !== undefined) {
      if (!isApprovalStatus(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updateData.status = status;
    }
```

- [ ] `bunx tsc --noEmit`. **Commit** `feat(approval): admins can set member status via member PATCH`.

---

### Task 10: Phase verification

- [ ] `bun test lib` (incl. status), `bunx tsc --noEmit`, `bun run lint` — all clean.
- [ ] Render smoke: `/` 200; `/admin/requests` gates anon → /login.
- [ ] Developer: `bunx prisma migrate deploy`; then verify: new allowlisted sign-in → pending (banner shows, can't register/submit, absent from leaderboard, appears in Requests); approve → gains access; reject → can't sign in but public browse works; a `member` can't reach `/admin/requests`.

---

## Self-Review

- **Spec coverage:** status model (T2), double-gate sign-in + rejected (T3), live write-gating (T4–T5), leaderboard exclusion (T6), pending banner (T7), Access Requests for all admin tiers (T8–T9), members blocked from the tab (canAccessAdmin gate). Covered.
- **Placeholders:** none — all code complete.
- **Type consistency:** `ApprovalStatus`/`isApprovalStatus`/`STATUS_LABELS` from `lib/status.ts` used consistently in auth (T3), table (T8), PATCH (T9); `isApproved(userId)` signature consistent T4/T5.
- **Staleness note:** write-gates check live DB status (T4) so approval takes effect immediately without re-login; the banner uses session status (refreshes on next auth) — acceptable.
