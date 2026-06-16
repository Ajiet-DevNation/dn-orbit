"use client";

import React, { useTransition, useState } from "react";
import { TacticalTable } from "@/components/ui/TacticalTable";
import { TacticalFeedback } from "@/components/ui/TacticalFeedback";
import { useRouter } from "next/navigation";
import { ROLES, ROLE_LABELS, canManageRoles, type Role } from "@/lib/roles";

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  usn: string | null;
  role: string;
  branch: string | null;
  year: number | null;
}

interface MemberTableProps {
  initialMembers: Member[];
  currentUserId: string;
  currentUserRole: string;
}

export function MemberTable({ initialMembers, currentUserId, currentUserRole }: MemberTableProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const router = useRouter();

  // Only the President may change role tiers (server enforces this too).
  const canEdit = canManageRoles(currentUserRole);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    if (userId === currentUserId && newRole !== "president") {
      setFeedback({
        message: "SECURITY_BLOCK: YOU_CANNOT_DEMOTE_YOURSELF_FROM_PRESIDENT",
        type: "error",
      });
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/members/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        });
        if (!res.ok) throw new Error(await res.text());

        router.refresh();

        setFeedback({
          message: `CLEARANCE_UPDATED: ${ROLE_LABELS[newRole].toUpperCase()}`,
          type: "success",
        });
      } catch (err) {
        setFeedback({
          message: "CLEARANCE_FAILURE: " + (err instanceof Error ? err.message : "UNKNOWN"),
          type: "error",
        });
      }
    });
  };

  const columns = [
    { 
      key: "name",
      header: "NAME", 
      render: (m: Member) => (
        <div className="flex flex-col">
          <span className="text-white font-black">{m.name || "UNNAMED_NODE"}</span>
          <span className="text-[9px] text-zinc-600 tracking-tighter">{m.email}</span>
        </div>
      ) 
    },
    { 
      key: "usn",
      header: "USN", 
      render: (m: Member) => m.usn || "N_A" 
    },
    {
      key: "role",
      header: "ROLE",
      render: (m: Member) => (
        <div className={`retro px-2 py-0.5 inline-block text-[9px] border transition-all duration-300 ${
          m.role !== 'member'
            ? 'bg-[#22c55e] text-black border-[#22c55e]'
            : 'bg-transparent text-zinc-500 border-white/10'
        }`}>
          {(ROLE_LABELS[m.role as Role] ?? m.role).toUpperCase()}
        </div>
      )
    },
    { 
      key: "branch",
      header: "BRANCH/YEAR", 
      render: (m: Member) => m.branch ? `${m.branch} (${m.year}Y)` : "N/A" 
    },
    {
      key: "actions",
      header: "ACTIONS",
      render: (m: Member) => (
        <div className="text-right">
          {canEdit ? (
            <select
              aria-label={`Set role for ${m.name ?? m.id}`}
              value={m.role}
              disabled={isPending}
              onChange={(e) => handleRoleChange(m.id, e.target.value as Role)}
              className="retro border-2 border-white/20 bg-[#0a0a0a] px-2 py-1 text-[10px] text-white focus:border-[#22c55e] focus:outline-none"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          ) : (
            <span className="retro text-[10px] text-zinc-600">LOCKED</span>
          )}
        </div>
      )
    }
  ];

  return (
    <>
      <TacticalTable data={initialMembers} columns={columns} id="MEM_DIR_ROOT" />
      <TacticalFeedback 
        key={feedback?.message || "none"}
        message={feedback?.message || null} 
        type={feedback?.type || "success"} 
        onClear={() => setFeedback(null)}
      />
    </>
  );
}
