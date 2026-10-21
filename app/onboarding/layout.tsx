import { auth } from "@/lib/auth";
import { Providers } from "../providers";

// The onboarding form is the only client consumer of the NextAuth session
// (useSession().update() after saving), so the provider lives here rather than
// wrapping — and serialising the session into — every page of the site.
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolved on the server so the provider hydrates without firing its own
  // /api/auth/session request on mount.
  const session = await auth();
  return <Providers session={session}>{children}</Providers>;
}
