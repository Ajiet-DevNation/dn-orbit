"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitOnboarding } from "@/app/actions/onboarding";
import { useSession } from "next-auth/react";

// ── Validation ───────────────────────────────────────────────────────────────

const USN_REGEX = /^[0-9][A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{3}$/i;
const LC_REGEX = /^[a-zA-Z0-9_-]+$/;

function validate(fields: {
  name: string;
  usn: string;
  branch: string;
  year: string;
  lcUsername: string;
}): Record<string, string> {
  const e: Record<string, string> = {};
  if (!fields.name.trim()) e.name = "REQUIRED";
  if (!USN_REGEX.test(fields.usn)) e.usn = "FORMAT: 4AL22CS001";
  if (!fields.branch) e.branch = "REQUIRED";
  if (!fields.year) e.year = "REQUIRED";
  if (fields.lcUsername && !LC_REGEX.test(fields.lcUsername))
    e.lcUsername = "ALPHANUMERIC + UNDERSCORE + HYPHEN ONLY";
  return e;
}

// ── Success overlay ──────────────────────────────────────────────────────────

function SuccessOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="text-center space-y-4 font-mono">
        <div className="w-1.5 h-1.5 bg-emerald-500 animate-pulse mx-auto" />
        <h2 className="text-7xl font-black uppercase tracking-tighter italic leading-none text-white">
          PROFILE
          <br />
          COMMITTED.
        </h2>
        <p className="text-[10px] text-zinc-500 tracking-widest uppercase font-black">
          UPLINK_SUCCESS — REDIRECTING
        </p>
      </div>
    </div>
  );
}

// ── Shared style constants ───────────────────────────────────────────────────

const inputClass =
  "w-full bg-black border border-zinc-800 px-4 py-3 text-xs font-mono text-white placeholder:text-zinc-700 placeholder:uppercase focus:outline-none focus:border-white transition-colors";
const inputErrorClass =
  "w-full bg-black border border-red-900 px-4 py-3 text-xs font-mono text-white placeholder:text-zinc-700 placeholder:uppercase focus:outline-none focus:border-red-500 transition-colors";
const labelClass =
  "text-[9px] font-black tracking-widest uppercase text-zinc-500 block mb-2";
const errorClass =
  "text-[10px] text-red-500 font-black tracking-wider uppercase mt-1";

// ── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();

  const [serverError, setServerError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(session?.user?.name ?? "");
  const [usn, setUsn] = useState("");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [lcUsername, setLcUsername] = useState("");

  const githubUsername = session?.user?.name ?? "";

  async function handleSubmit(formData: FormData) {
    const errors = validate({ name, usn, branch, year, lcUsername });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setServerError(null);

    const result = await submitOnboarding(formData);

    if (result.error) {
      setServerError(result.error);
    } else if (result.success && result.user) {
      // Update the local session so middleware sees the new data
      await update({
        usn: result.user.usn,
        branch: result.user.branch,
        lcUsername: result.user.lcUsername,
        name: result.user.name,
      });
      setShowSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    }
  }

  if (showSuccess) return <SuccessOverlay />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-black relative font-mono border border-zinc-800">

          {/* Card header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950/50">
            <span className="text-[9px] text-zinc-500 tracking-widest uppercase">
              ARCHIVE_ID: 0xONBOARD
            </span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-emerald-500 animate-pulse" />
              <div className="w-1.5 h-1.5 bg-zinc-800" />
              <div className="w-1.5 h-1.5 bg-zinc-800" />
            </div>
          </div>

          <div className="p-8 space-y-8">

            {/* Logo + Title */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="border border-white px-2 py-1">
                  <span className="font-black text-xs tracking-widest text-white">DN</span>
                </div>
                <div>
                  <div className="font-black text-xs tracking-widest uppercase text-white">ORBIT</div>
                  <div className="font-black text-[8px] tracking-widest uppercase text-zinc-600">MEMBER_SECTOR_V1</div>
                </div>
              </div>

              <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-none text-white">
                COMPLETE
                <br />
                YOUR PROFILE
              </h1>
              <p className="text-[10px] text-zinc-500 tracking-widest uppercase font-black">
                ORBIT_MEMBER_REGISTRATION_V1
              </p>
            </div>

            {/* Server error */}
            {serverError && (
              <div className="border border-red-900 px-4 py-3">
                <p className="text-[10px] text-red-500 font-black tracking-wider uppercase">
                  ▲ {serverError}
                </p>
              </div>
            )}

            <form action={handleSubmit} className="space-y-8">
              {/* Hidden fields — always submitted */}
              <input type="hidden" name="name" value={name} />
              <input type="hidden" name="usn" value={usn} />
              <input type="hidden" name="branch" value={branch} />
              <input type="hidden" name="year" value={year} />
              <input type="hidden" name="lc_username" value={lcUsername} />

              {/* 01_IDENTIFICATION */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-500 border-b border-zinc-900 pb-2">
                  01_IDENTIFICATION
                </h3>

                <div>
                  <label htmlFor="name" className={labelClass}>FULL_NAME</label>
                  <input
                    id="name"
                    className={fieldErrors.name ? inputErrorClass : inputClass}
                    placeholder="YOUR NAME"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setName(e.target.value)
                    }
                  />
                  {fieldErrors.name && <p className={errorClass}>{fieldErrors.name}</p>}
                </div>

                <div>
                  <label htmlFor="usn" className={labelClass}>USN</label>
                  <input
                    id="usn"
                    className={`${fieldErrors.usn ? inputErrorClass : inputClass} uppercase`}
                    placeholder="4AL22CS001"
                    value={usn}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUsn(e.target.value.toUpperCase())
                    }
                  />
                  {fieldErrors.usn && <p className={errorClass}>{fieldErrors.usn}</p>}
                </div>
              </div>

              {/* 02_PROFILE_DATA */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-500 border-b border-zinc-900 pb-2">
                  02_PROFILE_DATA
                </h3>

                <div>
                  <label htmlFor="branch" className={labelClass}>BRANCH</label>
                  <select
                    id="branch"
                    className={`${fieldErrors.branch ? inputErrorClass : inputClass} appearance-none cursor-pointer`}
                    value={branch}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setBranch(e.target.value)
                    }
                  >
                    <option value="">SELECT</option>
                    <option value="CSE">CSE</option>
                    <option value="ISE">ISE</option>
                    <option value="ECE">ECE</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                    <option value="AIDS">AIDS</option>
                    <option value="AIML">AIML</option>
                    <option value="CSD">CSD</option>
                  </select>
                  {fieldErrors.branch && <p className={errorClass}>{fieldErrors.branch}</p>}
                </div>

                <div>
                  <label className={labelClass}>YEAR</label>
                  <div className="grid grid-cols-4 gap-2">
                    {["1", "2", "3", "4"].map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setYear(y)}
                        className={`py-3 text-xs font-black uppercase tracking-widest border transition-colors ${
                          year === y
                            ? "bg-white text-black border-white"
                            : "bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-white"
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                  {fieldErrors.year && <p className={errorClass}>{fieldErrors.year}</p>}
                </div>

                <div>
                  <label htmlFor="lc_username" className={labelClass}>
                    LEETCODE_USERNAME{" "}
                    <span className="text-zinc-700">(OPTIONAL)</span>
                  </label>
                  <input
                    id="lc_username"
                    className={fieldErrors.lcUsername ? inputErrorClass : inputClass}
                    placeholder="YOUR_LC_HANDLE"
                    value={lcUsername}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLcUsername(e.target.value)
                    }
                  />
                  {fieldErrors.lcUsername && (
                    <p className={errorClass}>{fieldErrors.lcUsername}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="github" className={labelClass}>
                    GITHUB_USERNAME{" "}
                    <span className="text-zinc-700">(AUTO-FILLED)</span>
                  </label>
                  <input
                    id="github"
                    className={`${inputClass} opacity-50 cursor-not-allowed`}
                    value={githubUsername}
                    readOnly
                    disabled
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center bg-white text-black px-6 py-3 font-mono font-black text-xs uppercase tracking-widest border border-white hover:bg-black hover:text-white transition-colors duration-200"
              >
                &gt; COMMIT_PROFILE
              </button>
            </form>
          </div>

          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/40" />
        </div>
      </div>
    </main>
  );
}