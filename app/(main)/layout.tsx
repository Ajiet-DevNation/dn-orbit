import { Press_Start_2P } from "next/font/google";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AsciiBackground } from "@/components/v2/AsciiBackground";
import { V2Header } from "./_sections/V2Header";
import type { ProfileData } from "./_sections/ProfileModal";

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
      <AsciiBackground />
      <div className="relative" style={{ zIndex: 2 }}>
        <V2Header
          userName={session?.user?.name ?? null}
          userImage={session?.user?.image ?? null}
          isAuthenticated={!!session?.user}
          profile={profile}
        />
        {children}
      </div>
    </div>
  );
}
