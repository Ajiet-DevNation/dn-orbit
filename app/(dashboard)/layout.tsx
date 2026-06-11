import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MemberSidebar from "@/components/layout/MemberSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Route protection fallback (Middleware handles the primary protection)
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono flex">
      {/* Sidebar Navigation */}
      <MemberSidebar userName={session.user.name || "OPERATIVE"} />

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto h-screen">
        {/* Subtle dot grid background for the entire member dashboard area */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #3f3f46 1px, transparent 0)`,
            backgroundSize: `24px 24px`
          }}
        />
        
        <div className="relative z-10 w-full min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
