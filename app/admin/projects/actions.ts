"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";

export async function deleteProject(projectId: string) {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) throw new Error("UNAUTHORIZED_ACCESS: ADMIN_CLEARANCE_REQUIRED");

  await db.project.delete({
    where: { id: projectId }
  });

  revalidatePath("/admin/projects");
}

export async function updateProjectStatus(projectId: string, status: "planning" | "active" | "completed" | "stalled") {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) throw new Error("UNAUTHORIZED_ACCESS: ADMIN_CLEARANCE_REQUIRED");

  await db.project.update({
    where: { id: projectId },
    data: { status }
  });

  revalidatePath("/admin/projects");
}

export async function updateProjectProgress(projectId: string, progressPct: number) {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) throw new Error("UNAUTHORIZED_ACCESS: ADMIN_CLEARANCE_REQUIRED");

  // Clamp to a whole 0–100 so a bad client value can't persist out of range.
  const pct = Math.max(0, Math.min(100, Math.round(progressPct)));

  await db.project.update({
    where: { id: projectId },
    data: { progressPct: pct }
  });

  revalidatePath("/admin/projects");
}
