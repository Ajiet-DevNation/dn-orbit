import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client built with the SECRET key (Supabase's new key
// scheme: publishable for the browser, secret for the server). It bypasses
// Storage RLS, so all writes go through our own auth-gated API routes — the key
// must never reach the client. Created lazily so importing this module never
// throws when the env isn't configured (e.g. during a build without secrets).
//
// Storage bucket: `media`, public-read (folders events/, projects/). Public read
// lets plain <img src> render the uploaded files without signed URLs.

export const MEDIA_BUCKET = "media";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_PRIVATE_KEY;
  if (!url || !secret) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_PRIVATE_KEY."
    );
  }

  cached = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
