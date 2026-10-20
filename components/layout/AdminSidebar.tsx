"use client";

import {
  Calendar,
  ClipboardList,
  Home,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Rocket,
  Settings,
  Trophy,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { SidebarBrand } from "@/components/layout/SidebarBrand";
import { Button } from "@/components/ui/8bit-button";
import { cn } from "@/lib/utils";

// Icons live here (client) — a server component can't pass component refs as
// props, so the admin layout owns only data and delegates the nav to this.
const navItems = [
  { label: "OVERVIEW", href: "/admin", icon: LayoutDashboard },
  { label: "MEMBERS", href: "/admin/members", icon: Users },
  { label: "REQUESTS", href: "/admin/requests", icon: UserCheck },
  { label: "RECRUITMENTS", href: "/admin/recruitments", icon: ClipboardList },
  { label: "EVENTS", href: "/admin/events", icon: Calendar },
  { label: "PROJECTS", href: "/admin/projects", icon: Rocket },
  { label: "APPROVALS", href: "/admin/approvals", icon: Inbox },
  { label: "LEADERBOARD", href: "/admin/leaderboard", icon: Trophy },
  { label: "SETTINGS", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar({ userName }: { userName: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Escape closes the mobile drawer, matching PixelModal/DetailOverlay. Without
  // it the only dismissal was clicking the backdrop — not reachable by keyboard,
  // so a keyboard user who opened the menu was stuck behind it.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Navigating closes the drawer — otherwise it stays open over the page the
  // user just picked.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on pathname changes, not on `open`
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open admin menu"
        className="retro fixed left-3 top-3 z-50 flex items-center gap-2 border-2 border-brand/40 bg-black px-3 py-2 text-[9px] text-brand-light md:hidden"
      >
        <Menu className="h-4 w-4" /> MENU
      </button>

      {/* Backdrop (mobile, when open) */}
      {open && (
        // Decorative dismiss target. Keyboard users get Escape (above) and the
        // in-drawer close button, so this carries no role and is hidden from
        // assistive tech rather than being announced as an interactive element.
        <div
          aria-hidden="true"
          className="fixed inset-0 z-50 bg-black/70 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Fixed drawer on mobile, fixed rail on desktop */}
      <aside
        className={cn(
          // inset-y-0 sizes it to the visible viewport; h-screen (100vh) pushed
          // the footer under the iOS toolbar. iOS drawer curve, quicker out.
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r-2 border-white/10 bg-black transition-transform ease-[cubic-bezier(0.32,0.72,0,1)]",
          open
            ? "translate-x-0 duration-300"
            : "-translate-x-full duration-200",
          "md:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between md:block">
          <SidebarBrand />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="mr-4 text-brand-light md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-6">
          <Button
            asChild
            size="sm"
            className="mb-6 w-full text-[9px] !bg-brand hover:!bg-brand-light !text-black"
          >
            <Link href="/" onClick={() => setOpen(false)}>
              <Home className="h-4 w-4" /> EXIT TO ORBIT
            </Link>
          </Button>
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "retro group flex items-center gap-4 border-2 px-4 py-3 text-[9px] tracking-widest transition-colors",
                  active
                    ? "border-brand/40 bg-brand/[0.08] text-brand-light"
                    : "border-white/10 text-zinc-500 hover:border-brand/30 hover:bg-brand/[0.06] hover:text-brand-light",
                )}
              >
                <item.icon className="h-4 w-4 opacity-40 transition-[color,opacity] group-hover:text-brand-light group-hover:opacity-100" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-4 border-t-2 border-white/10 p-6">
          <div className="border-2 border-white/10 bg-white/[0.02] px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="retro text-[7px] tracking-[0.2em] text-zinc-600">
                ADM_SESSION
              </span>
              <div className="h-1 w-1 animate-pulse bg-brand" />
            </div>
            <div className="retro truncate text-[9px] uppercase tracking-tighter text-white">
              {userName || "COMMANDER"}
            </div>
          </div>
          <SignOutButton className="w-full text-[8px] uppercase tracking-[0.3em] hover:!bg-[#ef4444] hover:!text-black">
            <LogOut className="h-3 w-3" /> TERMINATE
          </SignOutButton>
        </div>
      </aside>
    </>
  );
}
