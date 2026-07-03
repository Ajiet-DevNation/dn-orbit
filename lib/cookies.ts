// DB-free, dependency-free cookie helpers so the Edge runtime in proxy.ts can
// use them.

/**
 * Whether Auth.js wrote the session cookie with the `__Secure-` prefix for this
 * request — i.e. whether the request is HTTPS.
 *
 * This matters because `getToken()` in proxy.ts must read the cookie with the
 * SAME name/salt scheme Auth.js used when it wrote it. Over HTTPS, Auth.js names
 * the cookie `__Secure-authjs.session-token` and derives the JWE encryption salt
 * from that prefixed name; over HTTP it uses the bare `authjs.session-token`.
 * `getToken()` defaults to the insecure (HTTP) name and salt, so on a TLS
 * deployment like Vercel it looks for the wrong cookie and the session reads as
 * null — bouncing every authenticated user off protected routes. Passing the
 * result of this function as `secureCookie` keeps the two sides in sync.
 *
 * Mirrors @auth/core's own `useSecureCookies` heuristic (protocol === "https:"),
 * but prefers `x-forwarded-proto` because Vercel terminates TLS at the edge and
 * the proxy may see an internal `http:` URL while the public request was HTTPS.
 */
export function usesSecureCookies(
  protocol: string | null | undefined,
  forwardedProto: string | null | undefined,
): boolean {
  const forwarded = forwardedProto?.split(",")[0]?.trim().toLowerCase();
  if (forwarded) return forwarded === "https";
  return protocol === "https:";
}
