"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/8bit-tabs";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/8bit-avatar";
import { ProfileModal, type ProfileData } from "./ProfileModal";

interface V2HeaderProps {
  userName: string | null;
  userImage: string | null;
  profile: ProfileData;
}

const NAV_TABS = [
  { value: "events", label: "EVENTS" },
  { value: "leaderboard", label: "LEADERBOARD" },
  { value: "members", label: "MEMBERS" },
  { value: "projects", label: "PROJECTS" },
];

export function V2Header({ userName, userImage, profile }: V2HeaderProps) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";
  
  const [activeTab, setActiveTab] = useState("events");
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(!isLandingPage);

  useEffect(() => {
    if (!isLandingPage) {
      setHeaderVisible(true);
      return;
    }

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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    document.getElementById(value)?.scrollIntoView({ behavior: "smooth" });
  };

  const initials = (userName ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <header 
      className="sticky top-0 z-50 w-full bg-transparent"
      style={{
        opacity: headerVisible ? 1 : 0,
        transform: headerVisible ? "translateY(0)" : "translateY(-16px)",
        transition: "opacity 800ms ease-out, transform 800ms ease-out",
        pointerEvents: headerVisible ? "auto" : "none"
      }}
    >
      <div className="relative flex items-center justify-between px-6 pt-6 pb-3 gap-4">

        {/* Left: Logo + Brand */}
        <div className="flex items-center gap-0 shrink-0">
          <Image
            src="/assets/DNLogoTransparent.png"
            alt="DevNation"
            width={64}
            height={64}
            className="pixelated opacity-90 h-14 w-14 sm:h-16 sm:w-16 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
          />
          <span className="font-[family-name:var(--font-pixel)] text-white text-2xl leading-none hidden sm:block mt-1">
            ORBIT
          </span>
        </div>

        {/* Center: 8-bit nav tabs — absolutely centered to the viewport so the
            differing logo/avatar widths don't push it off-centre. */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:block mt-3">
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
                  className="px-4 py-2 text-xs"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Right: 8bit pixel-frame avatar — click to edit profile */}
        <button
          onClick={() => setProfileOpen(true)}
          className="shrink-0 transition-transform hover:scale-105 active:scale-95"
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

      </div>
    </header>

      <ProfileModal
        open={profileOpen}
        onOpenChange={setProfileOpen}
        userImage={userImage}
        profile={profile}
      />
    </>
  );
}
