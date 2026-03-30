"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    usn: "",
    branch: "",
    year: "",
    lcUsername: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/onboarding", {
      method: "POST",
      body: JSON.stringify(form),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-80">
        <h1 className="text-xl font-bold">Complete your profile</h1>
        <input
          placeholder="Full name"
          required
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        <input
          placeholder="USN"
          required
          onChange={e => setForm(f => ({ ...f, usn: e.target.value }))}
        />
        <input
          placeholder="Branch (e.g. CSE)"
          required
          onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
        />
        <input
          placeholder="Year (1-4)"
          type="number"
          min={1}
          max={4}
          required
          onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
        />
        <input
          placeholder="LeetCode username (optional)"
          onChange={e => setForm(f => ({ ...f, lcUsername: e.target.value }))}
        />
        <button type="submit" className="bg-white text-black px-4 py-2 rounded">
          Submit
        </button>
      </form>
    </main>
  );
}