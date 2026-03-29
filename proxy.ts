import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;

  const isProtected =
    nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/admin");

  if (!isLoggedIn && isProtected) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn && !session.user.usn) {
    const isOnboarding = nextUrl.pathname === "/onboarding";
    const isApi = nextUrl.pathname.startsWith("/api");
    if (!isOnboarding && !isApi) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};