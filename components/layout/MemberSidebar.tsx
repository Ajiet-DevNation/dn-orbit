"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Trophy,
  Calendar,
  Users,
  Rocket,
  LogOut,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { SidebarBrand } from "@/components/layout/SidebarBrand";

interface MemberSidebarProps {
  userName: string;
}

export default function MemberSidebar({ userName }: MemberSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "DASHBOARD", href: "/dashboard", icon: LayoutDashboard },
    { label: "LEADERBOARD", href: "/leaderboard", icon: Trophy },
    { label: "EVENTS", href: "/events", icon: Calendar },
    { label: "MEMBERS", href: "/members", icon: Users },
    { label: "PROJECTS", href: "/projects", icon: Rocket },
  ];

  return (
    <aside className="w-72 border-r border-zinc-900 flex flex-col sticky top-0 h-screen bg-black z-50 shrink-0">
      <SidebarBrand sectorLabel="MEMBER_SECTOR_V1" />

      <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          // Highlight active state based on current URL path
          const isActive =
            pathname.startsWith(item.href) &&
            (item.href === "/dashboard" ? pathname === "/dashboard" : true);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 text-xs font-black tracking-widest transition-all border group ${
                isActive
                  ? "text-white bg-zinc-900 border-zinc-800"
                  : "text-zinc-500 hover:text-white hover:bg-zinc-950 border-transparent hover:border-zinc-800"
              }`}
            >
              <item.icon
                className={`w-4 h-4 transition-opacity ${isActive ? "opacity-100" : "opacity-40 group-hover:opacity-100"}`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-zinc-900 space-y-4 bg-zinc-950/20">
        <div className="px-4 py-2 bg-zinc-950/50 border border-zinc-900 rounded-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] text-zinc-500 font-bold tracking-[0.2em]">
              USR_SESSION
            </span>
            <div className="w-1 h-1 bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-[10px] text-zinc-300 font-black tracking-tighter truncate uppercase italic">
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
