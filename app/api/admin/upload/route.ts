import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";

const BUCKET = process.env.SUPABASE_BANNERS_BUCKET ?? "event-banners";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !canAccessAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Storage is not configured" },
      { status: 500 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const key = `banners/${crypto.randomUUID()}.${ext}`;

  const supabase = createSupabaseAdmin(url, serviceKey, {
    auth: { persistSession: false },
  });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, bytes, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}
