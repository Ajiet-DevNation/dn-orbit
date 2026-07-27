"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { updateProfile } from "@/app/actions/profile";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/8bit-avatar";
import { Button } from "@/components/ui/8bit-button";
import { Input } from "@/components/ui/8bit-input";
import { Label } from "@/components/ui/8bit-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/8bit-select";
import { toast as rawToast } from "@/components/ui/8bit-toast";
import { PixelModal } from "@/components/ui/PixelModal";
import { isRole, ROLE_LABELS } from "@/lib/roles";
import { LeetCodeConnect } from "./LeetCodeConnect";

const toast = rawToast as unknown as (message: ReactNode) => void;
function notify(kind: "success" | "error", message: string) {
  const color = kind === "success" ? "text-green-500" : "text-red-500";
  toast(<span className={color}>{message}</span>);
}

const BRANCHES = ["CSE", "ISE", "ECE", "MECH", "CIVIL", "AIDS", "AIML", "CSD"];
const YEARS = ["1", "2", "3", "4"];

export interface ProfileData {
  name: string;
  usn: string;
  branch: string;
  year: number | null;
  lcUsername: string;
  bio: string;
}

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userImage: string | null;
  profile: ProfileData;
  /** RBAC tier (e.g. "president", "member"); shown as an 8-bit badge. */
  role?: string | null;
  /** When true (admin-tier user), show a button into the admin panel. */
  isAdmin?: boolean;
}

const EMPTY_PROFILE: ProfileData = {
  name: "",
  usn: "",
  branch: "",
  year: null,
  lcUsername: "",
  bio: "",
};

