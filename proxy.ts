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

  const isProtected =
    nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/admin");

  if (!isLoggedIn && isProtected) {
    return Response.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn && !session.user.usn) {
    const isOnboarding = nextUrl.pathname === "/onboarding";
    const isApi = nextUrl.pathname.startsWith("/api");
    if (!isOnboarding && !isApi) {
      return Response.redirect(new URL("/onboarding", nextUrl));
    }
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};