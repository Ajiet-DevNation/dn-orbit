// app/api/stats/lc/verify/route.ts
// Backs the "Connect LeetCode" flow. LeetCode has no OAuth, so instead of a real
// login we resolve the handle to its live public profile and hand it back so the
// user can confirm it's the right account before saving. A handle that doesn't
// resolve is rejected — this is what stops typos and made-up names.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchLeetCodeProfile } from "@/lib/lc-fetcher";

const LC_USERNAME_RE = /^[a-zA-Z0-9_.-]+$/;

export async function POST(req: NextRequest) {
  // Signed-in members only — this is a profile-linking helper, not public.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";

  if (!username || !LC_USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Enter a valid LeetCode username" },
      { status: 400 }
    );
  }

  try {
    const profile = await fetchLeetCodeProfile(username);
    return NextResponse.json({ data: profile });
  } catch {
    // fetchLeetCodeProfile throws "User not found" for unknown handles; surface a
    // single friendly message rather than leaking upstream error shapes.
    return NextResponse.json(
      { error: "No LeetCode profile found for that username" },
      { status: 404 }
    );
  }
}
