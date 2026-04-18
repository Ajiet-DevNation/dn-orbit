"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitOnboarding } from "@/app/actions/onboarding";
import { useSession } from "next-auth/react";

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const [error, setError] = useState<string | null>(null);
<<<<<<< HEAD
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
=======

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await submitOnboarding(formData);
    
>>>>>>> 216ba8b (feat: github integration + onboarding + auth)
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
<<<<<<< HEAD
      router.push("/");
>>>>>>> 65d079a (Feat apis (#9))
=======
      router.push("/dashboard");
>>>>>>> 216ba8b (feat: github integration + onboarding + auth)
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
<<<<<<< HEAD
          disabled={isLoading}
=======
>>>>>>> 216ba8b (feat: github integration + onboarding + auth)
        />
        <input
          name="usn"
          placeholder="USN"
          required
<<<<<<< HEAD
          disabled={isLoading}
=======
>>>>>>> 216ba8b (feat: github integration + onboarding + auth)
        />
        <input
          name="branch"
          placeholder="Branch (e.g. CSE)"
          required
<<<<<<< HEAD
          disabled={isLoading}
=======
>>>>>>> 216ba8b (feat: github integration + onboarding + auth)
        />
        <input
          name="year"
          placeholder="Year (1-5)"
          type="number"
          min={1}
          max={5}
          required
<<<<<<< HEAD
          disabled={isLoading}
=======
>>>>>>> 216ba8b (feat: github integration + onboarding + auth)
        />
        <input
          name="lc_username"
          placeholder="LeetCode username (required)"
          required
<<<<<<< HEAD
          disabled={isLoading}
=======
>>>>>>> 216ba8b (feat: github integration + onboarding + auth)
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
