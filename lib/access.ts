// Server-side, live approval check against the DB (not the JWT, which can be
// stale after an admin approves). Used to gate member write-actions so approval
// takes effect immediately without the user re-authenticating.
import { db } from "@/lib/db";

export async function isApproved(userId: string): Promise<boolean> {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  return u?.status === "approved";
}
