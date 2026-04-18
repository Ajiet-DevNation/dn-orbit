"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitOnboarding } from "@/app/actions/onboarding";
import { useSession } from "next-auth/react";

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setIsLoading(true);
    
<<<<<<< HEAD
    try {
      const result = await submitOnboarding(formData);
      
      if (result.error) {
        setError(result.error);
        setIsLoading(false);
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
    } catch {
      setError("An unexpected error occurred.");
      setIsLoading(false);
=======
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
      router.push("/");
>>>>>>> 65d079a (Feat apis (#9))
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
          disabled={isLoading}
        />
        <input
          name="usn"
          placeholder="USN"
          required
          disabled={isLoading}
        />
        <input
          name="branch"
          placeholder="Branch (e.g. CSE)"
          required
          disabled={isLoading}
        />
        <input
          name="year"
          placeholder="Year (1-5)"
          type="number"
          min={1}
          max={5}
          required
          disabled={isLoading}
        />
        <input
          name="lc_username"
          placeholder="LeetCode username (required)"
          required
          disabled={isLoading}
        />
        <button 
          type="submit" 
          disabled={isLoading}
          className="bg-white text-black px-4 py-2 rounded disabled:opacity-50"
        >
          {isLoading ? "Submitting..." : "Submit"}
        </button>
      </form>
    </main>
  );
}
