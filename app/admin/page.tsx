import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { db } from "@/lib/db";

export default async function AdminDashboard() {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  const totalUsers = await db.user.count();
  const totalEvents = await db.event.count();
  const totalProjects = await db.project.count();
  
  const registrationsToday = await db.registration.count({
    where: {
      registeredAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    }
  });

  return (
    <div className="flex-1 bg-black min-h-screen font-mono text-white selection:bg-white selection:text-black">
      {/* Noise Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      {/* Scanline Effect */}
      <div className="relative z-10 p-8 space-y-12 max-w-[1400px] mx-auto">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-800 pb-12 gap-8">
          <div className="space-y-4">
            <div className="bg-white text-black inline-block px-2 py-0.5 text-[10px] font-black tracking-widest uppercase">
              SYSTEM_ACCESS_GRANTED
            </div>
            <h1 className="text-7xl font-black uppercase tracking-tighter leading-none max-w-lg">
              ORBIT<br />COMMAND
              <span className="block text-3xl text-zinc-700 tracking-tight mt-4">(SYSTEM_CORE)</span>
            </h1>
          </div>

          <div className="w-full md:w-80 space-y-2">
             <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold flex items-center gap-2">
                SEARCH_ARCHIVE
             </div>
             <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center text-zinc-600 group-focus-within:text-white transition-colors">
                   Q_
                </div>
                <input 
                  type="text" 
                  placeholder="QUERY_ID_OR_KEYWORDS" 
                  className="w-full bg-transparent border border-zinc-800 py-3 pl-10 pr-4 text-xs font-bold uppercase tracking-widest placeholder:text-zinc-800 focus:outline-none focus:border-white transition-all"
                />
             </div>
          </div>
        </header>

        {/* WORKSHOPS Section */}
        <section className="space-y-8">
          <header className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <h2 className="text-2xl font-black uppercase tracking-tighter">WORKSHOPS</h2>
            <span className="text-[9px] text-zinc-700 uppercase tracking-widest font-bold">/ROOT/DRIVE/WORKSHOPS</span>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TacticalCard 
              title="MEMBER_ADMIN" 
              subtitle="DIRECT NODE CONTROL"
              status="URGENT_FILE"
              variant="default"
              className="lg:col-span-2"
            >
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="w-24 h-24 bg-zinc-900 flex items-center justify-center p-6 border border-zinc-800">
                   <div className="w-full h-full border-t-2 border-l-2 border-white/20" />
                </div>
                <div className="flex-1 space-y-4">
                  <p className="text-zinc-400 text-xs leading-relaxed uppercase">
                    Access high-level member directory. Reset keys, adjust clearance levels, and verify identity stamps for {totalUsers} active nodes.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-zinc-900 text-zinc-600 px-2 py-1 text-[8px] border border-zinc-800 font-bold tracking-widest">RBAC_v4</span>
                    <span className="bg-zinc-900 text-zinc-600 px-2 py-1 text-[8px] border border-zinc-800 font-bold tracking-widest">CLEARANCE_L7</span>
                  </div>
                  <TacticalButton size="lg" className="mt-4">ENTER_DIRECTORY</TacticalButton>
                </div>
              </div>
            </TacticalCard>

            <TacticalCard 
              title="SYSTEM_LOGS" 
              subtitle="UPLINK MONITORING"
              variant="dashed"
            >
               <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-zinc-900 pb-2">
                     <span className="text-[10px] text-zinc-600">DATE: 2024.10.12</span>
                     <span className="text-[10px] text-zinc-600">LOC: LAB_E604_02</span>
                  </div>
                  <div className="text-[10px] space-y-1 font-bold group-hover:animate-pulse">
                     <p className="text-white">ACCESSING_KERNEL_LOGS...</p>
                     <p className="text-zinc-600"> {registrationsToday} NEW REGS DETECTED </p>
                     <p className="text-zinc-700"> PI_SCAN: SUCCESS </p>
                  </div>
                  <div className="flex gap-1">
                     {[...Array(20)].map((_, i) => (
                       <div key={i} className={`h-2 w-1 ${i < 12 ? 'bg-white' : 'bg-zinc-900'}`} />
                     ))}
                  </div>
               </div>
            </TacticalCard>
          </div>
        </section>

        {/* SHARED REPOSITORIES Section */}
        <section className="space-y-8">
          <header className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <h2 className="text-2xl font-black uppercase tracking-tighter">SHARED REPOSITORIES</h2>
            <TacticalButton variant="outline" size="sm" prefix="[">SUBMIT_REPO</TacticalButton>
          </header>

          <div className="space-y-4">
            {[
              { id: "GITHUB_STATS", label: "STAT_PIPELINE_v2", status: "STABLE", count: totalProjects },
              { id: "LC_INTEGRATION", label: "LEETCODE_HOOKS", status: "EXPERIMENTAL", count: totalUsers },
              { id: "LEADERBOARD", label: "SCORING_ENGINE", status: "STABLE", count: 1 }
            ].map((repo) => (
              <div key={repo.id} className="border border-zinc-800 p-4 bg-zinc-950/20 hover:bg-white/5 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                   <div className="w-1 h-8 bg-zinc-800 group-hover:bg-white transition-colors" />
                   <div>
                      <div className="flex items-center gap-2">
                         <span className="text-sm font-black uppercase tracking-tighter">{repo.id}</span>
                         <span className="text-[8px] bg-zinc-800 px-1 text-zinc-500 font-bold border border-zinc-700 uppercase tracking-widest">{repo.status}</span>
                      </div>
                      <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-1">MODULE_ID: {repo.label}</p>
                   </div>
                </div>
                <div className="flex items-center gap-8">
                   <div className="text-right">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600">
                         <span>STARS: {repo.count + 42}</span>
                         <span>FORKS: {repo.count + 7}</span>
                      </div>
                   </div>
                   <TacticalButton variant="ghost" size="sm" prefix="">OPEN</TacticalButton>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer Stats / Contributing */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-zinc-900">
           <div className="space-y-6">
              <h3 className="text-lg font-black uppercase tracking-widest border-b border-zinc-900 pb-2">TOP_CONTRIBUTOR_OF_MONTH</h3>
              <div className="flex gap-6 items-center">
                 <div className="w-20 h-24 bg-zinc-900 border border-white/20 p-2 relative">
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-white text-black flex items-center justify-center text-[10px] font-black">#1</div>
                 </div>
                 <div className="flex-1 space-y-2">
                    <p className="text-xs text-zinc-400 leading-relaxed italic">
                      "SYSTEM DESIGN IS NOT A CHOICE, IT'S A REQUIREMENT. WE MUST BUILD BETTER TOOLS FOR OUR CLUB'S FUTURE."
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest">
                       @ADMIN_ROOT // <span className="text-zinc-600 italic">EST. 2024</span>
                    </p>
                 </div>
              </div>
           </div>
           
           <div className="flex flex-col items-center justify-center p-12 border border-zinc-900 bg-zinc-950/20 text-center space-y-4">
              <div className="w-16 h-16 border-2 border-white animate-spin-slow flex items-center justify-center rounded-full">
                 <div className="w-8 h-8 bg-white" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter leading-none">JOIN THE COLLECTIVE</h3>
                <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-2">CLICK TO INITIALIZE MEMBERSHIP</p>
              </div>
              <TacticalButton size="lg" variant="outline" className="mt-8 border-dashed">INITIATE_SESSION</TacticalButton>
           </div>
        </section>

        <footer className="pt-12 text-[9px] text-zinc-700 uppercase tracking-[0.4em] flex flex-wrap justify-between gap-4 font-bold">
           <span>©2024_TACTICAL_ARCHIVE_CS_CLUB</span>
           <div className="flex gap-8">
              <span className="hover:text-white cursor-pointer transition-colors">DATA_PRIVACY</span>
              <span className="hover:text-white cursor-pointer transition-colors">STAMP_VERIFIED</span>
              <span className="hover:text-white cursor-pointer transition-colors">ENCRYPTED_LINE</span>
           </div>
        </footer>

      </div>
    </div>
  );
}