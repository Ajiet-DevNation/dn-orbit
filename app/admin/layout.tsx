import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TacticalButton } from "@/components/ui/TacticalButton";
import Link from "next/link";

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
    { label: "01_DASHBOARD", href: "/admin", id: "DRV_01" },
    { label: "02_MEMBERS", href: "/admin/members", id: "DRV_02" },
    { label: "03_EVENTS", href: "/admin/events", id: "DRV_03" },
    { label: "04_PROJECTS", href: "/admin/projects", id: "DRV_04" },
    { label: "05_LEADERBOARD", href: "/admin/leaderboard", id: "DRV_05" },
  ];

  return (
    <div className="flex min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      {/* Sidebar */}
      <aside className="w-72 border-r border-zinc-900 flex flex-col p-8 sticky top-0 h-screen bg-black z-50">
        <div className="mb-16">
          <Link href="/" className="text-3xl font-black italic tracking-tighter hover:opacity-70 transition-opacity">
            DN_ORBIT
            <span className="block text-[10px] tracking-[0.4em] not-italic text-zinc-600 mt-2">// ADMINISTRATION</span>
          </Link>
          <div className="h-[1px] w-full bg-zinc-800 mt-6" />
        </div>

        <nav className="flex-1 space-y-6">
          <div className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 mb-6 font-black italic underline decoration-zinc-800 underline-offset-4">NAVIGATION</div>
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className="block group"
            >
              <div className="flex flex-col gap-1 transition-transform group-hover:translate-x-1">
                <div className="flex items-center gap-3">
                   <span className="text-zinc-800 group-hover:text-white transition-colors">{"//"}</span>
                   <span className="text-xs font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">{item.label}</span>
                </div>
                <span className="text-[8px] text-zinc-800 ml-7 tracking-[0.5em] font-bold">{item.id}</span>
              </div>
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-10 border-t border-zinc-900 space-y-8">
           <div className="flex items-center gap-4">
              <div className="w-10 h-12 bg-zinc-950 text-white flex items-center justify-center font-black text-sm border border-zinc-800 relative">
                 {session.user.name?.[0].toUpperCase() || "A"}
                 <div className="absolute -top-1 -right-1 w-2 h-2 bg-white" />
              </div>
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-[10px] font-black truncate uppercase tracking-tighter">{session.user.name || "Administrator"}</span>
                <span className="text-[8px] text-zinc-600 uppercase tracking-[0.3em] font-bold mt-1">ADMINISTRATOR</span>
              </div>
           </div>
           
           <div className="space-y-2">
              <div className="text-[8px] text-zinc-800 font-bold tracking-widest uppercase">System: Online</div>
              <TacticalButton variant="danger" size="sm" prefix="" className="w-full group">
                LOGOUT
              </TacticalButton>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Background Scanline Overlay */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
        {children}
      </main>
    </div>
  );
}
