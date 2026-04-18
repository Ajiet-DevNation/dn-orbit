import { auth } from "@/lib/auth";
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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session?.user?.role !== "admin") {
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
      <aside className="w-72 border-r border-zinc-900 flex flex-col sticky top-0 h-screen bg-black z-50">
        <div className="p-8 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white flex items-center justify-center">
              <span className="text-black font-black text-xs">DN</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tighter leading-none">ORBIT</span>
              <span className="text-[9px] text-zinc-600 font-bold tracking-widest">COMMAND_SEC_V4</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 px-4 py-3 text-xs font-black tracking-widest text-zinc-500 hover:text-white hover:bg-zinc-950 transition-all border border-transparent hover:border-zinc-800 group"
            >
              <item.icon className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-zinc-900 space-y-4 bg-zinc-950/20">
          <div className="px-4 py-2 bg-red-950/10 border border-red-900/20 rounded-sm">
             <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] text-red-500/50 font-bold tracking-[0.2em]">ADM_SESSION</span>
                <div className="w-1 h-1 bg-red-500 animate-pulse" />
             </div>
             <div className="text-[10px] text-red-500 font-black tracking-tighter truncate uppercase italic">
                {session?.user?.name || "COMMANDER"}
             </div>
          </div>
          
          <SignOutButton className="w-full flex items-center justify-center gap-3 px-4 py-3 text-[10px] font-black tracking-[0.3em] uppercase bg-zinc-900 text-zinc-500 hover:bg-white hover:text-black transition-all border border-zinc-800 hover:border-white">
            <LogOut className="w-3 h-3" />
            TERMINATE
          </SignOutButton>
        </div>
      </aside>

      <main className="flex-1 relative bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat">
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
        <div className="relative z-10 w-full h-full overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
