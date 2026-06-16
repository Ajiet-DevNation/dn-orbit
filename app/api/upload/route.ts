import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { isApproved } from "@/lib/access";
import { getSupabaseAdmin, MEDIA_BUCKET } from "@/lib/supabase";

// Uploads a cropped cover image (already at the target ratio/size from the
// client cropper) to the Supabase `media` bucket and returns its public URL.
// The secret key lives only here on the server; the bucket is public-read so the
// returned URL renders directly in <img>. Auth-gated to mirror the create routes:
// any signed-in user may upload an event image; project images require approval.

const KIND_FOLDER: Record<string, string> = {
  event: "events",
  project: "projects",
};
const MIME_EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = String(form?.get("kind") ?? "");

  const folder = KIND_FOLDER[kind];
  if (!folder) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Project submissions are gated on approval (same as POST /api/projects).
  if (kind === "project" && !(await isApproved(session.user.id))) {
    return NextResponse.json({ error: "Pending approval" }, { status: 403 });
  }

  const ext = MIME_EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Unsupported image type (use JPEG, PNG, or WebP)" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image too large (max 5 MB)" },
      { status: 413 }
    );
  }

  // Random name → no path traversal and no collisions.
  const path = `${folder}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) {
    console.error("Supabase upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 502 });
  }

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}
