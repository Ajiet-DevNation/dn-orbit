import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/features/profile/ProfileForm";

/**
 * Profile page — User dossier management.
 *
 * Server Component that fetches the user's current profile from the DB
 * and passes it to the client-side ProfileForm for editing.
 */
export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      usn: true,
      branch: true,
      year: true,
      lcUsername: true,
      bio: true,
      isVisible: true,
      githubUsername: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const joinDate = user.createdAt.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-8 space-y-12">
      <header className="border-b border-zinc-900 pb-12">
        <h1 className="text-7xl md:text-8xl font-black uppercase tracking-tighter leading-none italic">
          PROFILE
        </h1>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-[10px] text-zinc-600 tracking-[0.4em] uppercase font-bold">
            ORBIT_AGENT_DOSSIER
          </span>
          <div className="h-px flex-1 bg-zinc-900" />
          <span className="text-[9px] text-zinc-500 tracking-widest uppercase">
            ID_{session.user.id.substring(0, 8).toUpperCase()}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ProfileForm
            initialData={{
              name: user.name,
              usn: user.usn,
              branch: user.branch,
              year: user.year,
              lcUsername: user.lcUsername,
              bio: user.bio,
              isVisible: user.isVisible,
            }}
          />
        </div>

        <div className="space-y-6">
          <div className="border border-zinc-900 p-6 space-y-4">
            <h3 className="text-xs font-black tracking-widest uppercase text-white border-b border-zinc-900 pb-2">
              SYSTEM_RECORD
            </h3>
            <div className="space-y-3 pt-2">
              <RecordRow label="ROLE" value={user.role.toUpperCase()} />
              <RecordRow label="GITHUB" value={`@${user.githubUsername}`} />
              <RecordRow label="EMAIL" value={user.email} />
              <RecordRow label="JOINED" value={joinDate} />
            </div>
          </div>
          
          <div className="border border-zinc-900/50 bg-zinc-950/30 p-4">
            <p className="text-[9px] text-zinc-500 tracking-widest uppercase leading-relaxed">
              Your profile information is used for leaderboard tracking, event registrations, and the member directory. Ensure your LeetCode username is accurate for nightly synchronization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[8px] text-zinc-600 tracking-widest uppercase mb-1">
        {label}
      </span>
      <span className="block text-xs font-mono text-zinc-300 truncate">
        {value}
      </span>
    </div>
  );
}
