"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PixelTabFill } from "@/components/home/PixelTabFill";
import type { ProfileData } from "@/components/home/ProfileModal";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/8bit-avatar";
import { Button } from "@/components/ui/8bit-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/8bit-tabs";
import { PixelArrow } from "@/components/ui/PixelIcons";
import { smoothScrollTo } from "@/lib/smooth-scroll";
import { BrandLink } from "./BrandLink";

// Split out of the header chunk: the modal (and the vaul drawer it pulls in)
// loads only for signed-in members, on demand — anonymous visitors never
// download it.
const ProfileModal = dynamic(
  () => import("@/components/home/ProfileModal").then((m) => m.ProfileModal),
  { ssr: false },
);

interface V2HeaderProps {
  userName: string | null;
  userImage: string | null;
  isAuthenticated: boolean;
  profile: ProfileData;
  role?: string | null;
  isAdmin?: boolean;
}

const NAV_TABS = [
  { value: "events", label: "EVENTS" },
  { value: "leaderboard", label: "LEADERBOARD" },
  { value: "projects", label: "PROJECTS" },
  { value: "members", label: "MEMBERS" },
];

export function V2Header({
  userName,
  userImage,
  isAuthenticated,
  profile,
  role = null,
  isAdmin = false,
}: V2HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isLandingPage = pathname === "/";

  const [activeTab, setActiveTab] = useState("events");
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(!isLandingPage);

  useEffect(() => {
    if (!isLandingPage) return;

    const handleScroll = () => {
      // Show header after scrolling down halfway through the hero section
      if (window.scrollY > window.innerHeight * 0.5) {
        setHeaderVisible(true);
      } else {
        setHeaderVisible(false);
      }
    };

    // Initial check on mount
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isLandingPage]);

  // Scrollspy: keep the active tab in sync with whichever section is crossing
  // the viewport's vertical centre, so the nav highlight follows the scroll.
  useEffect(() => {
    if (!isLandingPage) return;
    const sections = NAV_TABS.map((t) =>
      document.getElementById(t.value),
    ).filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveTab(entry.target.id);
        }
      },
      // A 1px detection band at the viewport's middle — the section spanning the
      // centre is the "current" one.
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );
    for (const el of sections) io.observe(el);
    return () => io.disconnect();
  }, [isLandingPage]);

  // Off the landing page the sections don't exist here, so go home to them.
  const handleTabChange = (value: string) => {
    if (!isLandingPage) {
      router.push(`/#${value}`);
      return;
    }
    setActiveTab(value);
    const target = document.getElementById(value);
    if (target) smoothScrollTo(target);
  };

  const initials = (userName ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-transparent">
        <div className="relative flex items-center justify-between px-6 pt-6 pb-3 gap-4">
          {/* Left: Logo + Brand — links home (smooth-scrolls to top when already on
            the landing page). Dark-grey pixel fill draws in on hover. */}
          <BrandLink
            className="shrink-0"
            imageClassName="h-14 w-14 sm:h-16 sm:w-16 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
            wordmarkClassName="text-2xl mt-1 hidden sm:block"
            priority
            onClick={() => {
              if (isLandingPage) smoothScrollTo(0);
            }}
          />

          {/* Center: 8-bit nav tabs — absolutely centered to the viewport so the
            differing logo/avatar widths don't push it off-centre. */}
          <div className="absolute inset-x-0 top-6 flex justify-center pointer-events-none">
            <div
              className="hidden lg:block mt-3"
              style={{
                opacity: headerVisible ? 1 : 0,
                transform: headerVisible
                  ? "translateY(0)"
                  : "translateY(-16px)",
                transition:
                  "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
                willChange: "opacity, transform",
                pointerEvents: headerVisible ? "auto" : "none",
              }}
            >
              <Tabs
                value={isLandingPage ? activeTab : ""}
                onValueChange={handleTabChange}
              >
                {/*
                TabsList background is bg-card (dark mode = #292929).
                The pixel border divs inside use border-foreground / dark:border-ring.
                The globals.css fix above corrects border-width from 24px → 6px.
              */}
                <TabsList>
                  {NAV_TABS.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="relative overflow-hidden px-4 py-2 text-xs transition-none data-[state=active]:bg-transparent! data-[state=active]:text-[#0a0a0a]"
                    >
                      {/* Purple selection drawn in as scattered pixel blocks. */}
                      <PixelTabFill />
                      <span className="relative z-10">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Right: signed-in members get the 8bit avatar (click to edit profile);
            anonymous visitors get a SIGN IN button into the members-only login.
            Below lg the tabs don't fit, so a MENU button stands in for them. */}
          <div className="flex shrink-0 items-center gap-4">
            <MobileNav
              active={isLandingPage ? activeTab : null}
              onPick={handleTabChange}
            />
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="shrink-0 transition-transform duration-200 ease-out hover:scale-105 active:scale-95"
                aria-label="Edit profile"
              >
                <Avatar className="size-16">
                  {userImage ? (
                    <AvatarImage
                      src={userImage}
                      alt={userName ?? "User"}
                      className="object-cover"
                    />
                  ) : (
                    <AvatarFallback>{initials}</AvatarFallback>
                  )}
                </Avatar>
              </button>
            ) : (
              <Button asChild className="shrink-0 text-[10px]">
                <Link href="/login">SIGN IN</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {isAuthenticated && (
        <ProfileModal
          open={profileOpen}
          onOpenChange={setProfileOpen}
          userImage={userImage}
          profile={profile}
          role={role}
          isAdmin={isAdmin}
        />
      )}
    </>
  );
}

// Phone/tablet stand-in for the nav tabs: a MENU button that drops a framed
// list of the same sections. Escape, a tap outside or a pick closes it.
function MobileNav({
  active,
  onPick,
}: {
  active: string | null;
  onPick: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative lg:hidden">
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((o) => !o)}
        className="text-[10px]"
      >
        {open ? "CLOSE" : "MENU"}
      </Button>
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Sections"
          className="retro absolute right-0 top-full mt-5 w-56 bg-card p-1.5"
        >
          {/* The nav tabs' frame: ring bars pushed past each edge, notched corners. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -my-1.5 border-y-[6px] border-ring"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -mx-1.5 border-x-[6px] border-ring"
          />
          <ul className="relative flex flex-col">
            {NAV_TABS.map((tab) => (
              <li key={tab.value}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onPick(tab.value);
                  }}
                  aria-current={active === tab.value ? "true" : undefined}
                  className={
                    active === tab.value
                      ? "flex w-full items-center justify-between bg-brand px-4 py-3 text-xs text-[#0a0a0a]"
                      : "flex w-full items-center justify-between px-4 py-3 text-xs text-white/80 transition-colors duration-150 hover:bg-white/5 hover:text-white focus-visible:bg-white/5 focus-visible:outline-none"
                  }
                >
                  {tab.label}
                  <PixelArrow />
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
