import {
  Database,
  GitBranch,
  Image,
  Server,
  Shield,
  Webhook,
} from "lucide-react";
import { redirect } from "next/navigation";
import { PixelPageHeader } from "@/components/admin/PixelPageHeader";
import { PixelPanel } from "@/components/admin/PixelPanel";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";

export const metadata = {
  title: "SETTINGS // ORBIT ADMIN",
};

// This page reports live configuration state, never decoration.
//
// It previously rendered a hardcoded status board: LATENCY "24ms", UPTIME
// "99.98%", CPU "OPTIMIZED", and — most misleading — an "ENVIRONMENT
// VERIFICATION" list that printed VERIFIED next to all four secrets whether or
// not they were actually set. An operator reading it would conclude their
// deployment was configured when it might not be. Everything below is derived
// from the running process or a real query.

// Secrets are never echoed — only whether the variable is non-empty. Each entry
// says what breaks when it is missing, so a red row is directly actionable.
const ENV_CHECKS: {
  name: string;
  required: boolean;
  impact: string;
}[] = [
  {
    name: "DATABASE_URL",
    required: true,
    impact: "No database connection — the site cannot serve any page.",
  },
  {
    name: "NEXTAUTH_SECRET",
    required: true,
    impact: "Sessions cannot be signed — sign-in fails.",
  },
  {
    name: "GITHUB_CLIENT_ID",
    required: true,
    impact: "GitHub OAuth sign-in is unavailable.",
  },
  {
    name: "GITHUB_CLIENT_SECRET",
    required: true,
    impact: "GitHub OAuth sign-in is unavailable.",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    required: false,
    impact: "Event and project image uploads are disabled.",
  },
  {
    name: "SUPABASE_PRIVATE_KEY",
    required: false,
    impact: "Event and project image uploads are disabled.",
  },
  {
    name: "GITHUB_WEBHOOK_SECRET",
    required: false,
    impact:
      "Leaderboard refreshes on a timer instead of on push (fails closed).",
  },
];

export default async function SettingsPage() {
  const session = await auth();
  if (!canAccessAdmin(session?.user?.role)) redirect("/");

  const env = ENV_CHECKS.map((c) => ({
    ...c,
    set: !!process.env[c.name]?.trim(),
  }));
  const missingRequired = env.filter((e) => e.required && !e.set);
  const missingOptional = env.filter((e) => !e.required && !e.set);

  // One trivial round-trip proves the database is actually reachable from this
  // instance, rather than asserting it.
  let dbReachable = true;
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbReachable = false;
  }

  const runtime = [
    {
      label: "NEXT.JS",
      value: process.env.NEXT_RUNTIME === "edge" ? "EDGE RUNTIME" : "NODE",
      icon: Server,
    },
    {
      label: "NODE",
      value: process.version,
      icon: GitBranch,
    },
    {
      label: "ENVIRONMENT",
      value: (process.env.NODE_ENV ?? "unknown").toUpperCase(),
      icon: Shield,
    },
    {
      label: "DATABASE",
      value: dbReachable ? "REACHABLE" : "UNREACHABLE",
      icon: Database,
      bad: !dbReachable,
    },
    {
      label: "IMAGE UPLOADS",
      value: process.env.SUPABASE_PRIVATE_KEY ? "ENABLED" : "DISABLED",
      icon: Image,
    },
    {
      label: "GITHUB WEBHOOK",
      value: process.env.GITHUB_WEBHOOK_SECRET ? "ACTIVE" : "OFF",
      icon: Webhook,
    },
  ];

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PixelPageHeader
        title="SETTINGS & STATUS"
        subtitle="RUNTIME CONFIGURATION"
        code={
          missingRequired.length > 0
            ? `${missingRequired.length} MISSING`
            : "ALL REQUIRED SET"
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <PixelPanel title="RUNTIME">
            <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
              {runtime.map((metric) => (
                <div
                  key={metric.label}
                  className="border-2 border-white/10 p-4 transition-colors hover:border-[#22c55e]/30"
                >
                  <div className="mb-2 flex items-center gap-3">
                    <metric.icon
                      className={`h-4 w-4 ${metric.bad ? "text-red-400" : "text-[#22c55e]"}`}
                    />
                    <span className="retro text-[9px] tracking-widest text-zinc-500 uppercase">
                      {metric.label}
                    </span>
                  </div>
                  <div
                    className={`retro text-[11px] ${metric.bad ? "text-red-400" : "text-zinc-300"}`}
                  >
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </PixelPanel>

          <PixelPanel title="ENVIRONMENT">
            <div className="space-y-3 pt-2">
              {env.map((e) => (
                <div
                  key={e.name}
                  className="flex flex-wrap items-center justify-between gap-3 border-2 border-white/10 p-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="retro text-[9px] tracking-widest text-zinc-400 uppercase">
                      {e.name}
                      {!e.required && (
                        <span className="ml-2 text-zinc-700">OPTIONAL</span>
                      )}
                    </div>
                    {!e.set && (
                      <div className="text-[10px] leading-relaxed text-zinc-600">
                        {e.impact}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        e.set
                          ? "bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                          : e.required
                            ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                            : "bg-zinc-600"
                      }`}
                    />
                    <span
                      className={`retro text-[9px] ${
                        e.set
                          ? "text-[#22c55e]"
                          : e.required
                            ? "text-red-400"
                            : "text-zinc-600"
                      }`}
                    >
                      {e.set ? "SET" : "NOT SET"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </PixelPanel>
        </div>

        <div className="lg:col-span-1">
          <PixelPanel title="INTEGRITY">
            <div className="space-y-4">
              <p className="retro text-[9px] leading-relaxed text-zinc-400">
                {missingRequired.length > 0
                  ? `${missingRequired.length} required variable${
                      missingRequired.length === 1 ? "" : "s"
                    } missing — sign-in or data access will fail until set.`
                  : dbReachable
                    ? "All required configuration is present and the database responded."
                    : "Configuration is present, but the database did not respond to a test query."}
              </p>

              {missingOptional.length > 0 && (
                <div className="border-t-2 border-white/10 pt-4">
                  <div className="retro mb-2 text-[8px] tracking-widest text-zinc-600 uppercase">
                    DEGRADED FEATURES
                  </div>
                  <ul className="space-y-2">
                    {missingOptional.map((e) => (
                      <li
                        key={e.name}
                        className="text-[10px] leading-relaxed text-zinc-500"
                      >
                        {e.impact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between border-t-2 border-white/10 pt-4">
                <span className="retro text-[9px] tracking-widest text-zinc-500 uppercase">
                  DATABASE
                </span>
                <span
                  className={`retro text-[9px] ${dbReachable ? "text-[#22c55e]" : "text-red-400"}`}
                >
                  {dbReachable ? "OK" : "FAILED"}
                </span>
              </div>
            </div>
          </PixelPanel>
        </div>
      </div>
    </div>
  );
}
