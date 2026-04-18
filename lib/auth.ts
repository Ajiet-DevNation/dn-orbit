//updated
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "member";
      usn: string | null;
      branch: string | null;
      lcUsername: string | null;
      accessToken?: string;
    } & DefaultSession["user"];
  }
  interface User {
    role: "admin" | "member";
    usn: string | null;
    branch: string | null;
    lcUsername: string | null;
    githubId: string;
    githubUsername: string;
  }
}

const baseAdapter = PrismaAdapter(db) as Adapter;

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
        email: u.email || `${u.githubUsername}@github.local`,
        name: u.name || u.githubUsername || "Unknown",
        avatarUrl: u.avatarUrl,
      },
    }) as unknown as AdapterUser;
  },
  getUserByEmail: async (email) => {
    return db.user.findUnique({ where: { email } }) as any;
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
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "admin" | "member";
      session.user.usn = token.usn as string | null;
      session.user.branch = token.branch as string | null;
      session.user.lcUsername = token.lcUsername as string | null;
      session.user.accessToken = token.accessToken as string;
      return session;
    },
  },
});
