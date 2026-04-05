"use client";

import React, { useTransition } from "react";
import { TacticalTable } from "@/components/ui/TacticalTable";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { updateUserRole } from "./actions";

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
}

export function MemberTable({ initialMembers }: MemberTableProps) {
  const [isPending, startTransition] = useTransition();

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "member" : "admin";
    
    startTransition(async () => {
      try {
        await updateUserRole(userId, newRole);
      } catch (err) {
        alert("CLEARANCE_FAILURE: " + (err instanceof Error ? err.message : "UNKNOWN"));
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
        <div className={`px-2 py-0.5 inline-block text-[9px] font-black border ${
          m.role === 'admin' 
            ? 'bg-white text-black border-white' 
            : 'bg-transparent text-zinc-500 border-zinc-800'
        }`}>
          {m.role.toUpperCase()}
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
          <TacticalButton 
            variant="outline" 
            size="sm" 
            prefix=""
            disabled={isPending}
            onClick={() => handleRoleToggle(m.id, m.role)}
            className={m.role === 'admin' ? 'border-red-900 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-600' : ''}
          >
            {m.role === 'admin' ? "REVOKE_ADMIN" : "GRANT_ADMIN"}
          </TacticalButton>
        </div>
      ) 
    }
  ];

  return <TacticalTable data={initialMembers} columns={columns} id="MEM_DIR_ROOT" />;
}
