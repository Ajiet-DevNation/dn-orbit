"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { lcHandleTaken } from "@/lib/access";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchLeetCodeStats } from "@/lib/lc-fetcher";
import { invalidatePublic, PUBLIC_TAG } from "@/lib/public-tags";
import { rateLimit } from "@/lib/rate-limit";
import { isAjietUsn } from "@/lib/usn";

const onboardingSchema = z.object({
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
  // Bio is the only optional onboarding field.
  bio: z.string().max(160, "Bio must be 160 characters or fewer").optional(),
});

export async function submitOnboarding(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // Each submit calls LeetCode's unofficial API; don't let a loop proxy a
  // flood through our egress IP.
  if (!rateLimit(`onboarding:user:${session.user.id}`, 10, 60_000).ok) {
    return { error: "Too many attempts. Please wait a minute and retry." };
  }

  const rawData = {
    name: formData.get("name"),
    usn: formData.get("usn"),
    branch: formData.get("branch"),
    year: formData.get("year"),
    lc_username: formData.get("lc_username"),
    bio: formData.get("bio") ?? undefined,
  };

  const parsed = onboardingSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const existingUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, status: true, usn: true },
    });

    if (!existingUser) {
      return {
        error: "Your session is stale. Please sign out and sign in again.",
      };
    }
    if (existingUser.status === "rejected") {
      return { error: "Your membership request was not approved." };
    }

    if (await lcHandleTaken(parsed.data.lc_username, session.user.id)) {
      return {
        error: "That LeetCode username is already linked to another member.",
      };
    }

    try {
      await fetchLeetCodeStats(parsed.data.lc_username);
    } catch {
      return { error: "Incorrect LeetCode username. Profile not found." };
    }

    // Auto-approve membership for verified AJIET students. Sign-in is already
    // gated by the admin allowlist, and a well-formed AJIET USN (4JK…) plus a
    // confirmed LeetCode profile is enough signal to skip the manual queue.
    // Non-AJIET USNs stay `pending` for a one-click admin review. We never
    // *demote* here — an already-approved user keeps their status.
    //
    // Only on FIRST onboarding of a pending account: a re-submitted form (the
    // action id is in the client bundle) must not let someone an admin has
    // since moved back to pending approve themselves again.
    const autoApprove =
      existingUser.status === "pending" &&
      !existingUser.usn &&
      isAjietUsn(parsed.data.usn);

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
        usn: parsed.data.usn,
        branch: parsed.data.branch,
        year: parsed.data.year,
        lcUsername: parsed.data.lc_username,
        bio: parsed.data.bio?.trim() || null,
        ...(autoApprove ? { status: "approved" as const } : {}),
      },
    });

    // The LeetCode handle is new: queue it for the next drain rather than
    // waiting for this member's GitHub side to come due.
    await db.statsSyncState.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, lcDirty: true },
      update: { lcDirty: true, nextAttemptAt: null, failCount: 0 },
    });

    revalidatePath("/", "layout");
    // Onboarding makes a member visible on the public board.
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
      console.error("Onboarding Prisma Error", {
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
      console.error("Onboarding Error", {
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
      console.error("Onboarding Unknown Error", error);
    }

    return { error: "Failed to update profile. Please try again." };
  }
}
