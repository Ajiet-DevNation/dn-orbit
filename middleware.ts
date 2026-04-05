import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user;

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard");
  const isOnboardingRoute = nextUrl.pathname === "/onboarding";
  const isAuthRoute = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/api/auth");

  // 1. If trying to access admin routes
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    if (user?.role !== "admin") {
      // Redirect to dashboard if not an admin
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  // 2. If trying to access dashboard/protected routes but not logged in
  if ((isDashboardRoute || isAdminRoute) && !isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // 3. Onboarding logic
  // If logged in but no USN set, redirect to onboarding (prevent crossing to dashboard/admin)
  if (isLoggedIn && !user?.usn) {
    if (!isOnboardingRoute && (isDashboardRoute || isAdminRoute || nextUrl.pathname === "/")) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
  }

  // 4. If already onboarded, prevent re-accessing onboarding page
  if (isLoggedIn && user?.usn && isOnboardingRoute) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

// IMPORTANT: Do not run middleware on static files or API routes (except if needed)
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
