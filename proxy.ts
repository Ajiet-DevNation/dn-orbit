import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { canAccessAdmin } from "@/lib/roles";

// Routes that require an authenticated (club-member) session. Everything else —
// including the landing page `/` — is public and browsable without signing in.
const protectedRoutes = ["/onboarding", "/admin"];
const isProtectedRoute = (path: string) =>
  protectedRoutes.some((route) => path.startsWith(route));

/**
 * Next.js 16 Proxy (replaces the deprecated middleware convention).
 *
 * Uses `getToken()` from next-auth/jwt instead of the `auth()` wrapper.
 * Why: `auth()` pulls in the full Prisma adapter which requires Node.js
 * `crypto` — that module is unavailable in the Edge Runtime that proxy
 * runs in. `getToken()` only decodes the JWT cookie via `jose` (Edge-safe).
 *
 * The JWT contains `id`, `role`, `usn`, `branch`, `lcUsername`, and
 * `accessToken` — set by the jwt callback in lib/auth.ts.
 */
export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token;
  const path = req.nextUrl.pathname;

  console.log(`[Proxy] Path: ${path} | isLoggedIn: ${isLoggedIn}`);

  // Let API auth routes, next internal routes, and public assets pass through
  if (path.startsWith("/api/auth") || path.startsWith("/_next") || path.includes("favicon.ico")) {
    return NextResponse.next();
  }

  // Only the member-only areas require a session. The landing page and all other
  // public routes render for anonymous visitors.
  if (!isLoggedIn && isProtectedRoute(path)) {
    console.log(`[Proxy] Redirecting unauthenticated user to /login`);
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && token) {
    // Read user data from the JWT (set by the jwt callback in lib/auth.ts)
    const usn = token.usn as string | null;
    const branch = token.branch as string | null;
    const lcUsername = token.lcUsername as string | null;
    const role = token.role as string | undefined;

    const isOnboarded = !!(usn && branch && lcUsername);
    console.log(`[Proxy] User onboarded: ${isOnboarded} (USN: ${usn})`);

    // If on login page but logged in, redirect based on onboarding status
    if (path.startsWith("/login")) {
      console.log(`[Proxy] Logged in user on /login, redirecting to ${isOnboarded ? "/" : "/onboarding"}`);
      return NextResponse.redirect(new URL(isOnboarded ? "/" : "/onboarding", req.nextUrl));
    }

    // If not onboarded and trying to access protected route (except onboarding and public APIs)
    if (!isOnboarded && !path.startsWith("/onboarding") && !path.startsWith("/api")) {
      console.log(`[Proxy] User not onboarded, redirecting to /onboarding`);
      return NextResponse.redirect(new URL("/onboarding", req.nextUrl));
    }

    // If onboarded and trying to access onboarding, redirect away
    if (isOnboarded && path.startsWith("/onboarding")) {
      console.log(`[Proxy] User already onboarded, redirecting away from /onboarding`);
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }

    // Admin Route Protection
    if (path.startsWith("/admin") && !canAccessAdmin(role)) {
      console.log(`[Proxy] Non-admin tried to access /admin`);
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
