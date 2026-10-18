import { isRecruitmentOpen } from "@/lib/recruitment-config";
import { RecruitmentForm } from "./RecruitmentForm";

export const metadata = {
  title: "Join DevNation · ORBIT",
};

// Server Component: the open/closed check runs here so a closed drive never
// ships the form. The POST route re-checks, since the switch can flip mid-fill.
export default async function RecruitmentsPage() {
  return <RecruitmentForm open={await isRecruitmentOpen()} />;
}
