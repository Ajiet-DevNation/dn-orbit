"use client";

import {
  Users,
  Calendar,
  LayoutDashboard,
  LogOut,
  Trophy,
  Rocket,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";

const navItems = [
  { label: "DASHBOARD", href: "/dashboard", icon: LayoutDashboard },
  { label: "LEADERBOARD", href: "/leaderboard", icon: Trophy },
  { label: "EVENTS", href: "/events", icon: Calendar },
  { label: "MEMBERS", href: "/members", icon: Users },
  { label: "PROJECTS", href: "/projects", icon: Rocket },
];

export function MemberSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-72 border-r border-zinc-900 flex flex-col sticky top-0 h-screen bg-black z-50">
      {/* Logo block */}
      <div className="p-8 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white flex items-center justify-center">
            <span className="text-black font-black text-xs">DN</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tighter leading-none">
              ORBIT
            </span>
            <span className="text-[9px] text-zinc-600 font-bold tracking-widest">
              MEMBER_SECTOR_V1
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 text-xs font-black tracking-widest transition-all border group ${
                isActive
                  ? "text-white bg-zinc-950 border-zinc-800"
                  : "text-zinc-500 border-transparent hover:text-white hover:bg-zinc-950 hover:border-zinc-800"
              }`}
            >
              <item.icon
                className={`w-4 h-4 transition-opacity ${
                  isActive
                    ? "opacity-100"
                    : "opacity-40 group-hover:opacity-100"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User session block */}
      <div className="p-6 border-t border-zinc-900 space-y-4 bg-zinc-950/20">
        <div className="px-4 py-2 bg-zinc-950 border border-zinc-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] text-zinc-600 font-bold tracking-[0.2em]">
              USR_SESSION
            </span>
            <div className="w-1 h-1 bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-[10px] text-white font-black tracking-tighter truncate uppercase italic">
            {userName}
          </div>
        </div>

        <SignOutButton className="w-full flex items-center justify-center gap-3 px-4 py-3 text-[10px] font-black tracking-[0.3em] uppercase bg-zinc-900 text-zinc-500 hover:bg-white hover:text-black transition-all border border-zinc-800 hover:border-white">
          <LogOut className="w-3 h-3" />
          TERMINATE
        </SignOutButton>
      </div>
    </aside>
  );
}
