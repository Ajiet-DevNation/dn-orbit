import { redirect } from "next/navigation";
import { PixelPageHeader } from "@/components/admin/PixelPageHeader";
import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import EventCreationForm from "./EventCreationForm";

export const metadata = {
  title: "NEW EVENT // ORBIT ADMIN",
};

export default async function AdminNewEventPage() {
  const session = await auth();

  // Guard: Admin clearance only
  if (!canAccessAdmin(session?.user?.role)) {
    redirect("/");
  }

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PixelPageHeader title="NEW EVENT" subtitle="EVENT BUILDER" />

      <EventCreationForm />
    </div>
  );
}
