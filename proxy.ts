import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { NextRequest, NextResponse } from "next/server";

// We re-declare auth here to avoid loading Prisma in the Edge runtime
const { auth } = NextAuth({
  providers: [GitHub({
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.usn = user.usn;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as "admin" | "member";
        session.user.usn = token.usn as string | null;
      }
      return session;
    },
  },
});

export default auth((req: NextRequest & { auth: any }) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user;

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard");
  const isOnboardingRoute = nextUrl.pathname === "/onboarding";

  // 1. Admin Protection
  if (isAdminRoute) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", nextUrl));
    if (user?.role !== "admin") return NextResponse.redirect(new URL("/", nextUrl));
  }

  // 2. Dashboard Protection
  if (isDashboardRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // 3. Onboarding Redirect
  if (isLoggedIn && !user?.usn) {
    if (!isOnboardingRoute && !nextUrl.pathname.startsWith("/api")) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
  }

  // 4. Onboarding Complete Check
  if (isLoggedIn && user?.usn && isOnboardingRoute) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};