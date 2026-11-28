import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  formatEventDateLong,
  formatEventDateTime,
  formatEventTime,
} from "@/lib/event-format";
import { registrationClosesAt } from "@/lib/event-order";
import { type EventAudience, parseFormSchema } from "@/lib/forms";
import {
  myRegistrationWhere,
  parseRegCookie,
  regCookieName,
} from "@/lib/registration-cookie";
import {
  formatTeamCode,
  matchValueFor,
  parseTeamConfig,
  teamEventFull,
  teamSizeLabel,
} from "@/lib/teams";
import { RegistrationForm } from "./RegistrationForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await db.event.findUnique({
    where: { id },
    select: { title: true, reviewStatus: true, isPublished: true },
  });
  // Never leak an unpublished event's title through the tab.
  if (event?.reviewStatus !== "approved" || !event.isPublished) return {};
  return { title: `Register · ${event.title}` };
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await db.event.findUnique({
    where: { id },
    include: {
      _count: { select: { registrations: true } },
      // Team events only; no rows otherwise. Sizes decide FULL.
      teams: { select: { _count: { select: { members: true } } } },
    },
  });
  if (event?.reviewStatus !== "approved" || !event.isPublished) notFound();

  const schema = parseFormSchema(event.formSchema);
  const teamConfig = parseTeamConfig(event.teamConfig);
  const teamSizes = event.teams.map((t) => t._count.members);

  const audience = event.audience as EventAudience;
  const session = await auth();

  // Pure members-only events require a login; the combined tier doesn't (AJIET
  // students register by USN without an account).
  if (audience === "members" && !session) {
    redirect(`/login?callbackUrl=/events/${id}/register`);
  }

  // A signed-in approved member takes the account path (locked identity, no USN)
  // on members / members+AJIET events.
  const isMember =
    !!session &&
    session.user.status === "approved" &&
    (audience === "members" || audience === "members_college");

  // This browser's registration (cookie set by the register route) or the
  // signed-in account's. Read live so team size and status are current.
  const where = myRegistrationWhere(
    id,
    parseRegCookie((await cookies()).get(regCookieName(id))?.value),
    session?.user.id,
  );
  const mine = where
    ? await db.registration.findFirst({
        where,
        select: {
          id: true,
          name: true,
          responses: true,
          team: {
            select: {
              name: true,
              code: true,
              members: {
                orderBy: { registeredAt: "asc" },
                select: { id: true, name: true },
              },
            },
          },
        },
      })
    : null;

  const closed =
    (event.capacity != null && event._count.registrations >= event.capacity) ||
    (teamConfig != null && teamEventFull(teamConfig, teamSizes)) ||
    new Date() > registrationClosesAt(event);

  return (
    <RegistrationForm
      eventId={event.id}
      title={event.title}
      audience={audience}
      isMember={isMember}
      closed={closed}
      schema={schema}
      existing={
        mine
          ? {
              name: mine.name,
              matchValue: teamConfig
                ? matchValueFor(
                    teamConfig,
                    (mine.responses ?? {}) as Record<string, unknown>,
                  )
                : null,
              team: mine.team
                ? {
                    name: mine.team.name,
                    code: formatTeamCode(mine.team.code),
                    size: mine.team.members.length,
                    members: mine.team.members.map((m) => ({
                      name: m.name,
                      you: m.id === mine.id,
                    })),
                  }
                : null,
            }
          : null
      }
      team={
        teamConfig
          ? {
              sizeLabel: teamSizeLabel(teamConfig),
              minSize: teamConfig.minSize,
              maxSize: teamConfig.maxSize,
              matchFieldId: teamConfig.matchFieldId,
              matchLabel:
                schema.find((f) => f.id === teamConfig.matchFieldId)?.label ??
                null,
              teamCount: teamSizes.length,
              maxTeams: teamConfig.maxTeams,
              // Creating is closed once every slot is taken; joining may not be.
              canCreate:
                teamConfig.maxTeams == null ||
                teamSizes.length < teamConfig.maxTeams,
            }
          : null
      }
      dateLabel={formatEventDateLong(event.eventDate)}
      timeLabel={formatEventTime(event.eventDate)}
      location={event.location}
      description={event.description}
      capacityLabel={
        teamConfig?.maxTeams != null
          ? `${teamSizes.length} / ${teamConfig.maxTeams} TEAMS · ${event._count.registrations} REGISTERED`
          : event.capacity != null
            ? `${event._count.registrations} / ${event.capacity} REGISTERED`
            : `${event._count.registrations} REGISTERED`
      }
      deadlineLabel={
        event.registrationDeadline
          ? formatEventDateTime(event.registrationDeadline)
          : null
      }
      prefill={
        isMember && session
          ? {
              name: session.user.name ?? "",
              email: session.user.email ?? "",
              // Members onboarded with a USN — reuse it so they don't re-enter it.
              usn: session.user.usn ?? undefined,
            }
          : null
      }
    />
  );
}
