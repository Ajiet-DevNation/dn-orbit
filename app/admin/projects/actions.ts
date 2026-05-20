"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function deleteProject(projectId: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("UNAUTHORIZED_ACCESS: ADMIN_CLEARANCE_REQUIRED");

  await db.project.delete({
    where: { id: projectId }
  });

  revalidatePath("/admin/projects");
}

export async function updateProjectStatus(projectId: string, status: "planning" | "active" | "completed" | "stalled") {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("UNAUTHORIZED_ACCESS: ADMIN_CLEARANCE_REQUIRED");

  await db.project.update({
    where: { id: projectId },
    data: { status }
  });

  revalidatePath("/admin/projects");
}
