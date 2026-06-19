"use client";

import { signOut } from "next-auth/react";
import React from "react";
import { Button } from "@/components/ui/8bit-button";

interface SignOutButtonProps {
  children: React.ReactNode;
  className?: string;
}

export function SignOutButton({ children, className }: SignOutButtonProps) {
  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: "/login" });
  };

  return (
    <Button type="button" onClick={handleSignOut} className={className}>
      {children}
    </Button>
  );
}