export function ProfileModal({
  open,
  onOpenChange,
  userImage,
  profile = EMPTY_PROFILE,
  role = null,
  isAdmin = false,
}: ProfileModalProps) {
  const router = useRouter();

  const roleLabel = isRole(role) ? ROLE_LABELS[role] : null;

  const [name, setName] = useState(profile.name);
  const [usn, setUsn] = useState(profile.usn);
  const [branch, setBranch] = useState(profile.branch);
  const [year, setYear] = useState(profile.year ? String(profile.year) : "");
  const [lcUsername, setLcUsername] = useState(profile.lcUsername);
  const [bio, setBio] = useState(profile.bio);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [photoPopup, setPhotoPopup] = useState(false);
  const [saving, setSaving] = useState(false);

  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSave() {
    setSaving(true);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("usn", usn);
    fd.set("branch", branch);
    fd.set("year", year);
    fd.set("lc_username", lcUsername);
    fd.set("bio", bio);

    const res = await updateProfile(fd);
    setSaving(false);
    setConfirmOpen(false);

    if (res?.error) {
      notify("error", `✗ ${res.error}`);
      return;
    }
    notify("success", "✓ Profile updated");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <>
      <PixelModal
        open={open}
        onOpenChange={onOpenChange}
        title="EDIT PROFILE"
        size="xl"
        footer={
          <>
            <Button
              className="flex-1 text-[10px]"
              onClick={() => setConfirmOpen(true)}
            >
              SAVE CHANGES
            </Button>
            {/* Destructive action separated from the primary one — previously
                they sat side by side in the same row with the same weight. */}
            <div
              aria-hidden
              className="hidden h-8 w-px shrink-0 bg-white/15 sm:block"
            />
            <Button
              variant="outline"
              className="text-[10px] !border-red-500/70 !text-red-400 hover:!bg-red-500/10 sm:w-auto sm:min-w-[140px]"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              LOG OUT
            </Button>
          </>
        }
      >
        <div className="grid gap-10 md:grid-cols-[240px_1fr] md:gap-12">
          {/* ── Left: avatar + edit photo ── */}
          <div className="flex flex-col items-center gap-6">
            <Avatar className="size-44">
              {userImage ? (
                <AvatarImage
                  src={userImage}
                  alt={name}
                  className="object-cover"
                />
              ) : (
                <AvatarFallback>{initials}</AvatarFallback>
              )}
            </Avatar>

            {roleLabel && (
              <span
                className={`retro inline-block border-2 px-3 py-1.5 text-[9px] tracking-widest uppercase ${
                  isAdmin
                    ? "border-[#22c55e] bg-[#22c55e]/[0.08] text-[#22c55e]"
                    : "border-white/25 bg-white/[0.04] text-zinc-300"
                }`}
              >
                {roleLabel}
              </span>
            )}

            {/* Equal-width action buttons — full-width within the avatar column
                  so EDIT PHOTO and ADMIN line up identically regardless of label
                  length. mt-auto keeps them grouped under the badge. */}
            <div className="flex w-full max-w-[220px] flex-col gap-4">
              <Button
                className="w-full text-[10px]"
                onClick={() => setPhotoPopup(true)}
              >
                EDIT PHOTO
              </Button>

              {/* Open to every signed-in member — their own created events +
                    registration rosters live behind this, not just admins'. */}
              <Button
                className="w-full text-[10px]"
                onClick={() => {
                  onOpenChange(false);
                  router.push("/my-events");
                }}
              >
                YOUR EVENTS
              </Button>

              {isAdmin && (
                <Button
                  className="w-full text-[10px] !bg-[#22c55e] hover:!bg-[#16a34a] !text-black"
                  onClick={() => {
                    onOpenChange(false);
                    router.push("/admin");
                  }}
                >
                  ADMIN
                </Button>
              )}
            </div>
          </div>

          {/* ── Right: editable details ── */}
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="pm-name" className="text-[10px]">
                NAME
              </Label>
              <Input
                id="pm-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pm-usn" className="text-[10px]">
                USN
              </Label>
              <Input
                id="pm-usn"
                value={usn}
                onChange={(e) => setUsn(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pm-lc" className="text-[10px]">
                LEETCODE
              </Label>
              <LeetCodeConnect
                id="pm-lc"
                value={lcUsername}
                onChange={setLcUsername}
                placeholder="your_lc_handle"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="grid gap-2">
                <Label className="text-[10px]">BRANCH</Label>
                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="SELECT" />
                  </SelectTrigger>
                  <SelectContent className="z-[200] dark">
                    {BRANCHES.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px]">YEAR</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="SELECT" />
                  </SelectTrigger>
                  <SelectContent className="z-[200] dark">
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pm-bio" className="text-[10px]">
                BIO
              </Label>
              <Input
                id="pm-bio"
                value={bio}
                maxLength={160}
                placeholder="160 chars max"
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>
        </div>
      </PixelModal>

      {/* ── "Edit photo" popup ── */}
      <PixelModal
        open={photoPopup}
        onOpenChange={setPhotoPopup}
        title="PROFILE PHOTO"
        layer="nested"
        size="sm"
        footer={
          <Button
            className="w-full text-[10px]"
            onClick={() => setPhotoPopup(false)}
          >
            GOT IT
          </Button>
        }
      >
        <div className="space-y-4 text-center">
          <p className="text-sm leading-relaxed text-white">
            We&apos;re too broke to store your photos
          </p>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Change it on GitHub and it&apos;ll sync on your next sign-in.
          </p>
        </div>
      </PixelModal>

      {/* ── Save confirmation ── */}
      <PixelModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="SAVE CHANGES?"
        description="Update your profile with the new details."
        layer="confirm"
        size="sm"
        tone="accent"
        hideClose
        footer={
          <>
            <Button
              className="flex-1 text-[10px]"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? "SAVING" : "CONFIRM"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-[10px]"
              disabled={saving}
              onClick={() => setConfirmOpen(false)}
            >
              CANCEL
            </Button>
          </>
        }
      >
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Your name, USN, branch, year, LeetCode handle and bio will be updated.
        </p>
      </PixelModal>
    </>
  );
}
