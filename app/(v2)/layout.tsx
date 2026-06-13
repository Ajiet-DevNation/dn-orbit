import { Press_Start_2P } from "next/font/google";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AsciiBackground } from "@/components/v2/AsciiBackground";
import { Toaster } from "@/components/ui/8bit-toast";
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
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Full editable profile for the avatar's edit modal (session lacks year/bio).
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      usn: true,
      branch: true,
      year: true,
      lcUsername: true,
      bio: true,
    },
  });

  const profile: ProfileData = {
    name: dbUser?.name ?? session.user.name ?? "",
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
          userName={session.user.name ?? null}
          userImage={session.user.image ?? null}
          profile={profile}
        />
        {children}
      </div>
      <Toaster />
    </div>
  );
}
