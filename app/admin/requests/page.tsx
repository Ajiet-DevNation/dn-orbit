import { redirect } from "next/navigation";
import { AdminHeading } from "@/components/ui/AdminHeading";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";
import { RequestsTable } from "./RequestsTable";

export default async function AdminRequestsPage() {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) redirect("/");

  const requests = await db.user.findMany({
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
    <div className="space-y-12 p-8">
      <AdminHeading
        title="ACCESS REQUESTS"
        sub="MEMBERSHIP_VERIFICATION_QUEUE"
        code={`${pendingCount} PENDING`}
      />
      <RequestsTable initialRequests={requests} />
    </div>
  );
}
