"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Calendar,
  Settings,
  LayoutDashboard,
  LogOut,
  Trophy,
  Rocket,
  UserCheck,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { SidebarBrand } from "@/components/layout/SidebarBrand";

// Icons live here (client) — a server component can't pass component refs as
// props, so the admin layout owns only data and delegates the nav to this.
const navItems = [
  { label: "OVERVIEW", href: "/admin", icon: LayoutDashboard },
  { label: "MEMBERS", href: "/admin/members", icon: Users },
  { label: "REQUESTS", href: "/admin/requests", icon: UserCheck },
  { label: "EVENTS", href: "/admin/events", icon: Calendar },
  { label: "PROJECTS", href: "/admin/projects", icon: Rocket },
  { label: "LEADERBOARD", href: "/admin/leaderboard", icon: Trophy },
  { label: "SETTINGS", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar({ userName }: { userName: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open admin menu"
        className="retro fixed left-3 top-3 z-50 flex items-center gap-2 border-2 border-[#22c55e]/40 bg-black px-3 py-2 text-[9px] text-[#22c55e] md:hidden"
      >
        <Menu className="h-4 w-4" /> MENU
      </button>

      {/* Backdrop (mobile, when open) */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Fixed drawer on mobile, fixed rail on desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col border-r-2 border-white/10 bg-black transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between md:block">
          <SidebarBrand sectorLabel="COMMAND_SEC_V4" />
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="mr-4 text-[#22c55e] md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-6">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "retro group flex items-center gap-4 border-2 px-4 py-3 text-[9px] tracking-widest transition-all",
                  active
                    ? "border-[#22c55e]/40 bg-[#22c55e]/[0.08] text-[#22c55e]"
                    : "border-transparent text-zinc-500 hover:border-[#22c55e]/30 hover:bg-[#22c55e]/[0.06] hover:text-[#22c55e]"
                )}
              >
                <item.icon className="h-4 w-4 opacity-40 transition-all group-hover:text-[#22c55e] group-hover:opacity-100" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-4 border-t-2 border-white/10 bg-[#22c55e]/[0.03] p-6">
          <div className="border-2 border-[#22c55e]/20 bg-[#22c55e]/[0.06] px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="retro text-[7px] tracking-[0.2em] text-[#22c55e]/60">
                ADM_SESSION
              </span>
              <div className="h-1 w-1 animate-pulse bg-[#22c55e]" />
            </div>
            <div className="retro truncate text-[9px] uppercase tracking-tighter text-[#22c55e]">
              {userName || "COMMANDER"}
            </div>
          </div>
          <SignOutButton className="retro flex w-full items-center justify-center gap-3 border-2 border-white/20 bg-transparent px-4 py-3 text-[8px] uppercase tracking-[0.3em] text-zinc-500 transition-all hover:border-[#22c55e] hover:bg-[#22c55e] hover:text-black">
            <LogOut className="h-3 w-3" /> TERMINATE
          </SignOutButton>
        </div>
      </aside>
    </>
  );
}
