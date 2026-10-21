import type { NextConfig } from "next";

// Applied to every route. The CSP is a baseline of directives that don't touch
// scripts or styles: the app inlines both (8-bit components, canvas hero), so a
// script-src policy needs nonces first. These still close framing, plugin
// objects, <base> hijacks and form posts to foreign origins (GitHub is the
// OAuth sign-in redirect).
const contentSecurityPolicy = [
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://github.com",
].join("; ");

// Only this project's public `media` bucket may go through the image
// optimizer — `**.supabase.co` let anyone proxy any Supabase project's images
// on this site's bill.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
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
  // AGENTS.md is hand-written and already points at node_modules/next/dist/docs;
  // stop `next dev` appending its own copy of that block on every start.
  agentRules: false,
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
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/media/**",
            },
          ]
        : []),
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
