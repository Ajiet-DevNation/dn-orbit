import { connection } from "next/server";
import { isRecruitmentOpen } from "@/lib/recruitment-config";
import { RecruitmentForm } from "./RecruitmentForm";

export const metadata = {
  title: "Join DevNation",
};

// Server Component: the open/closed check runs here so a closed drive never
// ships the form. The POST route re-checks, since the switch can flip mid-fill.
export default async function RecruitmentsPage() {
  // Per request, never prerendered: a build-time render would freeze the
  // switch's state (the toggle doesn't revalidate this path) and needs a DB.
  await connection();
  return <RecruitmentForm open={await isRecruitmentOpen()} />;
}
