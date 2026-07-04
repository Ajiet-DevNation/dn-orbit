import { Press_Start_2P } from "next/font/google";
import { redirect } from "next/navigation";
import { AsciiBackground } from "@/components/home/AsciiBackground";
import { PendingBanner } from "@/components/home/PendingBanner";
import type { ProfileData } from "@/components/home/ProfileModal";
import { V2Header } from "@/components/layout/V2Header";
import { BootSplash } from "@/components/ui/BootSplash";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export default async function V2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The landing page is public — render for anonymous visitors too. The avatar /
  // profile modal and personal data are only fetched (and shown) when signed in.
  const session = await auth();

  // Full editable profile for the avatar's edit modal (session lacks year/bio).
  const dbUser = session?.user
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          usn: true,
          branch: true,
          year: true,
          lcUsername: true,
          bio: true,
        },
      })
    : null;

  // Onboarding gate (authoritative, DB-backed). The Edge proxy also does this
  // via the JWT, but its getToken() read can disagree with the app session (e.g.
  // cookie/secret edge cases), letting signed-in-but-not-onboarded users slip
  // onto the site. Checking the live DB row here guarantees new members land on
  // /onboarding. `/onboarding` lives outside this layout, so there's no loop.
  if (
    session?.user &&
    dbUser &&
    !(dbUser.usn && dbUser.branch && dbUser.lcUsername)
  ) {
    redirect("/onboarding");
  }

  const profile: ProfileData = {
    name: dbUser?.name ?? session?.user?.name ?? "",
    usn: dbUser?.usn ?? "",
    branch: dbUser?.branch ?? "",
    year: dbUser?.year ?? null,
    lcUsername: dbUser?.lcUsername ?? "",
    bio: dbUser?.bio ?? "",
  };

  return (
    <div
      data-v2
      className={`${pixelFont.variable} dark relative bg-[#0a0a0a] min-h-screen`}
    >
      {/* Boot-splash overlay: paints with the initial shell and guarantees the
          pixel DN-logo draw plays before fading (see BootSplash). */}
      <BootSplash />
      <AsciiBackground />
      <div className="relative" style={{ zIndex: 2 }}>
        {session?.user?.status === "pending" && <PendingBanner />}
        <V2Header
          userName={session?.user?.name ?? null}
          userImage={session?.user?.image ?? null}
          isAuthenticated={!!session?.user}
          profile={profile}
          role={session?.user?.role ?? null}
          isAdmin={canAccessAdmin(session?.user?.role)}
        />
        {children}
      </div>
    </div>
  );
}
