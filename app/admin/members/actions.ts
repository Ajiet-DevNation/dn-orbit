"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateUserRole(userId: string, newRole: "admin" | "member") {
  const session = await auth();

  // 1. Auth check
  if (session?.user?.role !== "admin") {
    throw new Error("Unauthorized: Admin clearance required");
  }

  // 2. Prevent self-demotion (optional but safe)
  if (session.user.id === userId && newRole === "member") {
    throw new Error("Action Denied: You cannot demote yourself");
  }

  // 3. Update DB
  await db.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  // 4. Revalidate
  revalidatePath("/admin/members");
}
