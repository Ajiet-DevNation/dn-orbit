import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MemberTable } from "./MemberTable";
import { TacticalButton } from "@/components/ui/TacticalButton";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  const { q } = await searchParams;

  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  // Fetch users with search filter if present
  const users = await db.user.findMany({
    where: {
      OR: q ? [
        { name: { contains: q, mode: 'insensitive' } },
        { usn: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } }
      ] : undefined
    },
    select: {
      id: true,
      name: true,
      email: true,
      usn: true,
      role: true,
      branch: true,
      year: true,
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="flex-1 bg-black p-8 space-y-12">
      {/* Header Info */}
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-900 pb-12 gap-8">
        <div className="space-y-4">
          <div className="bg-white text-black inline-block px-2 py-0.5 text-[10px] font-black tracking-widest uppercase">
            DIRECTORY_STAMP: VERIFIED
          </div>
          <h1 className="text-6xl font-black uppercase tracking-tighter leading-none">
            MEMBER<br />NODES
            <span className="block text-2xl text-zinc-700 tracking-tight mt-4">(ROOT_DIRECTORY_V2.1)</span>
          </h1>
        </div>

        <div className="w-full md:w-96 space-y-2">
           <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold flex items-center gap-2">
              INITIATE_SEARCH
           </div>
           <form className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center text-zinc-600 group-focus-within:text-white transition-colors">
                 Q_
              </div>
              <input 
                name="q"
                defaultValue={q}
                type="text" 
                placeholder="QUERY_IDENTIFIER" 
                className="w-full bg-transparent border border-zinc-800 py-3 pl-10 pr-4 text-xs font-bold uppercase tracking-widest placeholder:text-zinc-800 focus:outline-none focus:border-white transition-all"
              />
           </form>
        </div>
      </header>

      {/* Main Table Interface */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
           <div className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">NODE_LIST (ACTIVE)</div>
           <div className="flex items-center gap-4">
              <div className="text-[9px] text-zinc-800 uppercase tracking-widest font-bold">CLEARANCE_LEVEL: ADMIN_ONLY</div>
              <div className="w-2 h-2 bg-white animate-pulse" />
           </div>
        </div>
        
        <MemberTable initialMembers={users as any} />
      </section>

      {/* Footer Meta */}
      <footer className="pt-12 border-t border-zinc-900 flex justify-between items-center text-[9px] text-zinc-700 uppercase tracking-[0.4em] font-bold">
         <span>©2024_TACTICAL_ARCHIVE_CS_CLUB</span>
         <div className="flex gap-8">
            <span className="hover:text-white cursor-pointer transition-colors">SECTOR_E604</span>
            <span className="hover:text-white cursor-pointer transition-colors">UPLINK_STABLE</span>
         </div>
      </footer>
    </div>
  );
}
