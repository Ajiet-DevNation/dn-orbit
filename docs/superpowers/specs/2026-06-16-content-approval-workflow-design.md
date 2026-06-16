# Content Approval Workflow (Projects & Events)

**Date:** 2026-06-16
**Status:** Approved (design)
**Task:** Phase 5 · Task 2 — Draft/Publish (Request → Approval) for projects and events.

## Goal

Every newly submitted project or event must default to a **pending** state and
become publicly visible only after an admin **approves** it. Admins can also
**reject**. A dedicated admin review queue lists pending items and exposes
Approve / Reject. All mutations are guarded server-side (no reliance on hidden
buttons).

## Current state (already in the codebase)

- `ApprovalStatus` enum exists (`pending | approved | rejected`) and is used by
  `User.status` for **membership** approval (`lib/access.isApproved()`).
- **Project** already has `isApproved Boolean @default(false)`; public
  `GET /api/projects` filters `isApproved: true`. No `rejected` state, no
  reviewer metadata, no queue actions.
- **Event** has only `isPublished Boolean`. `POST /api/events` forces
  `isPublished: false` for non-admins. No moderation concept.
- Admin pages follow a server-component pattern: `auth()` → `canAccessAdmin`
  guard → `db` query → client table (`admin/requests`, `admin/projects`).

## Decisions

1. **Everything goes through the queue.** Every new project/event is created
   `reviewStatus = pending`, including submissions by admins/president. No
   auto-approve path. (Authors may still edit their own pending items.)
2. **Events keep two orthogonal axes.** `reviewStatus` (moderation, admin) and
   `isPublished` (draft/live, author). An event is publicly visible only when
   `reviewStatus = approved` **AND** `isPublished = true`.
3. **Reuse the existing `ApprovalStatus` enum** for content `reviewStatus`
   rather than adding a parallel enum.

## Schema changes

Add to **Project**:
- `reviewStatus  ApprovalStatus @default(pending) @map("review_status")`
- `reviewedById  String?        @map("reviewed_by")`
- `reviewedAt    DateTime?      @map("reviewed_at")`
- `reviewedBy    User?          @relation("ProjectReviewer", ...)`
- **Remove** `isApproved` (data migrated into `reviewStatus`).

Add to **Event** (identical trio), **keep** `isPublished`.

Add reverse relations on **User**: `reviewedProjects`, `reviewedEvents`.

### Migration (hand-written, data-preserving)

`prisma/migrations/<ts>_content_review_status/migration.sql`:
1. Add `review_status` (default `pending`), `reviewed_by`, `reviewed_at` columns
   to `projects` and `events`.
2. **Backfill** `projects.review_status = 'approved' WHERE is_approved = true`
   (existing live projects stay visible); the rest remain `pending`.
3. Backfill `events.review_status = 'approved'` for already-existing rows so the
   merge doesn't hide current events (they were created under the old model).
4. Drop `projects.is_approved`.
5. Add FK constraints for `reviewed_by → users(id)` (ON DELETE SET NULL).

> Migration is written and reviewed before any UI work. `prisma migrate dev`
> against the dev DB; never edit applied migrations.

## API changes

- `GET /api/projects` (public): filter `reviewStatus: "approved"` (was
  `isApproved: true`).
- `POST /api/projects`: set `reviewStatus: "pending"` (drop `isApproved`).
- `POST /api/events`: set `reviewStatus: "pending"`; keep `isPublished` author
  logic. Public event reads require `reviewStatus = approved AND isPublished`.
- **New** `POST /api/admin/projects/[id]/review` and
  `POST /api/admin/events/[id]/review`, body `{ action: "approve" | "reject" }`.
  Each: `auth()` → `canAccessAdmin` guard (403 otherwise) → set `reviewStatus`,
  `reviewedById = session.user.id`, `reviewedAt = now()`.
- Public list endpoints/server queries for events updated to the
  approved+published predicate.

## Admin UI

New **Admin → Approvals** page (`app/admin/approvals/`): the canonical review
queue. Two tabs, Projects | Events, each listing `pending` items with author,
submitted-at, summary, and Approve / Reject buttons (8-bit styled, matching
`admin/requests`). Counts in the header. Server component guards with
`canAccessAdmin`; actions hit the review routes and `router.refresh()`.

Existing `admin/projects` / `admin/events` list pages show `reviewStatus`
read-only (badge), replacing the `isApproved` boolean display.

Add an "Approvals" link with pending-count badge to the admin sidebar.

## RBAC / security (overlaps Task 6)

- Every review route re-checks `canAccessAdmin(session.user.role)` server-side.
- Create routes keep the live `isApproved(userId)` membership gate.
- Public read paths never return non-approved content.
- No mutation trusts client-sent status fields for moderation.

## Out of scope (later sub-projects)

Live role reactivity (Task 4), the broader RBAC audit (Task 6), and UI polish
(Tasks 1/3/5/7/8). This sub-project is schema + API + the review queue only.

## Test / verification

- `bunx tsc --noEmit`, `bun test lib`, `eslint` clean.
- Manual: non-admin creates project → not in public list → appears in Approvals
  → approve → appears publicly; reject → stays hidden. Same for events (also
  requires publish to show).
