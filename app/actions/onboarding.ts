"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const onboardingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  usn: z.string().min(5, "USN must be valid"),
  branch: z.string().min(2, "Branch is required"),
  year: z.coerce.number().min(1).max(5),
  lc_username: z
    .string()
    .min(1, "LeetCode username is required")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Invalid LeetCode username format"),
});

export async function submitOnboarding(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const rawData = {
    name: formData.get("name"),
    usn: formData.get("usn"),
    branch: formData.get("branch"),
    year: formData.get("year"),
    lc_username: formData.get("lc_username"),
  };

  const parsed = onboardingSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
        usn: parsed.data.usn,
        branch: parsed.data.branch,
        year: parsed.data.year,
        lcUsername: parsed.data.lc_username,
      },
    });

    revalidatePath("/", "layout");
    
    // We return the updated fields so the client can call NextAuth's `update()` method
    return { 
      success: true, 
      user: {
        name: updatedUser.name,
        usn: updatedUser.usn,
        branch: updatedUser.branch,
        lcUsername: updatedUser.lcUsername,
      } 
    };
  } catch (error) {
    console.error("Onboarding Error:", error);
    return { error: "Failed to update profile. Please try again." };
  }
}
