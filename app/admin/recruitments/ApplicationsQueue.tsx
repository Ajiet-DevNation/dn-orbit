"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/8bit-toast";
import { useConfirm } from "@/components/ui/PixelConfirm";
import type { ApprovalStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

interface Application {
  id: string;
  name: string;
  email: string;
  usn: string;
  branch: string;
  year: number;
  whatsapp: string;
  about: string;
  githubUsername: string;
  lcUsername: string;
  linkedinUrl: string | null;
  xHandle: string | null;
  cvPath: string | null;
  status: string;
  createdAt: string;
}

// "approved" in the DB reads as ACCEPTED here — recruitment vocabulary.
const STATUS_TEXT: Record<string, string> = {
  pending: "PENDING",
  approved: "ACCEPTED",
  rejected: "REJECTED",
};

const STATUS_CHIP: Record<string, string> = {
  pending: "border-zinc-600 text-zinc-400",
  approved: "border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]",
  rejected: "border-red-500/50 bg-red-500/10 text-red-400",
};

type Filter = "all" | "pending" | "approved" | "rejected";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "pending", label: "PENDING" },
  { key: "approved", label: "ACCEPTED" },
  { key: "rejected", label: "REJECTED" },
];

const btn =
  "retro border-2 px-3 py-1.5 text-[8px] transition-colors disabled:opacity-50";

const chip =
  "retro border-2 border-white/10 px-2.5 py-1.5 text-[8px] tracking-widest";

const profileChip = `${chip} text-[#22c55e] transition-colors hover:border-[#22c55e] hover:bg-[#22c55e]/10`;

function ProfileLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={profileChip}>
      {children}
    </a>
  );
}

export function ApplicationsQueue({
  applications,
}: {
  applications: Application[];
}) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>(
    applications.some((a) => a.status === "pending") ? "pending" : "all",
  );
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  const toggleAbout = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const submit = (id: string, status: Exclude<ApprovalStatus, "pending">) =>
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/recruitments/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { emailed } = (await res.json()) as { emailed: boolean };
        router.refresh();
        const done =
          status === "approved"
            ? "Application accepted"
            : "Application rejected";
        if (emailed) toast.success(`${done} · email sent`);
        else toast.error(`${done}, but the email could not be sent`);
      } catch (err) {
        toast.error(
          `Update failed: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    });

  // Both decisions email the candidate, so both are confirmed first.
  const setStatus = async (
    a: Application,
    status: Exclude<ApprovalStatus, "pending">,
  ) => {
    const ok = await confirm(
      status === "approved"
        ? {
            title: "ACCEPT APPLICATION",
            message: `Accept ${a.name}? They'll get a welcome email at ${a.email}.`,
            confirmLabel: "ACCEPT",
            danger: false,
          }
        : {
            title: "REJECT APPLICATION",
            message: `Reject ${a.name}'s application? They'll get an email at ${a.email}.`,
            confirmLabel: "REJECT",
          },
    );
    if (!ok) return;
    submit(a.id, status);
  };

  // Deleting is permanent (row and CV file), so it is always confirmed.
  const remove = async (a: Application) => {
    const ok = await confirm({
      title: "DELETE APPLICATION",
      message: `Permanently delete ${a.name}'s application${a.cvPath ? " and CV" : ""}? This can't be undone.`,
      confirmLabel: "DELETE",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/recruitments/${a.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
        toast.success("Application deleted");
      } catch (err) {
        toast.error(
          `Delete failed: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    });
  };

  const count = (f: Filter) =>
    f === "all"
      ? applications.length
      : applications.filter((a) => a.status === f).length;
  const shown =
    filter === "all"
      ? applications
      : applications.filter((a) => a.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`retro border-2 px-4 py-2 text-[9px] tracking-widest transition-colors ${
              filter === f.key
                ? "border-[#22c55e] bg-[#22c55e]/[0.08] text-[#22c55e]"
                : "border-white/10 text-zinc-500 hover:border-[#22c55e]/30 hover:text-[#22c55e]"
            }`}
          >
            {f.label} [{count(f.key)}]
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="retro border-2 border-white/10 px-5 py-10 text-center text-[9px] text-zinc-600">
          {applications.length === 0
            ? "NO APPLICATIONS YET"
            : "NOTHING IN THIS FILTER"}
        </div>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {shown.map((a) => {
            const open = expanded.has(a.id);
            return (
              <li
                key={a.id}
                className={cn(
                  "flex flex-col gap-4 border-2 border-white/10 bg-black/60 p-5",
                  a.status === "pending" && "border-l-[6px] border-l-[#22c55e]",
                )}
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <h2 className="retro truncate text-sm text-white">
                      {a.name}
                    </h2>
                    <p className="retro text-[8px] tracking-widest text-zinc-500">
                      {a.usn} · {a.branch} · YEAR {a.year}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={cn(
                        "retro border-2 px-2 py-1 text-[8px] tracking-widest",
                        STATUS_CHIP[a.status],
                      )}
                    >
                      {STATUS_TEXT[a.status] ?? a.status}
                    </span>
                    {/* Plain ISO date: identical on server and client. */}
                    <span className="text-[10px] text-zinc-600">
                      {a.createdAt.slice(0, 10)}
                    </span>
                  </div>
                </header>

                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-400">
                  <a
                    href={`mailto:${a.email}`}
                    className="break-all hover:text-[#22c55e]"
                  >
                    {a.email}
                  </a>
                  <span>WA {a.whatsapp}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <ProfileLink href={`https://github.com/${a.githubUsername}`}>
                    {`GH ${a.githubUsername}`}
                  </ProfileLink>
                  <ProfileLink href={`https://leetcode.com/u/${a.lcUsername}`}>
                    {`LC ${a.lcUsername}`}
                  </ProfileLink>
                  {a.linkedinUrl && (
                    <ProfileLink href={a.linkedinUrl}>LINKEDIN</ProfileLink>
                  )}
                  {a.xHandle && (
                    <ProfileLink href={`https://x.com/${a.xHandle}`}>
                      {`X @${a.xHandle}`}
                    </ProfileLink>
                  )}
                  {/* Private bucket: this route signs a one-minute URL and redirects. */}
                  {a.cvPath && (
                    <ProfileLink href={`/api/admin/recruitments/${a.id}/cv`}>
                      CV ↗
                    </ProfileLink>
                  )}
                </div>

                <div className="border-t-2 border-white/5 pt-4">
                  <p
                    className={cn(
                      "whitespace-pre-wrap break-words text-xs leading-relaxed text-white/75",
                      !open && "line-clamp-3",
                    )}
                  >
                    {a.about}
                  </p>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => toggleAbout(a.id)}
                    className="retro mt-2 text-[8px] tracking-widest text-zinc-500 hover:text-[#22c55e]"
                  >
                    {open ? "LESS ▴" : "MORE ▾"}
                  </button>
                </div>

                <footer className="mt-auto flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={isPending || a.status === "approved"}
                    onClick={() => setStatus(a, "approved")}
                    className={`${btn} border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e] hover:text-black`}
                  >
                    ACCEPT
                  </button>
                  <button
                    type="button"
                    disabled={isPending || a.status === "rejected"}
                    onClick={() => setStatus(a, "rejected")}
                    className={`${btn} border-red-500/40 text-red-400 hover:bg-red-500/10`}
                  >
                    REJECT
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => remove(a)}
                    className={`${btn} border-white/20 text-zinc-400 hover:border-red-500/60 hover:text-red-400`}
                  >
                    DELETE
                  </button>
                </footer>
              </li>
            );
          })}
        </ul>
      )}
      {dialog}
    </div>
  );
}
