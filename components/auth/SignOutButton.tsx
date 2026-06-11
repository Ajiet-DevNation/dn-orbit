"use client";

import { signOut } from "next-auth/react";
import React from "react";

interface SignOutButtonProps {
  children: React.ReactNode;
  className?: string;
}

export function SignOutButton({ children, className }: SignOutButtonProps) {
  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: "/login" });
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
