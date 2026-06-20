"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import React from "react";

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  // Seed the client provider with the session resolved on the server so it
  // hydrates without firing its own `/api/auth/session` request on mount, and
  // don't refetch on every window focus. This removes the duplicate session
  // call on each page load.
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}
