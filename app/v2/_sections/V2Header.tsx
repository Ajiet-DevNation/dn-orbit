"use client";

import { useState } from "react";
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
  const [activeTab, setActiveTab] = useState("events");
  const [profileOpen, setProfileOpen] = useState(false);

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
    <header className="sticky top-0 z-50 w-full bg-transparent">
      <div className="relative flex items-center justify-between px-6 pt-6 pb-3 gap-4">

        {/* Left: Logo + Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <Image
            src="/assets/DNLogoTransparent.png"
            alt="DevNation"
            width={48}
            height={48}
            className="pixelated opacity-90 h-10 w-10 sm:h-12 sm:w-12"
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

      <ProfileModal
        open={profileOpen}
        onOpenChange={setProfileOpen}
        userImage={userImage}
        profile={profile}
      />
    </header>
  );
}
