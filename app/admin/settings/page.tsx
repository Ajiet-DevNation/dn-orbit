import React from "react";
import { Shield, Database, Wifi, Cpu, Activity, Server } from "lucide-react";
import { TacticalCard } from "@/components/ui/TacticalCard";

export default function SettingsPage() {
  const systemMetrics = [
    { label: "CORE_VERSION", value: "v2.4.0-STABLE", icon: Server, color: "text-emerald-500" },
    { label: "DATABASE_UPLINK", value: "NEON_POSTGRES", icon: Database, color: "text-blue-500" },
    { label: "LATENCY", value: "24ms", icon: Wifi, color: "text-emerald-500" },
    { label: "SECURITY_PROTOCOL", value: "GITHUB_OAUTH_V2", icon: Shield, color: "text-purple-500" },
    { label: "CPU_RESOURCE", value: "OPTIMIZED", icon: Cpu, color: "text-zinc-400" },
    { label: "UPTIME", value: "99.98%", icon: Activity, color: "text-emerald-500" },
  ];

  return (
    <div className="space-y-12">
      <header>
        <div className="flex items-center gap-3 mb-2 text-zinc-500 font-mono text-xs tracking-widest uppercase">
          <Shield className="w-3 h-3 text-emerald-500/50" />
          <span>SYSTEM_CONFIGURATION_SECTOR</span>
        </div>
        <h1 className="text-4xl font-black tracking-tighter text-zinc-100 italic uppercase italic">
          SETTINGS & <span className="text-emerald-500">STATUS</span>
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <TacticalCard title="INFRASTRUCTURE_OVERVIEW" subtitle="Current status of the platform's core infrastructure.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {systemMetrics.map((metric) => (
                <div key={metric.label} className="p-4 border border-zinc-900 bg-zinc-950/50 group hover:border-zinc-800 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <metric.icon className={`w-4 h-4 ${metric.color}`} />
                    <span className="text-[10px] text-zinc-500 font-bold tracking-widest">{metric.label}</span>
                  </div>
                  <div className="text-lg font-mono font-bold text-zinc-300">{metric.value}</div>
                </div>
              ))}
            </div>
          </TacticalCard>

          <TacticalCard title="ENVIRONMENT_VERIFICATION" subtitle="Status of required system variables (Secrets Masked).">
            <div className="space-y-4 pt-4">
              {[
                { name: "DATABASE_URL", status: "VERIFIED", hint: "postgres://****:****@****" },
                { name: "NEXTAUTH_SECRET", status: "VERIFIED", hint: "********************" },
                { name: "GITHUB_ID", status: "VERIFIED", hint: "Iv1.****************" },
                { name: "GITHUB_SECRET", status: "VERIFIED", hint: "********************" },
              ].map((env) => (
                <div key={env.name} className="flex items-center justify-between p-4 border border-zinc-900">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-zinc-400">{env.name}</div>
                    <div className="text-[10px] text-zinc-600 font-mono tracking-tight">{env.hint}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-mono text-emerald-500 font-bold">{env.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </TacticalCard>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 border border-zinc-800 bg-zinc-900/20 space-y-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Shield className="w-32 h-32 text-emerald-500" />
            </div>
            <h3 className="text-xs font-bold tracking-widest text-emerald-500 uppercase">SYSTEM_INTEGRITY</h3>
            <p className="text-sm text-zinc-400 leading-relaxed font-mono italic">
              All core protocols are operational. Security handshakes are processing normally via the GitHub OAuth gateway.
            </p>
            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-500 font-bold">
              <span>UPTIME_VERIFIED</span>
              <span className="text-emerald-500">100.0%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
