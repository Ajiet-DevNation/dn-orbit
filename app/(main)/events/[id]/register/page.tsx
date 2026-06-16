import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseFormSchema, type EventAudience } from "@/lib/forms";
import { RegistrationForm } from "./RegistrationForm";

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
  if (!event || !event.isPublished) notFound();

  const audience = event.audience as EventAudience;
  const session = await auth();

  if (audience === "members" && !session) {
    redirect(`/login?callbackUrl=/events/${id}/register`);
  }

  const deadline = event.registrationDeadline ?? event.eventDate;
  const closed =
    (event.capacity != null && event._count.registrations >= event.capacity) ||
    (deadline ? new Date() > deadline : false);

  return (
    <RegistrationForm
      eventId={event.id}
      title={event.title}
      audience={audience}
      closed={closed}
      schema={parseFormSchema(event.formSchema)}
      prefill={
        audience === "members" && session
          ? { name: session.user.name ?? "", email: session.user.email ?? "" }
          : null
      }
    />
  );
}
