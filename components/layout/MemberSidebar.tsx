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
  Settings,
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
    { label: "SETTINGS", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-72 border-r border-zinc-900 flex flex-col h-screen bg-black">
      <SidebarBrand sectorLabel="MEMBER_SECTOR_V1" />
      <nav className="flex-1 p-6 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href) &&
            (item.href === "/dashboard" ? pathname === "/dashboard" : true);

          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-4 px-4 py-3 text-xs font-black tracking-widest ${isActive ? "text-white bg-zinc-900" : "text-zinc-500"}`}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {/* Footer session block ... */}
    </aside>
  );
}
