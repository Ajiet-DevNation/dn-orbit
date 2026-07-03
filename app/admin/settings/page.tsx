import { Activity, Cpu, Database, Server, Shield, Wifi } from "lucide-react";
import React from "react";
import { PixelPageHeader } from "@/components/admin/PixelPageHeader";
import { PixelPanel } from "@/components/admin/PixelPanel";

export default function SettingsPage() {
  const systemMetrics = [
    {
      label: "CORE_VERSION",
      value: "v2.4.0-STABLE",
      icon: Server,
      color: "text-[#22c55e]",
    },
    {
      label: "DATABASE_UPLINK",
      value: "NEON_POSTGRES",
      icon: Database,
      color: "text-[#22c55e]",
    },
    { label: "LATENCY", value: "24ms", icon: Wifi, color: "text-[#22c55e]" },
    {
      label: "SECURITY_PROTOCOL",
      value: "GITHUB_OAUTH_V2",
      icon: Shield,
      color: "text-[#22c55e]",
    },
    {
      label: "CPU_RESOURCE",
      value: "OPTIMIZED",
      icon: Cpu,
      color: "text-zinc-400",
    },
    {
      label: "UPTIME",
      value: "99.98%",
      icon: Activity,
      color: "text-[#22c55e]",
    },
  ];

  return (
    <div className="space-y-8 p-8">
      <PixelPageHeader
        title="SETTINGS & STATUS"
        subtitle="SYSTEM_CONFIGURATION_SECTOR"
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <PixelPanel title="INFRASTRUCTURE_OVERVIEW">
            <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
              {systemMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="border-2 border-white/10 p-4 transition-colors hover:border-[#22c55e]/30"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <metric.icon className={`w-4 h-4 ${metric.color}`} />
                    <span className="retro text-[9px] text-zinc-500 uppercase tracking-widest">
                      {metric.label}
                    </span>
                  </div>
                  <div className="retro text-[11px] text-zinc-300">
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </PixelPanel>

          <PixelPanel title="ENVIRONMENT_VERIFICATION">
            <div className="space-y-3 pt-2">
              {[
                {
                  name: "DATABASE_URL",
                  status: "VERIFIED",
                  hint: "postgres://****:****@****",
                },
                {
                  name: "NEXTAUTH_SECRET",
                  status: "VERIFIED",
                  hint: "********************",
                },
                {
                  name: "GITHUB_ID",
                  status: "VERIFIED",
                  hint: "Iv1.****************",
                },
                {
                  name: "GITHUB_SECRET",
                  status: "VERIFIED",
                  hint: "********************",
                },
              ].map((env) => (
                <div
                  key={env.name}
                  className="flex items-center justify-between border-2 border-white/10 p-4"
                >
                  <div className="space-y-1">
                    <div className="retro text-[9px] text-zinc-400 uppercase tracking-widest">
                      {env.name}
                    </div>
                    <div className="retro text-[8px] text-zinc-600 tracking-tight">
                      {env.hint}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="retro text-[9px] text-[#22c55e]">
                      {env.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </PixelPanel>
        </div>

        <div className="lg:col-span-1">
          <PixelPanel title="SYSTEM_INTEGRITY">
            <div className="space-y-4">
              <p className="retro text-[9px] text-zinc-400 leading-relaxed">
                All core protocols are operational. Security handshakes are
                processing normally via the GitHub OAuth gateway.
              </p>
              <div className="border-t-2 border-white/10 pt-4 flex items-center justify-between">
                <span className="retro text-[9px] text-zinc-500 uppercase tracking-widest">
                  UPTIME_VERIFIED
                </span>
                <span className="retro text-[9px] text-[#22c55e]">100.0%</span>
              </div>
            </div>
          </PixelPanel>
        </div>
      </div>
    </div>
  );
}
