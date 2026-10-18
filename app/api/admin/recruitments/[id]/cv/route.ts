import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";
import { CV_BUCKET, getSupabaseAdmin } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

// Opens an applicant's CV. The `cvs` bucket is private, so this signs a URL
// valid for one minute and redirects to it — the link in the admin table never
// exposes a lasting address to the file.
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !canAccessAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const application = await db.recruitmentApplication.findUnique({
    where: { id },
    select: { cvPath: true },
  });
  if (!application?.cvPath) {
    return NextResponse.json({ error: "No CV on file" }, { status: 404 });
  }

  const { data, error } = await getSupabaseAdmin()
    .storage.from(CV_BUCKET)
    .createSignedUrl(application.cvPath, 60);
  if (error || !data) {
    console.error("CV signed URL error:", error);
    return NextResponse.json({ error: "Could not open CV" }, { status: 502 });
  }

  return NextResponse.redirect(data.signedUrl);
}
