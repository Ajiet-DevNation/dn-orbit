import { redirect } from "next/navigation";
import { PixelPageHeader } from "@/components/admin/PixelPageHeader";
import { PixelStatTile } from "@/components/admin/PixelStatTile";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isRecruitmentOpen } from "@/lib/recruitment-config";
import { canAccessAdmin } from "@/lib/roles";
import { ApplicationsQueue } from "./ApplicationsQueue";
import { RecruitmentToggle } from "./RecruitmentToggle";

export const metadata = {
  title: "RECRUITMENTS // ADMIN",
};

export default async function AdminRecruitmentsPage() {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) redirect("/");

  const [open, statusCounts, applications] = await Promise.all([
    isRecruitmentOpen(),
    // Tiles count in the DB: the list below is capped, so counting its rows
    // under-reported every total once a drive passed 500 applications.
    db.recruitmentApplication.groupBy({ by: ["status"], _count: true }),
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

  const count = (status: string) =>
    statusCounts.find((c) => c.status === status)?._count ?? 0;
  const total = statusCounts.reduce((n, c) => n + c._count, 0);
  const pendingCount = count("pending");

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PixelPageHeader
        title="RECRUITMENTS"
        subtitle="APPLICATION REVIEW QUEUE"
        code={`${pendingCount} PENDING`}
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <PixelStatTile label="TOTAL" value={total} />
        <PixelStatTile label="PENDING" value={pendingCount} />
        <PixelStatTile label="ACCEPTED" value={count("approved")} />
        <PixelStatTile label="REJECTED" value={count("rejected")} />
      </div>
      <RecruitmentToggle initialOpen={open} />
      <ApplicationsQueue
        applications={applications.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
