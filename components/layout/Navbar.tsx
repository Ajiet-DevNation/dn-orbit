"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS, SITE_NAME } from "@/constants";

/**
 * Navbar — Top navigation bar for the ORBIT platform.
 *
 * Layout: CS_ARCHIVE_V1.0 branding (left) · nav links (center) · LOGIN button (right)
 * Active link gets a dashed underline. Entire bar has a dashed bottom border.
 * Client Component because we need usePathname() to highlight the active link.
 */
export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="relative z-50 flex items-center justify-between border-b border-dashed border-border bg-bg/80 px-6 py-3 backdrop-blur-sm">
      {/* Branding */}
      <Link href="/" className="font-heading text-lg tracking-wider text-white">
        {SITE_NAME}
      </Link>

      {/* Center nav links */}
      <div className="hidden items-center gap-6 md:flex">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`font-mono text-xs uppercase tracking-widest transition-colors ${
                isActive
                  ? "border-b border-dashed border-white text-white"
                  : "text-text-muted hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Login button */}
      <Link
        href="/login"
        className="border border-dashed border-border px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-white transition-colors hover:border-white hover:bg-white/5"
      >
        LOGIN
      </Link>
    </nav>
  );
}
