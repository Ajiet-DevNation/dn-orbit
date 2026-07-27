import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { type EventAudience, parseFormSchema } from "@/lib/forms";
import { RegistrationForm } from "./RegistrationForm";

// Matches the events grid format, e.g. "AUG 18, 2026".
function formatEventDateLong(date: Date): string {
  return date
    .toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
    .toUpperCase();
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await db.event.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  });
  if (event?.reviewStatus !== "approved" || !event.isPublished) notFound();

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

  const deadline = event.registrationDeadline ?? event.eventDate;
  const closed =
    (event.capacity != null && event._count.registrations >= event.capacity) ||
    (deadline ? new Date() > deadline : false);

  return (
    <RegistrationForm
      eventId={event.id}
      title={event.title}
      audience={audience}
      isMember={isMember}
      closed={closed}
      schema={parseFormSchema(event.formSchema)}
      dateLabel={formatEventDateLong(event.eventDate)}
      location={event.location}
      description={event.description}
      capacityLabel={
        event.capacity != null
          ? `${event._count.registrations} / ${event.capacity} REGISTERED`
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
