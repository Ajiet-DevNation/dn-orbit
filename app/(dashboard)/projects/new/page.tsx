import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";
import { ProjectSubmitForm } from "./ProjectSubmitForm";

export const metadata = {
  title: "SUBMIT PROJECT // ORBIT",
};

export default async function SubmitProjectPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="p-8 space-y-12">
      <header className="border-b border-zinc-900 pb-12">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-[9px] text-zinc-600 tracking-[0.3em] uppercase hover:text-zinc-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-3 h-3" />
          ALL_PROJECTS
        </Link>
        <h1 className="text-7xl md:text-8xl font-black uppercase tracking-tighter leading-none italic mt-4">
          SUBMIT<br />PROJECT
        </h1>
        <p className="text-[10px] text-zinc-600 tracking-[0.4em] uppercase font-bold mt-4">
          PROJECT WILL BE REVIEWED BY ADMIN BEFORE GOING LIVE
        </p>
      </header>

      <ProjectSubmitForm />
    </div>
  );
}
