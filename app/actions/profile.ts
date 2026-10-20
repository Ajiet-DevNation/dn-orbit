"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchLeetCodeProfile } from "@/lib/lc-fetcher";
import { invalidatePublic, PUBLIC_TAG } from "@/lib/public-tags";
import { rateLimit } from "@/lib/rate-limit";

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  usn: z.string().trim().min(5, "USN must be valid").max(20, "USN is too long"),
  branch: z
    .string()
    .trim()
    .min(2, "Branch is required")
    .max(100, "Branch is too long"),
  year: z.coerce.number().min(1).max(5),
  lc_username: z
    .string()
    .min(1, "LeetCode username is required")
    .max(40, "LeetCode username is too long")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Invalid LeetCode username format"),
  bio: z.string().max(160, "Bio must be 160 characters or less").optional(),
});

export async function updateProfile(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // A changed LeetCode handle is verified against LeetCode's unofficial API.
  if (!rateLimit(`profile:user:${session.user.id}`, 10, 60_000).ok) {
    return { error: "Too many attempts. Please wait a minute and retry." };
  }

  const rawData = {
    name: formData.get("name"),
    usn: formData.get("usn"),
    branch: formData.get("branch"),
    year: formData.get("year"),
    lc_username: formData.get("lc_username"),
    bio: formData.get("bio") || undefined,
  };

  const parsed = profileSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const existingUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, lcUsername: true },
    });

    if (!existingUser) {
      return {
        error: "Your session is stale. Please sign out and sign in again.",
      };
    }

    // Same check onboarding does: a new handle must resolve to a real
    // LeetCode profile, or the leaderboard would silently score zero.
    const lcChanged = parsed.data.lc_username !== existingUser.lcUsername;
    if (lcChanged) {
      try {
        await fetchLeetCodeProfile(parsed.data.lc_username);
      } catch {
        return { error: "Incorrect LeetCode username. Profile not found." };
      }
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
        usn: parsed.data.usn,
        branch: parsed.data.branch,
        year: parsed.data.year,
        lcUsername: parsed.data.lc_username,
        bio: parsed.data.bio,
      },
    });

    // New handle: put the member at the front of the stats queue so the board
    // stops showing the old account's numbers on the next drain.
    if (lcChanged) {
      await db.statsSyncState.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id, lcDirty: true },
        update: { lcDirty: true, nextAttemptAt: null, failCount: 0 },
      });
    }

    revalidatePath("/", "layout");
    // The public board shows member names.
    invalidatePublic(PUBLIC_TAG.leaderboard);

    // We return the updated fields so the client can call NextAuth's `update()` method
    return {
      success: true,
      user: {
        name: updatedUser.name,
        usn: updatedUser.usn,
        branch: updatedUser.branch,
        lcUsername: updatedUser.lcUsername,
      },
    };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Profile Update Prisma Error", {
        code: error.code,
        message: error.message,
        meta: error.meta,
      });

      if (error.code === "P2025") {
        return {
          error:
            "Could not find your user record. Please sign out and sign in again.",
        };
      }
    } else if (error instanceof Error) {
      console.error("Profile Update Error", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      if (
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("timed out")
      ) {
        return {
          error:
            "Database connection timed out. Please retry in a few seconds.",
        };
      }
    } else {
      console.error("Profile Update Unknown Error", error);
    }

    return { error: "Failed to update profile. Please try again." };
  }
}
