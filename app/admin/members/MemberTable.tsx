"use client";

import React, { useTransition, useState } from "react";
import { TacticalTable } from "@/components/ui/TacticalTable";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { TacticalFeedback } from "@/components/ui/TacticalFeedback";
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
  currentUserId: string;
}

export function MemberTable({ initialMembers, currentUserId }: MemberTableProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "member" : "admin";
    
    if (userId === currentUserId && newRole === "member") {
      setFeedback({ 
        message: "SECURITY_BLOCK: YOU_CANNOT_REVOKE_YOUR_OWN_ADMIN_CLEARANCE", 
        type: "error" 
      });
      return;
    }

    startTransition(async () => {
      try {
        await updateUserRole(userId, newRole);
        setFeedback({ 
          message: `CLEARANCE_${newRole === 'admin' ? 'GRANTED' : 'REVOKED'}: SYSTEM_REGISTRY_UPDATED`, 
          type: "success" 
        });
      } catch (err) {
        setFeedback({ 
          message: "CLEARANCE_FAILURE: " + (err instanceof Error ? err.message : "UNKNOWN"), 
          type: "error" 
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
            variant={m.role === 'admin' ? "danger" : "outline"} 
            size="sm" 
            prefix=""
            disabled={isPending}
            onClick={() => handleRoleToggle(m.id, m.role)}
            className="font-black"
          >
            {m.role === 'admin' ? "REVOKE_ADMIN" : "GRANT_ADMIN"}
          </TacticalButton>
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
