"use client";

import { signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 gap-4 bg-zinc-50 dark:bg-black text-black dark:text-white">
      <h1 className="text-4xl font-bold">Dashboard</h1>
      
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-md border dark:border-zinc-800 text-center flex flex-col gap-2">
        <p className="text-lg">Welcome, <span className="font-semibold">{session?.user?.name || "User"}</span>!</p>
        <p className="text-sm text-zinc-500">Your USN is: {session?.user?.usn || "Not set"}</p>
        <p className="text-sm text-zinc-500">Role: {session?.user?.role || "Unknown"}</p>
      </div>

      <p className="max-w-md text-center text-sm text-zinc-500 mt-4">
        If you manually deleted your user record in Neon, your browser still holds the JWT session cookie! Click below to clear it and start fresh.
      </p>

      <button 
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-md transition-colors"
      >
        Sign Out & Clear Session
      </button>
    </main>
  );
}