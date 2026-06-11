"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions/profile";
import { useSession } from "next-auth/react";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { Loader2 } from "lucide-react";

type UserProfileProps = {
  initialData: {
    name: string;
    usn: string | null;
    branch: string | null;
    year: number | null;
    lcUsername: string | null;
    bio: string | null;
    isVisible: boolean;
  };
};

export function ProfileForm({ initialData }: UserProfileProps) {
  const router = useRouter();
  const { update } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    setIsPending(true);

    try {
      const result = await updateProfile(formData);
      
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
        setSuccess(true);
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <TacticalCard id="0xFORM" title="AGENT_DOSSIER_UPDATE">
      <form action={handleSubmit} className="space-y-6">
        {error && (
          <div className="border border-red-500/50 bg-red-500/10 p-3">
            <p className="text-[10px] text-red-400 tracking-widest uppercase">
              ERROR: {error}
            </p>
          </div>
        )}
        
        {success && (
          <div className="border border-emerald-500/50 bg-emerald-500/10 p-3">
            <p className="text-[10px] text-emerald-400 tracking-widest uppercase">
              DOSSIER_UPDATED_SUCCESSFULLY
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[9px] text-zinc-500 tracking-widest uppercase block">
              FULL_NAME <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              defaultValue={initialData.name}
              required
              className="w-full bg-zinc-950 border border-zinc-800 p-3 text-sm text-white focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] text-zinc-500 tracking-widest uppercase block">
              USN <span className="text-red-500">*</span>
            </label>
            <input
              name="usn"
              defaultValue={initialData.usn || ""}
              required
              className="w-full bg-zinc-950 border border-zinc-800 p-3 text-sm text-white focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] text-zinc-500 tracking-widest uppercase block">
              BRANCH <span className="text-red-500">*</span>
            </label>
            <input
              name="branch"
              defaultValue={initialData.branch || ""}
              placeholder="e.g. CSE"
              required
              className="w-full bg-zinc-950 border border-zinc-800 p-3 text-sm text-white focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] text-zinc-500 tracking-widest uppercase block">
              YEAR (1-5) <span className="text-red-500">*</span>
            </label>
            <input
              name="year"
              type="number"
              min={1}
              max={5}
              defaultValue={initialData.year || ""}
              required
              className="w-full bg-zinc-950 border border-zinc-800 p-3 text-sm text-white focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[9px] text-zinc-500 tracking-widest uppercase block">
              LEETCODE_USERNAME <span className="text-red-500">*</span>
            </label>
            <input
              name="lc_username"
              defaultValue={initialData.lcUsername || ""}
              required
              className="w-full bg-zinc-950 border border-zinc-800 p-3 text-sm text-white focus:outline-none focus:border-white transition-colors"
            />
            <p className="text-[8px] text-zinc-600 tracking-widest uppercase mt-1">
              Required for leaderboard tracking. This must exactly match your LeetCode profile URL.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[9px] text-zinc-500 tracking-widest uppercase block">
              BIO
            </label>
            <textarea
              name="bio"
              defaultValue={initialData.bio || ""}
              rows={3}
              maxLength={160}
              placeholder="Short bio (max 160 chars)..."
              className="w-full bg-zinc-950 border border-zinc-800 p-3 text-sm text-white focus:outline-none focus:border-white transition-colors resize-none"
            />
          </div>

          <div className="space-y-2 md:col-span-2 flex items-center gap-3">
            <input
              type="checkbox"
              name="isVisible"
              id="isVisible"
              defaultChecked={initialData.isVisible}
              className="w-4 h-4 bg-zinc-950 border-zinc-800 accent-white"
            />
            <label htmlFor="isVisible" className="text-[9px] text-zinc-400 tracking-widest uppercase cursor-pointer select-none">
              PUBLICLY_VISIBLE_ON_MEMBER_DIRECTORY
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-900">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center justify-center gap-3 w-full md:w-auto px-8 py-3 text-[10px] font-black tracking-[0.3em] uppercase bg-white text-black hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                TRANSMITTING
              </>
            ) : (
              "UPDATE_DOSSIER"
            )}
          </button>
        </div>
      </form>
    </TacticalCard>
  );
}
