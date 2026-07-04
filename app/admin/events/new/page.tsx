import { redirect } from "next/navigation";
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
    <div className="p-8 space-y-12">
      <header className="border-b border-white/10 pb-12">
        <h1 className="retro text-2xl uppercase tracking-wider leading-relaxed text-white">
          INJECT_EVENT
        </h1>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-[10px] text-zinc-600 tracking-[0.4em] uppercase font-bold">
            SECURE_GENERATOR_V1
          </span>
          <div className="h-px flex-1 bg-zinc-900" />
        </div>
      </header>

      <EventCreationForm />
    </div>
  );
}
