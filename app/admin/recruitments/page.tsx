import { redirect } from "next/navigation";
import { PixelPageHeader } from "@/components/admin/PixelPageHeader";
import { PixelPanel } from "@/components/admin/PixelPanel";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isRecruitmentOpen } from "@/lib/recruitment-config";
import { canAccessAdmin } from "@/lib/roles";
import { RecruitmentsTable } from "./RecruitmentsTable";
import { RecruitmentToggle } from "./RecruitmentToggle";

export const metadata = {
  title: "RECRUITMENTS // ORBIT ADMIN",
};

export default async function AdminRecruitmentsPage() {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) redirect("/");

  const [open, applications] = await Promise.all([
    isRecruitmentOpen(),
    db.recruitmentApplication.findMany({
      // Bounded: one page view must never become an unbounded transfer.
      take: 500,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        usn: true,
        branch: true,
        year: true,
        whatsapp: true,
        about: true,
        githubUsername: true,
        lcUsername: true,
        linkedinUrl: true,
        xHandle: true,
        cvPath: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const pendingCount = applications.filter(
    (a) => a.status === "pending",
  ).length;

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PixelPageHeader
        title="RECRUITMENTS"
        subtitle="APPLICATION REVIEW QUEUE"
        code={`${pendingCount} PENDING`}
      />
      <PixelPanel title="RECRUITMENT STATUS">
        <RecruitmentToggle initialOpen={open} />
      </PixelPanel>
      <RecruitmentsTable
        applications={applications.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
