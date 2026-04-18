import Link from "next/link";
import { CodeXml, Globe } from "lucide-react";
import { SITE_NAME, NAV_LINKS, FOOTER_LINKS } from "@/constants";

/**
 * Footer — Two-row footer with project branding, links, and social icons.
 *
 * Top row: project name (left) · nav links (center) · copyright (right)
 * Bottom row: policy links (left/center) · social icons (right)
 * Server Component — no interactivity needed.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-dashed border-border bg-bg px-6 py-6">
      {/* Top row */}
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <span className="font-heading text-sm tracking-wider text-white">
          {SITE_NAME}
        </span>

        <div className="flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-[10px] uppercase tracking-widest text-text-muted transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <span className="font-mono text-[10px] uppercase text-text-muted">
          ©{year}_TACTICAL_ARCHIVE_CS_CLUB
        </span>
      </div>

      {/* Divider */}
      <div className="my-4 border-t border-dashed border-border" />

      {/* Bottom row */}
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-6">
          {FOOTER_LINKS.map((label) => (
            <span
              key={label}
              className="font-mono text-[10px] uppercase tracking-widest text-text-muted"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted transition-colors hover:text-white"
            aria-label="GitHub"
          >
            <CodeXml className="h-4 w-4" />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted transition-colors hover:text-white"
            aria-label="LinkedIn"
          >
            <Globe className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
