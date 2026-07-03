import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { usesSecureCookies } from "@/lib/cookies";
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
  // `getToken()` must read the session cookie with the same name + encryption
  // salt Auth.js used to write it. On HTTPS (Vercel) that's the `__Secure-`
  // prefixed cookie; getToken defaults to the bare HTTP name, so we must tell it
  // explicitly or the session reads as null and every member is bounced to
  // /login. The secret is resolved the same way lib/auth.ts resolves it
  // (AUTH_SECRET ?? NEXTAUTH_SECRET) so the two sides can never diverge.
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: usesSecureCookies(
      req.nextUrl.protocol,
      req.headers.get("x-forwarded-proto"),
    ),
  });
  const isLoggedIn = !!token;
  const path = req.nextUrl.pathname;

  // Let API auth routes, next internal routes, and public assets pass through
  if (
    path.startsWith("/api/auth") ||
    path.startsWith("/_next") ||
    path.includes("favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Only the member-only areas require a session. The landing page and all other
  // public routes render for anonymous visitors.
  if (!isLoggedIn && isProtectedRoute(path)) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && token) {
    // Read user data from the JWT (set by the jwt callback in lib/auth.ts)
    const usn = token.usn as string | null;
    const branch = token.branch as string | null;
    const lcUsername = token.lcUsername as string | null;
    const role = token.role as string | undefined;

    const isOnboarded = !!(usn && branch && lcUsername);

    // If on login page but logged in, redirect based on onboarding status
    if (path.startsWith("/login")) {
      return NextResponse.redirect(
        new URL(isOnboarded ? "/" : "/onboarding", req.nextUrl),
      );
    }

    // If not onboarded and trying to access protected route (except onboarding and public APIs)
    if (
      !isOnboarded &&
      !path.startsWith("/onboarding") &&
      !path.startsWith("/api")
    ) {
      return NextResponse.redirect(new URL("/onboarding", req.nextUrl));
    }

    // If onboarded and trying to access onboarding, redirect away
    if (isOnboarded && path.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }

    // Admin Route Protection
    if (path.startsWith("/admin") && !canAccessAdmin(role)) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
