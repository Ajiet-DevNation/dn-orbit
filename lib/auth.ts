//updated
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import type { DefaultSession } from "next-auth";
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
      accessToken?: string;
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
// Allowlist, or in the ADMIN_GITHUB_USERNAMES bootstrap list (which also grants
// the admin role — this is how the first admin gets in before the allowlist or
// any admin UI exists).

function bootstrapAdminUsernames(): string[] {
  return (process.env.ADMIN_GITHUB_USERNAMES ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isBootstrapAdmin(githubUsername?: string | null): boolean {
  const u = githubUsername?.toLowerCase();
  return !!u && bootstrapAdminUsernames().includes(u);
}

// How long a JWT may keep a cached role/status before the next session access
// re-reads it from the DB. Bounds "stale role" to this window after an admin
// changes someone's tier, without a DB hit on every request.
const ROLE_SYNC_MS = 30_000;

async function isAllowedToSignIn(
  githubUsername?: string | null,
  email?: string | null
): Promise<boolean> {
  const u = githubUsername?.toLowerCase() || null;
  const e = email?.toLowerCase() || null;

  if (u && isBootstrapAdmin(u)) return true;
  if (!u && !e) return false;

  // Allowlist stores normalized (lowercased) values, so exact match is enough.
  const or: { githubUsername?: string; email?: string }[] = [];
  if (u) or.push({ githubUsername: u });
  if (e) or.push({ email: e });

  const entry = await db.allowlist.findFirst({ where: { OR: or } });
  return !!entry;
}

// Second gate (on top of the allowlist): a user an admin has rejected can no
// longer sign in. New users (no row yet) and pending/approved users pass.
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
    // Merge GitHub-specific columns with Auth.js user fields the adapter expects
    return db.user.create({
      data: {
        githubId: u.githubId,
        githubUsername: u.githubUsername,
        email: u.email?.trim() || `${u.githubId}@users.noreply.github.com`,
        name: u.name ?? u.githubUsername ?? "Unknown",
        image: u.image,
        emailVerified: u.emailVerified,
        // New sign-ins are AJIET students by default — the President promotes
        // them into membership/admin tiers. Bootstrap admins are the exception.
        role: isBootstrapAdmin(u.githubUsername) ? "president" : "ajiet_student",
        status: isBootstrapAdmin(u.githubUsername) ? "approved" : "pending",
      },
    }) as unknown as AdapterUser;
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
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
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
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
    // Gate sign-in to allowlisted club members (or bootstrap admins). Returning
    // false aborts before any user record is created and redirects the visitor
    // to /login?error=AccessDenied (mapped to ACCESS_DENIED on the login page).
    async signIn({ user, profile }) {
      const githubUsername =
        (profile?.login as string | undefined) ??
        (user as { githubUsername?: string } | undefined)?.githubUsername;
      const email = (profile?.email as string | undefined) ?? user?.email;
      if (!(await isAllowedToSignIn(githubUsername, email))) return false;
      if (await isRejected(githubUsername, email)) return false;
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      // Handle manual session updates from the client
      if (trigger === "update" && session) {
        if (session.usn !== undefined) token.usn = session.usn;
        if (session.branch !== undefined) token.branch = session.branch;
        if (session.lcUsername !== undefined) token.lcUsername = session.lcUsername;
        if (session.name !== undefined) token.name = session.name;
      }

      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.usn = user.usn;
        token.branch = user.branch;
        token.lcUsername = user.lcUsername;
        token.githubUsername = (user as { githubUsername?: string }).githubUsername;
        // Keep bootstrap admins elevated even if their DB row predates the env
        // var (createUser only runs once, on first sign-in).
        if (isBootstrapAdmin(token.githubUsername as string | undefined)) {
          token.role = "president";
          token.status = "approved";
        }
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
            select: { role: true, status: true, githubUsername: true },
          });
          if (fresh) {
            token.role = fresh.role;
            token.status = fresh.status;
            if (isBootstrapAdmin(fresh.githubUsername)) {
              token.role = "president";
              token.status = "approved";
            }
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
      session.user.accessToken = token.accessToken as string;
      return session;
    },
  },
});
