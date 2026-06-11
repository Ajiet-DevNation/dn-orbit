import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { CodeXml } from "lucide-react";

/**
 * Members page — Directory of all club members.
 *
 * Server Component that queries the users table directly. Shows each
 * member's name, USN, branch/year, and GitHub handle. Members who
 * haven't completed onboarding are shown with a "PROFILE_PENDING" tag.
 */
export default async function MembersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const members = await db.user.findMany({
    select: {
      id: true,
      name: true,
      usn: true,
      branch: true,
      year: true,
      githubUsername: true,
      image: true,
      role: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const adminCount = members.filter((m) => m.role === "admin").length;
  const memberCount = members.filter((m) => m.role === "member").length;

  return (
    <div className="p-8 space-y-12">
      <header className="border-b border-zinc-900 pb-12">
        <h1 className="text-7xl md:text-8xl font-black uppercase tracking-tighter leading-none italic">
          MEMBERS
        </h1>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-[10px] text-zinc-600 tracking-[0.4em] uppercase font-bold">
            ORBIT_MEMBER_DIRECTORY
          </span>
          <div className="h-px flex-1 bg-zinc-900" />
          <span className="text-[9px] text-zinc-500 tracking-widest uppercase">
            {members.length.toString().padStart(2, "0")}_TOTAL_AGENTS
          </span>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TacticalCard id="0xTOTAL" title="TOTAL_MEMBERS">
          <span className="text-4xl font-black italic text-white">
            {members.length.toString().padStart(2, "0")}
          </span>
        </TacticalCard>
        <TacticalCard id="0xADMIN" title="ADMINISTRATORS">
          <span className="text-4xl font-black italic text-white">
            {adminCount.toString().padStart(2, "0")}
          </span>
        </TacticalCard>
        <TacticalCard id="0xMEM" title="MEMBERS">
          <span className="text-4xl font-black italic text-white">
            {memberCount.toString().padStart(2, "0")}
          </span>
        </TacticalCard>
      </div>

      {/* Member grid */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black uppercase tracking-tighter">
            AGENT_ROSTER
          </h2>
          <div className="h-px flex-1 bg-zinc-900" />
        </div>

        {members.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                isCurrentUser={member.id === session.user.id}
              />
            ))}
          </div>
        ) : (
          <TacticalCard id="0xNULL" title="NO_MEMBERS" variant="dashed">
            <p className="text-[10px] text-zinc-600 tracking-widest uppercase">
              NO_MEMBER_RECORDS_FOUND
            </p>
          </TacticalCard>
        )}
      </section>
    </div>
  );
}

/* ── Sub-components ── */

function MemberCard({
  member,
  isCurrentUser,
}: {
  member: {
    id: string;
    name: string | null;
    usn: string | null;
    branch: string | null;
    year: number | null;
    githubUsername: string;
    image: string | null;
    role: string;
  };
  isCurrentUser: boolean;
}) {
  const isOnboarded = !!(member.usn && member.branch);

  return (
    <div
      className={`border p-5 space-y-4 transition-colors ${
        isCurrentUser
          ? "border-zinc-700 bg-zinc-950"
          : "border-zinc-900 hover:border-zinc-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black uppercase tracking-tighter text-white truncate">
              {member.name ?? "UNNAMED_AGENT"}
            </h3>
            {isCurrentUser && (
              <span className="text-[8px] text-black bg-white px-1.5 py-0.5 font-black tracking-widest uppercase shrink-0">
                You
              </span>
            )}
          </div>
          {isOnboarded ? (
            <p className="text-[9px] text-zinc-500 tracking-widest uppercase">
              {member.usn} · {member.branch}
              {member.year ? ` / Y${member.year}` : ""}
            </p>
          ) : (
            <p className="text-[9px] text-zinc-600 tracking-widest uppercase">
              PROFILE_PENDING
            </p>
          )}
        </div>

        <span
          className={`shrink-0 text-[8px] px-2 py-1 font-black tracking-widest uppercase ${
            member.role === "admin"
              ? "bg-amber-400 text-black"
              : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {member.role.toUpperCase()}
        </span>
      </div>

      <div className="pt-3 border-t border-zinc-900 flex items-center gap-2 text-[10px] text-zinc-500 tracking-widest uppercase">
        <CodeXml className="w-3 h-3" />
        <a
          href={`https://github.com/${member.githubUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors truncate"
        >
          @{member.githubUsername}
        </a>
      </div>
    </div>
  );
}
