import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const publicRoutes = ["/login", "/api/auth"];
const isPublicRoute = (path: string) => publicRoutes.some(route => path.startsWith(route));

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;
  const path = nextUrl.pathname;

  // Let API auth routes, next internal routes, and public assets pass through
  if (path.startsWith("/api/auth") || path.startsWith("/_next") || path.includes("favicon.ico")) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn && !isPublicRoute(path) && path !== "/") {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn) {
    const user = req.auth?.user;
    
    // Check if user has completed onboarding
    const isOnboarded = !!(user?.usn && user?.branch && user?.lcUsername);

    // If on login page but logged in, redirect based on onboarding status
    if (path.startsWith("/login")) {
      return NextResponse.redirect(new URL(isOnboarded ? "/" : "/onboarding", nextUrl));
    }

    // If not onboarded and trying to access protected route (except onboarding and public APIs)
    if (!isOnboarded && !path.startsWith("/onboarding") && !path.startsWith("/api")) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }

    // If onboarded and trying to access onboarding, redirect away
    if (isOnboarded && path.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }

    // Admin Route Protection
    if (path.startsWith("/admin") && user?.role !== "admin") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
