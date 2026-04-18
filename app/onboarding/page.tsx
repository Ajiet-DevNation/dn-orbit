"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitOnboarding } from "@/app/actions/onboarding";
import { useSession } from "next-auth/react";

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await submitOnboarding(formData);
    
    if (result.error) {
      setError(result.error);
    } else if (result.success && result.user) {
      // Update the local session so middleware sees the new data
      await update({
        usn: result.user.usn,
        branch: result.user.branch,
        lcUsername: result.user.lcUsername,
        name: result.user.name,
      });
      router.push("/dashboard");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form action={handleSubmit} className="flex flex-col gap-4 w-80">
        <h1 className="text-xl font-bold">Complete your profile</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input
          name="name"
          placeholder="Full name"
          required
        />
        <input
          name="usn"
          placeholder="USN"
          required
        />
        <input
          name="branch"
          placeholder="Branch (e.g. CSE)"
          required
        />
        <input
          name="year"
          placeholder="Year (1-5)"
          type="number"
          min={1}
          max={5}
          required
        />
        <input
          name="lc_username"
          placeholder="LeetCode username (required)"
          required
        />
        <button type="submit" className="bg-white text-black px-4 py-2 rounded">
          Submit
        </button>
      </form>
    </main>
  );
}