import { redirect } from "next/navigation";
import { PixelPageHeader } from "@/components/admin/PixelPageHeader";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";
import { RequestsTable } from "./RequestsTable";

export const metadata = {
  title: "ACCESS REQUESTS // ORBIT ADMIN",
};

export default async function AdminRequestsPage() {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) redirect("/");

  const requests = await db.user.findMany({
    // Bounded: one page view must never become an unbounded transfer.
    take: 500,
    where: { status: { in: ["pending", "rejected"] } },
    select: {
      id: true,
      name: true,
      email: true,
      usn: true,
      branch: true,
      year: true,
      githubUsername: true,
      status: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PixelPageHeader
        title="ACCESS REQUESTS"
        subtitle="MEMBERSHIP VERIFICATION QUEUE"
        code={`${pendingCount} PENDING`}
      />
      <RequestsTable initialRequests={requests} />
    </div>
  );
}
