"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { lcHandleTaken } from "@/lib/access";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchLeetCodeProfile } from "@/lib/lc-fetcher";
import { parseProfileForm } from "@/lib/profile";
import { invalidatePublic, PUBLIC_TAG } from "@/lib/public-tags";
import { rateLimit } from "@/lib/rate-limit";

export async function updateProfile(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // A changed LeetCode handle is verified against LeetCode's unofficial API.
  if (!rateLimit(`profile:user:${session.user.id}`, 10, 60_000).ok) {
    return { error: "Too many attempts. Please wait a minute and retry." };
  }

  try {
    const existingUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, lcUsername: true, role: true },
    });

    if (!existingUser) {
      return {
        error: "Your session is stale. Please sign out and sign in again.",
      };
    }

    // The DB role, not the session, picks the form: faculty edit only name,
    // department and bio.
    const parsed = parseProfileForm(existingUser.role, formData);
    if (!parsed.ok) {
      return { error: parsed.error };
    }

    let lcChanged = false;
    let data: Prisma.UserUpdateInput = parsed.data;
    if (!parsed.faculty) {
      const { lc_username, ...profile } = parsed.data;
      // Same check onboarding does: a new handle must resolve to a real
      // LeetCode profile, or the leaderboard would silently score zero.
      lcChanged = lc_username !== existingUser.lcUsername;
      if (lcChanged) {
        if (await lcHandleTaken(lc_username, session.user.id)) {
          return {
            error:
              "That LeetCode username is already linked to another member.",
          };
        }
        try {
          await fetchLeetCodeProfile(lc_username);
        } catch {
          return { error: "Incorrect LeetCode username. Profile not found." };
        }
      }
      data = { ...profile, lcUsername: lc_username };
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data,
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
