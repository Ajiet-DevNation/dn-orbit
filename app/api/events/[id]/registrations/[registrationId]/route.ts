import { NextResponse } from "next/server";
import { canManageEventRoster } from "@/lib/access";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recomputeLeaderboardAfterResponse } from "@/lib/leaderboard";
import { invalidatePublic, PUBLIC_TAG } from "@/lib/public-tags";

type Params = { params: Promise<{ id: string; registrationId: string }> };

// admin drops one registrant; a team left empty goes too, freeing its slot
export async function DELETE(_req: Request, { params }: Params) {
  const { id: eventId, registrationId } = await params;
  const session = await auth();

  // Admins only, like attendance: an organizer could otherwise drop rivals
  // from their own event.
  const access = await canManageEventRoster(eventId, session?.user);
  if (!access.ok)
    return NextResponse.json(
      {
        error:
          access.status === 404
            ? "Event not found"
            : access.status === 401
              ? "Unauthenticated"
              : "Forbidden",
      },
      { status: access.status },
    );
  if (!access.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Same event row lock as register and team, so a join can't land in a team
  // that is being dropped.
  const removed = await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
      // Scoped by event so an id from another event can't be deleted here.
      const reg = await tx.registration.findFirst({
        where: { id: registrationId, eventId },
        select: {
          name: true,
          attended: true,
          teamId: true,
          team: { select: { name: true } },
          event: { select: { title: true } },
        },
      });
      if (!reg) return null;
      await tx.registration.delete({ where: { id: registrationId } });
      const teamRemoved = reg.teamId
        ? (
            await tx.eventTeam.deleteMany({
              where: { id: reg.teamId, members: { none: {} } },
            })
          ).count > 0
        : false;
      return { ...reg, teamRemoved };
    },
    { maxWait: 5_000, timeout: 10_000 },
  );
  if (!removed)
    return NextResponse.json(
      { error: "Registration not found" },
      { status: 404 },
    );

  // Cards show seat and team counts.
  invalidatePublic(PUBLIC_TAG.events);
  // Only attended rows count toward the event score.
  if (removed.attended) recomputeLeaderboardAfterResponse();

  const teamNote = removed.team
    ? removed.teamRemoved
      ? ` (team "${removed.team.name}" removed, it had no members left)`
      : ` (left team "${removed.team.name}")`
    : "";
  void logAudit({
    action: "registration.delete",
    actorId: session?.user.id ?? null,
    actorName: session?.user.name ?? null,
    summary: `Removed ${removed.name} from "${removed.event.title}"${teamNote}`,
  });

  return NextResponse.json({ success: true, teamRemoved: removed.teamRemoved });
}
