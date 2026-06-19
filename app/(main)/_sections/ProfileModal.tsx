"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "next-auth/react";

import { updateProfile } from "@/app/actions/profile";
import { ROLE_LABELS, isRole } from "@/lib/roles";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/8bit-avatar";
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/8bit-drawer";
import { toast as rawToast } from "@/components/ui/8bit-toast";

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

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
        onClick={() => onOpenChange(false)}
      >
        {/* Modal card */}
        <div
          className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto border-4 border-white/80 bg-[#0a0a0a] p-6 md:p-12 retro dark"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-12 flex items-center justify-between">
            <h2 className="retro text-lg tracking-wider text-white">
              EDIT PROFILE
            </h2>
            <button
              onClick={() => onOpenChange(false)}
              className="retro text-lg text-muted-foreground hover:text-white"
              aria-label="Close"
            >
              X
            </button>
          </div>

          <div className="grid gap-14 md:grid-cols-[260px_1fr]">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                  <Input
                    id="pm-lc"
                    value={lcUsername}
                    onChange={(e) => setLcUsername(e.target.value)}
                  />
                </div>
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

              <div className="mt-2 flex gap-4 w-full">
                <Button
                  className="flex-[2] text-[10px]"
                  onClick={() => setConfirmOpen(true)}
                >
                  SAVE CHANGES
                </Button>
                <Button
                  className="flex-[1] text-[10px] !bg-red-600 hover:!bg-red-500 !text-white"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  LOG OUT
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── "Edit photo" popup — centered over the whole screen ── */}
      {photoPopup && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPhotoPopup(false)}
        >
          <div
            className="w-full max-w-md border-4 border-[#22c55e] bg-[#0a0a0a] p-10 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base leading-relaxed text-white">
              We&apos;re too broke to store your photos
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Change it on GitHub and it&apos;ll sync on your next sign-in.
            </p>
            <Button
              className="mt-8 text-[10px]"
              onClick={() => setPhotoPopup(false)}
            >
              OK
            </Button>
          </div>
        </div>
      )}

      {/* ── Confirm drawer ── */}
      <Drawer open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DrawerContent className="z-[200] dark border-white/80">
          <div className="mx-auto w-full max-w-md">
            <DrawerHeader>
              <DrawerTitle className="text-sm text-white">
                SAVE CHANGES?
              </DrawerTitle>
              <DrawerDescription className="text-[10px]">
                Update your profile with the new details.
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="flex-row gap-4">
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
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
