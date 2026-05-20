"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
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
    const existingUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!existingUser) {
      return {
        error: "Your session is stale. Please sign out and sign in again.",
      };
    }

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
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Onboarding Prisma Error", {
        code: error.code,
        message: error.message,
        meta: error.meta,
      });

      if (error.code === "P2025") {
        return {
          error: "Could not find your user record. Please sign out and sign in again.",
        };
      }

      if (error.code === "ETIMEDOUT") {
        return {
          error:
            "Database connection timed out. Please retry in a few seconds.",
        };
      }
    } else if (error instanceof Error) {
      console.error("Onboarding Error", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error("Onboarding Unknown Error", error);
    }

    return { error: "Failed to update profile. Please try again." };
  }
}
