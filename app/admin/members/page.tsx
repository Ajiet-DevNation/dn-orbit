import { redirect } from "next/navigation";
import { PixelPageHeader } from "@/components/admin/PixelPageHeader";
import { PixelStatTile } from "@/components/admin/PixelStatTile";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";
import { AllowlistManager } from "./AllowlistManager";
import { MemberTable } from "./MemberTable";

export const metadata = {
  title: "MEMBERS // ADMIN",
};

export default async function AdminMembersPage() {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) {
    redirect("/");
  }

  const [roleCounts, users, allowlist] = await Promise.all([
    // Tiles count in the DB; the list below is capped at 500.
    db.user.groupBy({ by: ["role"], _count: true }),
    db.user.findMany({
      // Bounded: one page view must never become an unbounded transfer.
      take: 500,
      select: {
        id: true,
        name: true,
        email: true,
        usn: true,
        role: true,
        branch: true,
        year: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    db.allowlist.findMany({
      // Bounded: one page view must never become an unbounded transfer.
      take: 500,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const countWhere = (
    match: (role: (typeof roleCounts)[number]["role"]) => boolean,
  ) => roleCounts.reduce((n, c) => (match(c.role) ? n + c._count : n), 0);
  const adminCount = countWhere((r) => canAccessAdmin(r));
  const memberCount = countWhere((r) => r === "member");
  const ajietCount = countWhere((r) => r === "ajiet_student");

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PixelPageHeader
        title="MEMBER DIRECTORY"
        subtitle="ORBIT_USER_REGISTRY_v4.5"
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <PixelStatTile
          label="ADMINS"
          value={adminCount.toString().padStart(2, "0")}
        />
        <PixelStatTile
          label="MEMBERS"
          value={memberCount.toString().padStart(2, "0")}
        />
        <PixelStatTile
          label="AJIET STUDENTS"
          value={ajietCount.toString().padStart(2, "0")}
        />
      </div>

      <div className="space-y-4">
        <div className="retro text-[9px] tracking-widest text-zinc-500 border-b-2 border-white/10 pb-2">
          MEMBER_NODES
        </div>
        <MemberTable
          initialMembers={users}
          currentUserId={session?.user?.id || ""}
          currentUserRole={session?.user?.role || "member"}
        />
      </div>

      <AllowlistManager
        initialEntries={allowlist.map((a) => ({
          id: a.id,
          githubUsername: a.githubUsername,
          email: a.email,
          note: a.note,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
