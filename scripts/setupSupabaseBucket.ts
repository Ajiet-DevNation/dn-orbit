/**
 * One-time (idempotent) setup of the Supabase Storage bucket used for event and
 * project cover images. Run once after configuring the Supabase env keys:
 *   bun run scripts/setupSupabaseBucket.ts
 *
 * Creates a PUBLIC bucket `media` (public read so <img src> works). Writes are
 * never done from the client — they go through app/api/upload using the secret
 * key — so no Storage write policy is required. Safe to re-run.
 *
 * Run with Bun (`bun run`), which auto-loads .env so the secret key is present.
 */

import { getSupabaseAdmin, MEDIA_BUCKET } from "../lib/supabase";

const FILE_SIZE_LIMIT = "5MB";
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

async function main() {
  const supabase = getSupabaseAdmin();

  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) throw listErr;

  const exists = buckets?.some((b) => b.name === MEDIA_BUCKET);
  if (exists) {
    const { error } = await supabase.storage.updateBucket(MEDIA_BUCKET, {
      public: true,
      fileSizeLimit: FILE_SIZE_LIMIT,
      allowedMimeTypes: ALLOWED_MIME,
    });
    if (error) throw error;
    console.log(`Bucket "${MEDIA_BUCKET}" already exists — settings ensured.`);
    return;
  }

  const { error } = await supabase.storage.createBucket(MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: FILE_SIZE_LIMIT,
    allowedMimeTypes: ALLOWED_MIME,
  });
  if (error) throw error;
  console.log(`Created public bucket "${MEDIA_BUCKET}".`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
