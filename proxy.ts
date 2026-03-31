import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

const { auth } = NextAuth({
  providers: [GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  })],
});

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isProtected =
    nextUrl.pathname.startsWith("/dashboard") || isAdminRoute;

  if (!isLoggedIn && isProtected) {
    return Response.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn && !session?.user?.usn) {
    const isOnboarding = nextUrl.pathname === "/onboarding";
    const isApi = nextUrl.pathname.startsWith("/api");
    if (!isOnboarding && !isApi) {
      return Response.redirect(new URL("/onboarding", nextUrl));
    }
  }

  if (isAdminRoute && isLoggedIn) {
    if (session.user?.role !== "admin") {
      return Response.redirect(new URL("/dashboard", nextUrl)); 
    }
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};