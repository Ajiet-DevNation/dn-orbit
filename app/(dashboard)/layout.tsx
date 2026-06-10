import { auth } from "@/lib/auth";
import { MemberSidebar } from "@/components/layout/MemberSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-black text-white font-mono flex">
      <MemberSidebar userName={session?.user?.name ?? "MEMBER"} />

      <main className="flex-1 relative bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat">
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
        <div className="relative z-10 w-full h-full overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
