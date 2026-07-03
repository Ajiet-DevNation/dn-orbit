import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { isApproved } from "@/lib/access";
import { auth } from "@/lib/auth";
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

// The declared content-type is client-controlled; before publishing bytes to
// the public bucket under an image/* content-type, check they actually start
// like the claimed format (PNG / JPEG / RIFF-WEBP magic numbers).
function matchesMagicBytes(buffer: Buffer, mime: string): boolean {
  switch (mime) {
    case "image/png":
      return buffer
        .subarray(0, 4)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    case "image/jpeg":
      return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    case "image/webp":
      return (
        buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
        buffer.subarray(8, 12).toString("latin1") === "WEBP"
      );
    default:
      return false;
  }
}

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
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image too large (max 5 MB)" },
      { status: 413 },
    );
  }

  // Random name → no path traversal and no collisions.
  const path = `${folder}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (!matchesMagicBytes(buffer, file.type)) {
    return NextResponse.json(
      { error: "File content does not match its declared image type" },
      { status: 400 },
    );
  }

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
