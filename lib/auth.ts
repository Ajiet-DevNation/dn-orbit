//updated
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      usn: string | null;
      branch: string | null;
      lcUsername: string | null;
      accessToken?: string;
    } & DefaultSession["user"];
  }
  interface User {
    role: Role;
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
        role: isBootstrapAdmin(u.githubUsername) ? "president" : "member",
      },
    }) as unknown as AdapterUser;
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: customAdapter,
  session: {
    strategy: "jwt",
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
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
          role: "member",
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
      return isAllowedToSignIn(githubUsername, email);
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
        token.usn = user.usn;
        token.branch = user.branch;
        token.lcUsername = user.lcUsername;
        // Keep bootstrap admins elevated even if their DB row predates the env
        // var (createUser only runs once, on first sign-in).
        if (isBootstrapAdmin((user as { githubUsername?: string }).githubUsername)) {
          token.role = "president";
        }
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.usn = token.usn as string | null;
      session.user.branch = token.branch as string | null;
      session.user.lcUsername = token.lcUsername as string | null;
      session.user.accessToken = token.accessToken as string;
      return session;
    },
  },
});
