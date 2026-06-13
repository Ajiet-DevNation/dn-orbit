"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { submitOnboarding } from "@/app/actions/onboarding";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/8bit-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/8bit-card";
import { Input } from "@/components/ui/8bit-input";
import { Label } from "@/components/ui/8bit-label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/8bit-select";

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
  if (!fields.lcUsername.trim()) e.lcUsername = "REQUIRED";
  else if (!LC_REGEX.test(fields.lcUsername))
    e.lcUsername = "ALPHANUMERIC + UNDERSCORE + HYPHEN ONLY";
  return e;
}

// ── Success overlay ──────────────────────────────────────────────────────────

function SuccessOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background retro dark">
      <div className="text-center space-y-4 font-mono">
        <div className="w-1.5 h-1.5 bg-emerald-500 animate-pulse mx-auto" />
        <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter italic leading-none text-white">
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
      setTimeout(() => router.push("/"), 2000);
    }
  }

  if (showSuccess) return <SuccessOverlay />;

  return (
    <div className="dark flex w-full min-h-screen items-center justify-center bg-background p-4 md:p-8 retro">
      <div className="w-full max-w-xl">
        <Card>
          <CardHeader className="p-6 pb-2 flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Image src="/assets/DNLogoTransparent.png" alt="DN Logo" width={32} height={32} className="w-8 h-8 pixelated drop-shadow-md" />
              <div className="font-black text-[16px] tracking-widest uppercase mt-1">ORBIT</div>
            </div>
            <CardTitle className="text-2xl leading-tight uppercase">
              CREATE YOUR PROFILE
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            {serverError && (
              <div className="border-y-[3px] border-destructive mb-8 px-4 py-3 bg-destructive/10">
                <p className="text-[8px] text-destructive font-black tracking-wider uppercase text-center">
                  ▲ {serverError}
                </p>
              </div>
            )}

            <form action={handleSubmit} className="space-y-5">
              {/* Hidden fields — always submitted */}
              <input type="hidden" name="name" value={name} />
              <input type="hidden" name="usn" value={usn} />
              <input type="hidden" name="branch" value={branch} />
              <input type="hidden" name="year" value={year} />
              <input type="hidden" name="lc_username" value={lcUsername} />

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-[10px] text-muted-foreground uppercase tracking-widest">FULL_NAME</Label>
                  <Input
                    id="name"
                    placeholder="YOUR NAME"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setName(e.target.value)
                    }
                    className={`text-xs ${fieldErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {fieldErrors.name && <p className="text-[10px] text-destructive uppercase tracking-widest mt-1">{fieldErrors.name}</p>}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="usn" className="text-[10px] text-muted-foreground uppercase tracking-widest">USN</Label>
                  <Input
                    id="usn"
                    placeholder="4AL22CS001"
                    value={usn}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUsn(e.target.value.toUpperCase())
                    }
                    className={`text-xs uppercase ${fieldErrors.usn ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {fieldErrors.usn && <p className="text-[10px] text-destructive uppercase tracking-widest mt-1">{fieldErrors.usn}</p>}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="branch" className="text-[10px] text-muted-foreground uppercase tracking-widest">DOMAIN</Label>
                  <Select value={branch} onValueChange={setBranch}>
                    <SelectTrigger className={`w-full text-xs ${fieldErrors.branch ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="SELECT" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="CSE">CSE</SelectItem>
                      <SelectItem value="ISE">ISE</SelectItem>
                      <SelectItem value="ECE">ECE</SelectItem>
                      <SelectItem value="MECH">MECH</SelectItem>
                      <SelectItem value="CIVIL">CIVIL</SelectItem>
                      <SelectItem value="AIDS">AIDS</SelectItem>
                      <SelectItem value="AIML">AIML</SelectItem>
                      <SelectItem value="CSD">CSD</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldErrors.branch && <p className="text-[10px] text-destructive uppercase tracking-widest mt-1">{fieldErrors.branch}</p>}
                </div>

                <div className="grid gap-2">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-widest">YEAR</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {["1", "2", "3", "4"].map((y) => (
                      <Button
                        key={y}
                        type="button"
                        variant={year === y ? "default" : "outline"}
                        onClick={() => setYear(y)}
                        className={`py-3 text-xs rounded-none h-auto transition-all ${year === y
                          ? "bg-white text-black dark:bg-white dark:text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.5)] translate-y-1"
                          : "opacity-50 hover:opacity-100"
                          }`}
                      >
                        {y}
                      </Button>
                    ))}
                  </div>
                  {fieldErrors.year && <p className="text-[10px] text-destructive uppercase tracking-widest mt-1">{fieldErrors.year}</p>}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="lc_username" className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    LEETCODE_USERNAME
                  </Label>
                  <Input
                    id="lc_username"
                    placeholder="YOUR_LC_HANDLE"
                    value={lcUsername}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLcUsername(e.target.value)
                    }
                    className={`text-xs ${fieldErrors.lcUsername ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {fieldErrors.lcUsername && (
                    <p className="text-[10px] text-destructive uppercase tracking-widest mt-1">{fieldErrors.lcUsername}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="github" className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    GITHUB_USERNAME <span className="text-zinc-600">(AUTO-FILLED)</span>
                  </Label>
                  <Input
                    id="github"
                    value={githubUsername}
                    readOnly
                    disabled
                    className="text-xs opacity-50 cursor-not-allowed"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-6 text-[10px] py-4 h-auto shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                &gt; COMMIT_PROFILE
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
