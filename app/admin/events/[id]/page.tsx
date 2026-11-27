import { notFound, redirect } from "next/navigation";
import { PixelPageHeader } from "@/components/admin/PixelPageHeader";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseFormSchema } from "@/lib/forms";
import { canAccessAdmin } from "@/lib/roles";
import { formatTeamCode, parseTeamConfig, teamStatus } from "@/lib/teams";
import EventRosterClient from "./EventRosterClient";

export const metadata = { title: "EVENT ROSTER // ADMIN" };

// Every row carries the registrant's custom answers, so an uncapped roster on a
// popular event shipped megabytes into the RSC payload. Same cap as
// /my-events; the CSV export is the complete list.
const MAX_ROSTER_ROWS = 300;

export default async function AdminEventRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) redirect("/");

  const { id } = await params;
  const event = await db.event.findUnique({
    where: { id },
    include: {
      registrations: {
        orderBy: { registeredAt: "asc" },
        take: MAX_ROSTER_ROWS,
        include: { team: { select: { name: true } } },
      },
      _count: { select: { registrations: true } },
      // Team events only; at most maxTeams rows.
      teams: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          code: true,
          matchValue: true,
          createdAt: true,
          _count: { select: { members: true } },
        },
      },
    },
  });
  if (!event) notFound();

  const teamConfig = parseTeamConfig(event.teamConfig);
  // Registered (step 1) but never created or joined a team (step 2).
  const withoutTeam = teamConfig
    ? await db.registration.count({ where: { eventId: id, teamId: null } })
    : 0;
  const teams = teamConfig
    ? {
        withoutTeam,
        minSize: teamConfig.minSize,
        maxSize: teamConfig.maxSize,
        maxTeams: teamConfig.maxTeams,
        matchLabel:
          parseFormSchema(event.formSchema).find(
            (f) => f.id === teamConfig.matchFieldId,
          )?.label ?? null,
        rows: event.teams.map((t) => ({
          id: t.id,
          name: t.name,
          code: formatTeamCode(t.code),
          matchValue: t.matchValue ?? "—",
          size: t._count.members,
          status: teamStatus(t._count.members, teamConfig),
        })),
      }
    : null;

  const formFields = parseFormSchema(event.formSchema).map((f) => ({
    id: f.id,
    label: f.label,
  }));

  const registrations = event.registrations.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    usn: r.usn ?? "—",
    attended: r.attended,
    registeredAt: r.registeredAt.toISOString(),
    responses: (r.responses ?? {}) as Record<string, unknown>,
    team: r.team?.name ?? null,
  }));

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PixelPageHeader
        title="EVENT ROSTER"
        subtitle={event.title.toUpperCase()}
      />
      <EventRosterClient
        eventId={event.id}
        registrations={registrations}
        totalRegistrations={event._count.registrations}
        formFields={formFields}
        teams={teams}
      />
    </div>
  );
}
