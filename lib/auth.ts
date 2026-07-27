//updated

import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession } from "next-auth";
import NextAuth from "next-auth";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import GitHub from "next-auth/providers/github";
import { db } from "@/lib/db";
import type { Role } from "@/lib/roles";
import type { ApprovalStatus } from "@/lib/status";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      status: ApprovalStatus;
      usn: string | null;
      branch: string | null;
      lcUsername: string | null;
    } & DefaultSession["user"];
  }
  interface User {
    role: Role;
    status: ApprovalStatus;
    usn: string | null;
    branch: string | null;
    lcUsername: string | null;
    githubId: string;
    githubUsername: string;
  }
}

const baseAdapter = PrismaAdapter(db) as Adapter;

// ── Membership gate ──────────────────────────────────────────────────────────
// The public can browse the site freely; sign-in is reserved for club members.
// A user may sign in only if their GitHub login/email is on the admin-managed
// Allowlist. An allowlist row may carry `grantRole`, applied on FIRST sign-in
// only — this is how the first admin of a fresh deploy gets in before any
// admin UI exists (`prisma db seed` writes president-grant rows; see
// prisma/seed.ts). After that first sign-in, the User.role column is the sole
// source of truth, managed from the admin panel.

// How long a JWT may keep a cached role/status before the next session access
// re-reads it from the DB. Bounds "stale role" to this window after an admin
// changes someone's tier, without a DB hit on every request.
const ROLE_SYNC_MS = 30_000;

// The allowlist row for a login/email, or null when the person isn't invited.
// Allowlist stores normalized (lowercased) values, so exact match is enough.
async function allowlistEntry(
  githubUsername?: string | null,
  email?: string | null,
) {
  const u = githubUsername?.toLowerCase() || null;
  const e = email?.toLowerCase() || null;
  if (!u && !e) return null;

  const or: { githubUsername?: string; email?: string }[] = [];
  if (u) or.push({ githubUsername: u });
  if (e) or.push({ email: e });

  return db.allowlist.findFirst({ where: { OR: or } });
}

// Second gate (on top of the allowlist): a user an admin has rejected can no
// longer sign in. New users (no row yet) and pending/approved users pass.
async function isRejected(
  githubUsername?: string | null,
  email?: string | null,
): Promise<boolean> {
  const u = githubUsername?.toLowerCase() || null;
  const e = email?.toLowerCase() || null;
  if (!u && !e) return false;
  const or: object[] = [];
  if (u) or.push({ githubUsername: { equals: u, mode: "insensitive" } });
  if (e) or.push({ email: { equals: e, mode: "insensitive" } });
  const row = await db.user.findFirst({
    where: { OR: or },
    select: { status: true },
  });
  return row?.status === "rejected";
}

const customAdapter: Adapter = {
  ...baseAdapter,
  createUser: async (user) => {
    const u = user as unknown as AdapterUser & {
      githubId: string;
      githubUsername: string;
    };
    // A grantRole on the person's allowlist row seeds their initial tier
    // (bootstrap admins). Everyone else starts as a pending AJIET student —
    // the President promotes them into membership/admin tiers from the panel.
    const grant = (await allowlistEntry(u.githubUsername, u.email))?.grantRole;
    // Merge GitHub-specific columns with Auth.js user fields the adapter expects
    const created = await db.user.create({
      data: {
        githubId: u.githubId,
        githubUsername: u.githubUsername,
        email: u.email?.trim() || `${u.githubId}@users.noreply.github.com`,
        name: u.name ?? u.githubUsername ?? "Unknown",
        image: u.image,
        emailVerified: u.emailVerified,
        role: grant ?? "ajiet_student",
        status: grant ? "approved" : "pending",
        // Enrol in the stats drip queue immediately, with no fetch timestamps —
        // which sorts them first, so a new member's stats land on the very next
        // drain rather than waiting out a TTL.
        statsSyncState: { create: {} },
      },
    });
    return created as unknown as AdapterUser;
  },
};

