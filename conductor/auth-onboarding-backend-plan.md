# Implementation Plan: Module 1 Auth & Onboarding (Backend Only)

## Background & Motivation
The user requested the backend implementation for Auth & Onboarding using GitHub OAuth. The stack dictates NextAuth with Prisma ORM, and the user requested no UI generation. The implementation must perfectly map to the custom database schema, sync specific GitHub profile data, enforce strict LeetCode username validation, and secure routes via Middleware.

## Scope & Impact
- Updates `prisma/schema.prisma` to include required NextAuth models (`Account`, `Session`) linked to the existing `User` model.
- Overrides NextAuth behavior in `lib/auth.ts` to sync GitHub profile data (`github_id`, `github_username`, `email`, `avatar_url`, `name`) properly on sign-in.
- Implements `middleware.ts` for route protection and RBAC (Role-Based Access Control).
- Implements a server action `app/actions/onboarding.ts` for strict validation (Zod) and DB updates of onboarding fields (`usn`, `branch`, `year`, `lc_username`).

## Proposed Solution

### 1. Prisma Schema Adjustments
NextAuth's Prisma Adapter requires `Account` and `Session` models. I will add these to `prisma/schema.prisma`, mapping them to `accounts` and `sessions` tables, and link them to the existing `User` model without modifying its existing fields.

### 2. NextAuth Configuration (`lib/auth.ts`)
Update `lib/auth.ts`:
- **Profile Callback**: Intercept the GitHub OAuth profile to extract `id` (as `githubId`), `login` (as `githubUsername`), `email`, `name`, and `avatar_url`.
- **JWT & Session Callbacks**: Embed `role`, `usn`, `branch`, and `lcUsername` into the token and session so Middleware can instantly access onboarding state without a DB trip.

### 3. Middleware (`middleware.ts`)
- Protect `/admin/*` requiring `role === "admin"`.
- Protect `/(dashboard)/*` requiring a valid session.
- If a user is logged in but missing `usn`, `branch`, or `lcUsername`, redirect all protected route access to `/onboarding`.
- If a fully onboarded user tries to access `/onboarding`, redirect them to the dashboard.

### 4. Server Action for Onboarding (`app/actions/onboarding.ts`)
- Build a strictly typed Zod schema for the onboarding payload.
- `lc_username`: RegEx validation ensuring it strictly matches LeetCode's handle format (no spaces, alphanumeric).
- Authenticate the request via `auth()`.
- Update the user record via `db.user.update`.
- Revalidate paths and redirect to the dashboard.

## Verification & Testing
- Verify Prisma models generate properly and `Account` relation allows GitHub login.
- Verify JWT includes the custom properties.
- Verify Middleware correctly routes an unonboarded user to `/onboarding` and blocks unauthenticated users.
- Verify `lc_username` with spaces is rejected by the Server Action.