/**
 * One-time (idempotent) setup of the Supabase Storage buckets. Run once after
 * configuring the Supabase env keys:
 *   bun run scripts/setupSupabaseBucket.ts
 *
 * - `media`: PUBLIC (public read so <img src> works) — event and project covers.
 * - `cvs`: PRIVATE — recruitment CVs, read only via admin signed URLs.
 *
 * Writes are never done from the client — they go through our API routes using
 * the secret key — so no Storage write policy is required. Safe to re-run.
 *
 * Run with Bun (`bun run`), which auto-loads .env so the secret key is present.
 */

import { CV_BUCKET, getSupabaseAdmin, MEDIA_BUCKET } from "../lib/supabase";

const BUCKETS = [
  {
    name: MEDIA_BUCKET,
    public: true,
    fileSizeLimit: "5MB",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  {
    name: CV_BUCKET,
    public: false,
    fileSizeLimit: "2MB",
    allowedMimeTypes: ["application/pdf"],
  },
];

async function main() {
  const supabase = getSupabaseAdmin();

  const { data: buckets, error: listErr } =
    await supabase.storage.listBuckets();
  if (listErr) throw listErr;

  for (const { name, ...options } of BUCKETS) {
    const visibility = options.public ? "public" : "private";
    if (buckets?.some((b) => b.name === name)) {
      const { error } = await supabase.storage.updateBucket(name, options);
      if (error) throw error;
      console.log(`Bucket "${name}" already exists — settings ensured.`);
    } else {
      const { error } = await supabase.storage.createBucket(name, options);
      if (error) throw error;
      console.log(`Created ${visibility} bucket "${name}".`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