export const { handlers, auth, signIn } = NextAuth({
  adapter: customAdapter,
  session: {
    strategy: "jwt",
  },
  // Route NextAuth's sign-in and error screens to our 8-bit login page instead
  // of the unstyled built-in pages. A denied sign-in (signIn callback → false)
  // lands on /login?error=AccessDenied, which the page renders as a pixel alert.
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    GitHub({
      // Asserting these non-null claimed a guarantee the environment does not
      // make. They are genuinely optional at the type level; when unset,
      // NextAuth fails the OAuth handshake either way, and Admin → Settings now
      // reports exactly which variable is missing instead of leaving an
      // operator to infer it from a provider error.
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          // `repo` is required so the leaderboard can count a member's PRIVATE
          // repository activity (commits, merged PRs, stars, languages) — not
          // just their public footprint. Classic GitHub OAuth Apps have no
          // read-only private scope; `repo` is the only scope that unlocks
          // private repository data, and GitHub defines it as read+write. We
          // use it strictly read-only: lib/github.ts issues GET requests only
          // and there is no write path anywhere in the codebase. A member's
          // private repos are only ever read with that member's own token
          // (see lib/github.ts → includePrivate), never via another user's.
          // `read:user` + `user:email` cover profile and email.
          scope: "read:user user:email repo",
        },
      },
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
          githubId: profile.id.toString(),
          githubUsername: profile.login,
          role: "ajiet_student",
          status: "pending",
          usn: null,
          branch: null,
          lcUsername: null,
        };
      },
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    // Gate sign-in to allowlisted club members. Returning false aborts before
    // any user record is created and redirects the visitor to
    // /login?error=AccessDenied (mapped to ACCESS_DENIED on the login page).
    async signIn({ user, profile }) {
      const githubUsername =
        (profile?.login as string | undefined) ??
        (user as { githubUsername?: string } | undefined)?.githubUsername;
      const email = (profile?.email as string | undefined) ?? user?.email;
      if (!(await allowlistEntry(githubUsername, email))) return false;
      if (await isRejected(githubUsername, email)) return false;
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      // Handle manual session updates from the client
      if (trigger === "update" && session) {
        if (session.usn !== undefined) token.usn = session.usn;
        if (session.branch !== undefined) token.branch = session.branch;
        if (session.lcUsername !== undefined)
          token.lcUsername = session.lcUsername;
        if (session.name !== undefined) token.name = session.name;
      }

      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.usn = user.usn;
        token.branch = user.branch;
        token.lcUsername = user.lcUsername;
        token.githubUsername = (
          user as { githubUsername?: string }
        ).githubUsername;
        token.roleSyncedAt = Date.now();
      } else if (token.id) {
        // Live RBAC: re-read role/status from the DB so admin changes take
        // effect without the user re-authenticating. Throttled to at most one
        // query per ROLE_SYNC_MS per active session; an explicit client
        // update() bypasses the throttle for an instant self-refresh.
        const lastSynced = (token.roleSyncedAt as number | undefined) ?? 0;
        const force = trigger === "update";
        if (force || Date.now() - lastSynced > ROLE_SYNC_MS) {
          const fresh = await db.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, status: true },
          });
          if (fresh) {
            token.role = fresh.role;
            token.status = fresh.status;
          }
          token.roleSyncedAt = Date.now();
        }
      }
      if (account) {
        token.accessToken = account.access_token;
        // Persist the freshest GitHub token + granted scope back to the DB.
        // The background leaderboard cron (lib/statsSync.ts) reads the token
        // from the Account row, not this JWT — so when a member re-authorizes
        // to grant `repo`, without this their next cron sync would still run on
        // the old, public-only token and overwrite the private stats they just
        // pulled. updateMany is a safe no-op on first sign-in (the adapter
        // writes the same token to the row moments later) and only ever touches
        // this user's GitHub account row.
        if (account.provider === "github" && token.id) {
          await db.account.updateMany({
            where: { userId: token.id as string, provider: "github" },
            data: {
              access_token: account.access_token ?? null,
              scope: account.scope ?? null,
            },
          });
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.status = token.status as ApprovalStatus;
      session.user.usn = token.usn as string | null;
      session.user.branch = token.branch as string | null;
      session.user.lcUsername = token.lcUsername as string | null;
      // NOTE: the GitHub access token deliberately stays OUT of the session.
      // `/api/auth/session` is readable by client JS, so exposing it there would
      // leak the token to the browser. It lives only in the encrypted httpOnly
      // JWT (token.accessToken, server-side) and the DB Account row, which the
      // stats routes read directly. Never add accessToken to `session.user`.
      return session;
    },
  },
});
