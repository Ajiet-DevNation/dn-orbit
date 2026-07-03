import type { NextConfig } from "next";

// Applied to every route. CSP is intentionally absent for now: the app inlines
// styles/scripts in several places (8-bit components, canvas hero) and a lax
// CSP is worse than none — revisit with nonces if that changes.
const securityHeaders = [
  // 2y HSTS incl. subdomains; safe because the site is HTTPS-only on Vercel.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Nothing on the site is meant to be framed; blocks clickjacking.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Uploaded media is immutable (new upload → new URL), so let the optimizer
    // cache aggressively.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      // Member avatars come from GitHub via the OAuth profile.
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      // Event/project images live in the Supabase `media` bucket (public read).
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  experimental: {
    // Both icon libraries are imported piecemeal; this keeps their barrels out
    // of the bundle without changing any import sites.
    optimizePackageImports: ["lucide-react", "react-icons"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
