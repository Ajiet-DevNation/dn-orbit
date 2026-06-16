import { auth } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import { redirect } from "next/navigation";
import { 
  Users, 
  Calendar, 
  Settings, 
  LayoutDashboard, 
  LogOut,
  Trophy,
  Rocket
} from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { SidebarBrand } from "@/components/layout/SidebarBrand";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!canAccessAdmin(session?.user?.role)) {
    redirect("/");
  }

  const navItems = [
    { label: "OVERVIEW", href: "/admin", icon: LayoutDashboard },
    { label: "MEMBERS", href: "/admin/members", icon: Users },
    { label: "EVENTS", href: "/admin/events", icon: Calendar },
    { label: "PROJECTS", href: "/admin/projects", icon: Rocket },
    { label: "LEADERBOARD", href: "/admin/leaderboard", icon: Trophy },
    { label: "SETTINGS", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-mono flex">
      {/* Sidebar Navigation */}
      <aside className="w-72 border-r-2 border-white/10 flex flex-col sticky top-0 h-screen bg-black z-50">
        <SidebarBrand sectorLabel="COMMAND_SEC_V4" />

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="retro flex items-center gap-4 px-4 py-3 text-[9px] tracking-widest text-zinc-500 hover:text-[#22c55e] hover:bg-[#22c55e]/[0.06] transition-all border-2 border-transparent hover:border-[#22c55e]/30 group"
            >
              <item.icon className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:text-[#22c55e] transition-all" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t-2 border-white/10 space-y-4 bg-[#22c55e]/[0.03]">
          <div className="px-4 py-3 bg-[#22c55e]/[0.06] border-2 border-[#22c55e]/20">
             <div className="flex items-center justify-between mb-2">
                <span className="retro text-[7px] text-[#22c55e]/60 tracking-[0.2em]">ADM_SESSION</span>
                <div className="w-1 h-1 bg-[#22c55e] animate-pulse" />
             </div>
             <div className="retro text-[9px] text-[#22c55e] tracking-tighter truncate uppercase">
                {session?.user?.name || "COMMANDER"}
             </div>
          </div>

          <SignOutButton className="retro w-full flex items-center justify-center gap-3 px-4 py-3 text-[8px] tracking-[0.3em] uppercase bg-transparent text-zinc-500 hover:bg-[#22c55e] hover:text-black transition-all border-2 border-white/20 hover:border-[#22c55e]">
            <LogOut className="w-3 h-3" />
            TERMINATE
          </SignOutButton>
        </div>
      </aside>

      <main className="flex-1 relative dot-grid-bg">
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
        <div className="relative z-10 w-full h-full overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
