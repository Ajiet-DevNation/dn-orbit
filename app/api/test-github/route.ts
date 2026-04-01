// app/api/test-github/route.ts  (DELETE BEFORE MERGING)
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchGitHubStats } from "@/lib/github";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { githubUsername: true },
  });

  if (!user?.githubUsername) {
    return NextResponse.json({ error: "No github username found" });
  }

  const stats = await fetchGitHubStats(user.githubUsername, session.user.accessToken!);

  return NextResponse.json({ 
    session: session.user, 
    stats: {
      ...stats,
      githubUsername: user.githubUsername,  // ← add this
    }
  });
}
