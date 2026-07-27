/**
 * True when a request plausibly originated from our own pages.
 *
 * Used to keep unauthenticated POST endpoints (currently /api/sync) from being
 * driven cross-site by someone else's page. Deliberately permissive:
 *
 * - No Origin AND no Referer → allowed. Server-to-server callers and curl send
 *   neither; browsers always send at least one on a cross-origin POST, so this
 *   still blocks the case we care about while never breaking a direct call.
 * - Otherwise the header's origin must match the request's own host.
 *
 * This is not CSRF protection for authenticated state-changing routes — those
 * are covered by Auth.js's own token handling. It is a narrow guard against
 * third-party pages using our visitors to trigger backend work.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  if (!origin && !referer) return true;

  const expected = expectedOrigins(req);
  const candidate = origin ?? originOf(referer);
  if (!candidate) return false;

  return expected.has(candidate);
}

function originOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function expectedOrigins(req: Request): Set<string> {
  const origins = new Set<string>();

  // The host the request actually arrived on. On Vercel the platform sets
  // x-forwarded-host/proto; locally the URL is already correct.
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) origins.add(`${forwardedProto}://${forwardedHost}`);

  const host = req.headers.get("host");
  if (host) {
    origins.add(`https://${host}`);
    origins.add(`http://${host}`);
  }

  const self = originOf(req.url);
  if (self) origins.add(self);

  // Explicit canonical origin, when configured.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const configured = originOf(siteUrl ?? null);
  if (configured) origins.add(configured);

  return origins;
}
