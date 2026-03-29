import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, usn, branch, year, lcUsername } = await req.json();

  if (!name || !usn || !branch || !year) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const parsedYear = parseInt(year);
  if (isNaN(parsedYear) || parsedYear < 1 || parsedYear > 4) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { name, usn, branch, year: parsedYear, lcUsername },
  });

  return NextResponse.json({ ok: true });
}