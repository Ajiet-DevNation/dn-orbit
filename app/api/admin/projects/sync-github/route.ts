import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  fetchGithubProjectDrafts,
  type GithubProjectDraft,
} from "@/lib/github-projects";
import { canAccessAdmin } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Per-repo sync decision, counted for the admin-facing toast. */
interface SyncSummary {
  created: number;
  updated: number;
  reopened: number;
  skipped: number;
}

// Admin-triggered sync of the DevNation GitHub org → pending project rows.
//
// Idempotent by `githubRepoFullName`:
//   - new repo            → create as PENDING (lands in the moderation queue)
//   - existing pending    → refresh content fields, stays pending
//   - existing rejected   → refresh content and RE-OPEN as pending (per the
//                           agreed rule: each sync re-surfaces a rejected repo
//                           until it's approved or the row is deleted)
//   - existing approved   → never touched, so admin edits and decisions win
export async function POST() {
  const session = await auth();
  if (!session || !canAccessAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Upstream failure gets its own status so the admin toast can say what went
  // wrong (rate limit, network) instead of a generic 500.
  let drafts: GithubProjectDraft[];
  try {
    drafts = await fetchGithubProjectDrafts();
  } catch (error) {
    console.error("GitHub Projects Sync Fetch Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GitHub fetch failed" },
      { status: 502 },
    );
  }

  try {
    const existing = await db.project.findMany({
      where: {
        githubRepoFullName: { in: drafts.map((d) => d.githubRepoFullName) },
      },
      select: { id: true, githubRepoFullName: true, reviewStatus: true },
    });
    const byRepoName = new Map(existing.map((p) => [p.githubRepoFullName, p]));

    const summary: SyncSummary = {
      created: 0,
      updated: 0,
      reopened: 0,
      skipped: 0,
    };

    for (const draft of drafts) {
      const content = {
        title: draft.title,
        description: draft.description,
        techStack: draft.techStack,
        status: draft.status,
        githubRepoUrl: draft.githubRepoUrl,
      };

      const current = byRepoName.get(draft.githubRepoFullName);

      if (!current) {
        await db.project.create({
          data: {
            ...content,
            githubRepoFullName: draft.githubRepoFullName,
            source: "github",
            // No member lead and no completion figure for org repos — the UI
            // omits the lead and the progress meter for imports.
            leadId: null,
            progressPct: null,
            reviewStatus: "pending",
          },
        });
        summary.created++;
        continue;
      }

      if (current.reviewStatus === "approved") {
        summary.skipped++;
        continue;
      }

      const reopening = current.reviewStatus === "rejected";
      await db.project.update({
        where: { id: current.id },
        data: {
          ...content,
          reviewStatus: "pending",
          // A re-opened row is undecided again; clear the old rejection trail.
          ...(reopening ? { reviewedById: null, reviewedAt: null } : {}),
        },
      });
      if (reopening) summary.reopened++;
      else summary.updated++;
    }

    void logAudit({
      action: "project.sync_github",
      actorId: session.user.id,
      actorName: session.user.name,
      summary: `GitHub project sync: ${summary.created} new, ${summary.updated} updated, ${summary.reopened} reopened, ${summary.skipped} skipped`,
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("GitHub Projects Sync Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
