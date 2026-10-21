"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invalidatePublic, PUBLIC_TAG } from "@/lib/public-tags";
import { canAccessAdmin } from "@/lib/roles";
import { updateProjectSchema } from "@/lib/validation";

export async function deleteProject(projectId: string) {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role))
    throw new Error("UNAUTHORIZED_ACCESS: ADMIN_CLEARANCE_REQUIRED");

  await db.project.delete({
    where: { id: projectId },
  });

  revalidatePath("/admin/projects");
  invalidatePublic(PUBLIC_TAG.projects);
}

export async function updateProjectStatus(
  projectId: string,
  status: "planning" | "active" | "completed" | "stalled",
) {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role))
    throw new Error("UNAUTHORIZED_ACCESS: ADMIN_CLEARANCE_REQUIRED");

  await db.project.update({
    where: { id: projectId },
    data: { status },
  });

  revalidatePath("/admin/projects");
  invalidatePublic(PUBLIC_TAG.projects);
}

export async function updateProjectProgress(
  projectId: string,
  progressPct: number,
) {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role))
    throw new Error("UNAUTHORIZED_ACCESS: ADMIN_CLEARANCE_REQUIRED");

  // Clamp to a whole 0–100 so a bad client value can't persist out of range.
  const pct = Math.max(0, Math.min(100, Math.round(progressPct)));

  await db.project.update({
    where: { id: projectId },
    data: { progressPct: pct },
  });

  revalidatePath("/admin/projects");
  invalidatePublic(PUBLIC_TAG.projects);
}

// Admin cover override for any project. `null`/empty clears the pasted image,
// which for GitHub imports means the derived auto-cover takes over again.
export async function updateProjectImage(
  projectId: string,
  imageUrl: string | null,
) {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role))
    throw new Error("UNAUTHORIZED_ACCESS: ADMIN_CLEARANCE_REQUIRED");

  // The same rule the project PATCH schema uses: http(s) only ("" / null /
  // undefined all collapse to "no image"), so a javascript:/data: URL can never
  // be persisted and later reflected into an <img src>.
  const parsed = updateProjectSchema.safeParse({ imageUrl });
  if (!parsed.success) {
    throw new Error("INVALID_IMAGE_URL: must be an http(s) URL");
  }

  await db.project.update({
    where: { id: projectId },
    data: { imageUrl: parsed.data.imageUrl ?? null },
  });

  revalidatePath("/admin/projects");
  invalidatePublic(PUBLIC_TAG.projects);
}
