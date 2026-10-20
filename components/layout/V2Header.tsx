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
import { smoothScrollTo } from "@/lib/smooth-scroll";
import { githubAvatarAt } from "@/lib/utils";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the phone menu on Escape or a press outside it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [menuOpen]);

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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setMenuOpen(false);
    const target = document.getElementById(value);
    if (target) smoothScrollTo(target);
    // The sections live on the landing page; from any other page the tabs
    // used to do nothing at all.
    else router.push(`/#${value}`);
  };

  const initials = (userName ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Named so route view transitions keep it pinned (globals.css). */}
      <header className="sticky top-0 z-50 w-full bg-transparent [view-transition-name:site-header]">
        {/* min-h pins the row at 100px on every screen (the button-only phone
            row was 92px): the hero and boot splash are laid out against
            exactly this height (OrbitStage HEADER_OFFSET). */}
        <div className="relative flex min-h-[100px] items-center justify-between gap-4 px-4 pt-6 pb-3 sm:px-6">
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
              className="hidden md:block mt-3"
              style={{
                opacity: headerVisible ? 1 : 0,
                transform: headerVisible
                  ? "translateY(0)"
                  : "translateY(-16px)",
                transition:
                  "opacity 700ms var(--ease-out-quart), transform 700ms var(--ease-out-quart)",
                pointerEvents: headerVisible ? "auto" : "none",
              }}
            >
              <Tabs value={activeTab} onValueChange={handleTabChange}>
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
            Below md the section tabs don't fit, so a menu sits beside it. */}
          <div className="flex shrink-0 items-center gap-3">
            <div ref={menuRef} className="relative md:hidden">
              <button
                type="button"
                aria-label="Sections"
                aria-expanded={menuOpen}
                aria-controls="section-menu"
                onClick={() => setMenuOpen((o) => !o)}
                className="grid size-11 place-items-center border-2 border-white/20 bg-black/60 text-white transition-[border-color,scale] duration-150 ease-out hover:border-brand active:scale-95"
              >
                <span aria-hidden className="flex w-5 flex-col gap-[3px]">
                  <span className="h-[3px] bg-current" />
                  <span className="h-[3px] bg-current" />
                  <span className="h-[3px] bg-current" />
                </span>
              </button>
              {menuOpen && (
                <nav
                  id="section-menu"
                  aria-label="Sections"
                  className="absolute right-0 top-full mt-3 flex w-52 origin-top-right flex-col border-2 border-white/15 bg-[#0a0a0a] p-1 shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-[opacity,scale] duration-150 ease-out starting:scale-95 starting:opacity-0"
                >
                  {NAV_TABS.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => handleTabChange(tab.value)}
                      aria-current={
                        isLandingPage && activeTab === tab.value
                          ? "true"
                          : undefined
                      }
                      className="retro min-h-11 px-4 text-left text-[10px] tracking-widest text-white/80 transition-colors duration-150 hover:bg-white/5 hover:text-brand-light aria-[current=true]:text-brand-light"
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              )}
            </div>
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
                      src={githubAvatarAt(userImage, 128)}
                      // Above the fold, in the header on every page.
                      loading="eager"
                      alt={userName ?? "User"}
                      className="object-cover"
                    />
                  ) : (
                    <AvatarFallback>{initials}</AvatarFallback>
                  )}
                </Avatar>
              </button>
            ) : (
              <Link href="/login" className="shrink-0" aria-label="Sign in">
                <Button className="text-[10px]">SIGN IN</Button>
              </Link>
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
