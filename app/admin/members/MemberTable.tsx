"use client";

import React, { useTransition } from "react";
import { PixelDataTable, type PixelColumn } from "@/components/admin/PixelDataTable";
import { toast } from "@/components/ui/8bit-toast";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/8bit-select";
import { ROLES, ROLE_LABELS, canManageRoles, type Role } from "@/lib/roles";
import { toTitleCase } from "@/lib/names";

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
  const router = useRouter();

  // Only the President may change role tiers (server enforces this too).
  const canEdit = canManageRoles(currentUserRole);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    if (userId === currentUserId && newRole !== "president") {
      toast.error("SECURITY_BLOCK: YOU_CANNOT_DEMOTE_YOURSELF_FROM_PRESIDENT");
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
        toast.success(`CLEARANCE_UPDATED: ${ROLE_LABELS[newRole].toUpperCase()}`);
      } catch (err) {
        toast.error("CLEARANCE_FAILURE: " + (err instanceof Error ? err.message : "UNKNOWN"));
      }
    });
  };

  const columns: PixelColumn<Member>[] = [
    {
      key: "name",
      header: "NAME",
      render: (m) => (
        <div className="flex flex-col">
          <span className="text-white font-black">{m.name ? toTitleCase(m.name) : "UNNAMED_NODE"}</span>
          <span className="text-[9px] text-zinc-600 tracking-tighter">{m.email}</span>
        </div>
      ),
    },
    {
      key: "usn",
      header: "USN",
      render: (m) => <span className="text-white/70">{m.usn || "N_A"}</span>,
    },
    {
      key: "role",
      header: "ROLE",
      render: (m) => (
        <span
          className={`retro inline-block border-2 px-2 py-1 text-[8px] ${
            m.role !== "member"
              ? "border-[#22c55e] bg-[#22c55e] text-black"
              : "border-white/10 text-zinc-500"
          }`}
        >
          {(ROLE_LABELS[m.role as Role] ?? m.role).toUpperCase()}
        </span>
      ),
    },
    {
      key: "branch",
      header: "BRANCH/YEAR",
      render: (m) => (
        <span className="text-white/70">{m.branch ? `${m.branch} (${m.year}Y)` : "N/A"}</span>
      ),
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "right",
      render: (m) => (
        <div className="flex justify-end">
          {canEdit ? (
            <Select
              value={m.role}
              disabled={isPending}
              onValueChange={(v) => handleRoleChange(m.id, v as Role)}
            >
              <SelectTrigger
                aria-label={`Set role for ${m.name ?? m.id}`}
                className="w-[190px] text-[10px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[200] dark">
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="retro text-[10px] text-zinc-600">LOCKED</span>
          )}
        </div>
      ),
    },
  ];

  return <PixelDataTable data={initialMembers} columns={columns} empty="NO MEMBERS" />;
}
