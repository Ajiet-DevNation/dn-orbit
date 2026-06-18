import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!canAccessAdmin(session?.user?.role)) {
    redirect("/");
  }

  return (
    // `dark` so the 8-bit components and CSS theme vars (--foreground, --ring …)
    // resolve to the dark theme like the rest of the app. Without it, admin sat
    // in the light theme and `text-foreground` rendered near-black (e.g. the
    // description textarea was invisible).
    <div className="dark min-h-screen bg-black text-white font-mono">
      <AdminSidebar userName={session?.user?.name ?? null} />

      {/* Offset for the fixed sidebar on desktop; full width on mobile. The
          pt-14 clears the floating hamburger on small screens. */}
      <main className="dot-grid-bg relative min-h-screen md:ml-72">
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
        <div className="relative z-10 w-full pt-14 md:pt-0">{children}</div>
      </main>
    </div>
  );
}
