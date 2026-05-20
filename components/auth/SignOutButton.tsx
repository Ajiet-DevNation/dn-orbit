"use client";

import { signOut } from "next-auth/react";
import React from "react";

interface SignOutButtonProps {
  children: React.ReactNode;
  className?: string;
}

export function SignOutButton({ children, className }: SignOutButtonProps) {
  const handleSignOut = async () => {
    // Clear session and redirect, then force reload to purge any stale state
    await signOut({ redirect: true, callbackUrl: "/login" });
    window.location.reload();
  };

  return (
    <button
      onClick={handleSignOut}
      className={className}
    >
      {children}
    </button>
  );
}
