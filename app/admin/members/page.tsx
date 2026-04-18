import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { MemberTable } from "./MemberTable";

interface MemberRecord {
  id: string;
  name: string | null;
  email: string | null;
  usn: string | null;
  role: "admin" | "member";
  branch: string | null;
  year: number | null;
}

export default async function AdminMembersPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  const usersRaw = await db.user.findMany({
    orderBy: {
      createdAt: "desc"
    }
  });

  const users = usersRaw as unknown as MemberRecord[];

  const adminCount = users.filter(u => u.role === "admin").length;
  const memberCount = users.filter(u => u.role === "member").length;

  return (
    <div className="space-y-12 p-8">
      <header className="border-b border-zinc-900 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <h1 className="text-8xl font-black uppercase tracking-tighter leading-none italic">
              MEMBER<br />DIRECTORY
            </h1>
            <p className="text-xs text-zinc-600 tracking-[0.4em] uppercase font-bold">
              ORBIT_USER_REGISTRY_v4.5
            </p>
          </div>
          
          <div className="flex gap-4">
            <TacticalCard variant="dashed" className="w-40 py-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">ADMINS</span>
                <span className="text-4xl font-black italic">{adminCount.toString().padStart(2, '0')}</span>
              </div>
            </TacticalCard>
            <TacticalCard variant="dashed" className="w-40 py-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">MEMBERS</span>
                <span className="text-4xl font-black italic">{memberCount.toString().padStart(2, '0')}</span>
              </div>
            </TacticalCard>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
          <div className="text-xl font-black uppercase tracking-tighter">MEMBER_NODES</div>
          <div className="text-[8px] text-zinc-800 uppercase tracking-widest font-bold">STATUS: COMPLIANT</div>
        </div>
        
        <MemberTable initialMembers={users} currentUserId={session?.user?.id || ""} />
      </div>
    </div>
  );
}
