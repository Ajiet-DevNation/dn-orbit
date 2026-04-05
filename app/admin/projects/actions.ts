"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function checkAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export async function approveProject(projectId: string) {
  await checkAdmin();
  
  await db.project.update({
    where: { id: projectId },
    data: { isApproved: true },
  });
  
  revalidatePath("/admin/projects");
  revalidatePath("/projects"); // Public projects page
}

export async function deleteProject(projectId: string) {
  await checkAdmin();
  
  await db.project.delete({
    where: { id: projectId },
  });
  
  revalidatePath("/admin/projects");
  revalidatePath("/projects");
}

export async function updateProjectStatus(projectId: string, status: any) {
  await checkAdmin();
  
  await db.project.update({
    where: { id: projectId },
    data: { status },
  });
  
  revalidatePath("/admin/projects");
}
