# Server-Side RBAC Audit (Phase 5 · Task 6)

**Date:** 2026-06-16
**Scope:** Every API route handler, server action, and protected page.
**Result:** PASS — no server-side authorization gaps found. Authorization never
relies on client-side hiding alone; every mutation re-checks on the server.

## Method

Enumerated all `app/api/**/route.ts` handlers (per HTTP method), all
`"use server"` actions, the cron endpoints, and the admin page/layout guards.
Verified each protected operation performs a server-side `auth()` check plus the
correct predicate (`canAccessAdmin`, `canManageRoles`, ownership, or self-scope).

## API routes

| Route | Methods | Guard |
|---|---|---|
| `admin/allowlist`, `admin/allowlist/[id]` | GET/POST/DELETE | `canAccessAdmin` |
| `admin/config/weights` | GET/PATCH | `canAccessAdmin` |
| `admin/members/[id]` | PATCH | `canAccessAdmin`; **role change → `canManageRoles` (president)** + enum validation + self-demotion lockout guard |
| `admin/members/[id]/refresh` | POST | `canAccessAdmin` |
| `admin/projects/[id]/approve`, `admin/events/[id]/approve` | PATCH | `canAccessAdmin` (added in Task 2) |
| `events` | GET public / POST | POST `auth()`; non-admins forced to `reviewStatus=pending`, `isPublished=false` |
| `events/[id]` | GET / PATCH / DELETE | PATCH & DELETE `canAccessAdmin` |
| `events/[id]/attendance` | POST | `canAccessAdmin` |
| `events/[id]/feedback` | POST/GET | `auth()` + `isApproved` |
| `events/[id]/register` | POST / DELETE | POST `auth()`+audience gate; **DELETE self-scoped (`userId = session.user.id`)** |
| `events/[id]/registrations.csv` | GET | `canAccessAdmin` |
| `projects` | POST / GET | POST `auth()` + `isApproved`; public GET returns approved only |
| `projects/[id]` | PATCH / GET | PATCH `auth()` + **lead-or-admin ownership** |
| `projects/[id]/members` | POST/DELETE | `auth()` + `canAccessAdmin`/`isApproved` |
| `stats/github/[userId]`, `stats/lc/[userId]` | GET | `canAccessAdmin` |
| `upload` | POST | `auth()`; project uploads gated on `isApproved` |
| `cron/leaderboard`, `cron/stats-sync` | GET | `Bearer ${CRON_SECRET}` |
| `auth/[...nextauth]` | — | NextAuth handler (the auth system itself) |

## Server actions (`"use server"`)

- `app/admin/projects/actions.ts` — `deleteProject`, `updateProjectStatus`:
  both re-check `canAccessAdmin` server-side.
- `app/actions/profile.ts` — `updateProfile`: requires `session.user.id`; all
  writes scoped to the caller's own id.
- `app/actions/onboarding.ts` — `submitOnboarding`: same self-scoping.

## Defense in depth

- `app/admin/layout.tsx` redirects non-admins, and each admin page repeats the
  `canAccessAdmin` guard — UI hiding is never the only control.
- No mutation trusts a client-sent authorization field: `role`/`status` in the
  members route are validated and gated; event publish is decided from the
  server-side `isAdmin` check, not the request body.
- Live role reactivity (Task 4) means a revoked tier stops passing
  `canAccessAdmin` within ~30s without requiring re-login.

## Recommendations (non-blocking)

- Consider rate-limiting public POST endpoints (`events/[id]/register`,
  `projects` create) to deter spam now that submissions are queue-moderated.
- Optional: a shared `requireAdmin()` helper to collapse the repeated
  `auth()` + `canAccessAdmin` preamble and remove copy-paste drift risk.
