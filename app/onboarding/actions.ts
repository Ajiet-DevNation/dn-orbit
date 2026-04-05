"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function completeOnboarding(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name") as string;
  const usn = formData.get("usn") as string;
  const branch = formData.get("branch") as string;
  const yearStr = formData.get("year") as string;
  const lcUsername = formData.get("lcUsername") as string;

  if (!name || !usn || !branch || !yearStr) {
    throw new Error("Missing required fields");
  }

  const year = parseInt(yearStr);
  if (isNaN(year) || year < 1 || year > 4) {
    throw new Error("Invalid year");
  }

  // Update DB
  await db.user.update({
    where: { id: session.user.id },
    data: { 
      name, 
      usn, 
      branch, 
      year, 
      lcUsername: lcUsername || null 
    },
  });

  // Revalidate to clear any caches
  revalidatePath("/");
  
  // Note: JWT session won't update its data immediately in middleware/proxy
  // until next sign-in or session update. 
  // However, redirecting to home will let the app/page.tsx logic run again.
  redirect("/");
}
