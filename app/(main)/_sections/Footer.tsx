import Link from "next/link";
import { FaGithub } from "react-icons/fa";
import { BrandLink } from "./BrandLink";

// Footer links. Internal anchors scroll the landing page; external links open in
// a new tab. Only verifiable DevNation links are included — socials without a
// known URL are intentionally omitted rather than guessed.
const CONNECT: FooterLinkDef[] = [
  { label: "GitHub", href: "https://github.com/Ajiet-DevNation", external: true },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/devnationajiet/", external: true },
  { label: "Contact", href: "mailto:aboobakkartwaha@gmail.com" },
];

const EXPLORE: FooterLinkDef[] = [
  { label: "Events", href: "#events" },
  { label: "Leaderboard", href: "#leaderboard" },
  { label: "Projects", href: "#projects" },
  { label: "Members", href: "#members" },
  { label: "Your Events", href: "/my-events" },
];

interface FooterLinkDef {
  label: string;
  href: string;
  external?: boolean;
}

// Pixel eyebrow: a green pixel-block marker + a Press Start 2P label. The block
// (echoed by the email bullet) is the footer's small recurring signature — used
// instead of decorative 01/02 numbering, since these groups aren't a sequence.
function PixelLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="retro flex items-center gap-2.5 text-[11px] tracking-[0.22em] text-white">
      <span aria-hidden="true" className="inline-block size-2.5 bg-[#22c55e]" />
      {children}
    </h3>
  );
}

function FooterLink({ label, href, external }: FooterLinkDef) {
  // Pixel face, small + tracked — a true 8-bit terminal menu. Press Start 2P is
  // all-caps by nature, so the labels read as a cohesive pixel set.
  const className =
    "group/flink retro flex items-center justify-between gap-4 border-b border-white/[0.07] py-3.5 text-[10px] tracking-wide text-zinc-300 uppercase leading-none transition-colors hover:text-[#22c55e]";
  const inner = (
    <>
      <span>{label}</span>
      <span
        aria-hidden="true"
        className="-translate-x-1 text-[#22c55e] opacity-0 transition-all duration-200 group-hover/flink:translate-x-0 group-hover/flink:opacity-100"
      >
        ▸
      </span>
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

function FooterColumn({ title, links }: { title: string; links: FooterLinkDef[] }) {
  return (
    <div>
      <PixelLabel>{title}</PixelLabel>
      <div className="mt-6 flex flex-col">
        {links.map((l) => (
          <FooterLink key={l.label} {...l} />
        ))}
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="relative w-full overflow-hidden border-t-2 border-white/10 bg-[#0a0a0a] px-6 pt-14 pb-10 sm:pt-20">
      {/* Faint oversized pixel wordmark — a quiet signature, kept low-contrast so
          it never competes with the link text that sits above it. */}
      <span
        aria-hidden="true"
        className="retro pointer-events-none absolute -bottom-8 right-0 select-none text-[7rem] leading-none text-white/[0.02] sm:text-[12rem]"
      >
        ORBIT
      </span>

      <div className="relative mx-auto grid max-w-6xl gap-x-10 gap-y-14 md:grid-cols-[1.7fr_1fr_1fr]">
        {/* Brand + coordinates */}
        <div>
          <BrandLink imageClassName="h-12 w-12" wordmarkClassName="text-2xl" />

          <p className="retro mt-8 max-w-md border-l-2 border-[#22c55e] pl-4 text-[10px] leading-[2] text-zinc-300">
            DevNation — the student developer community at AJIET. Part of Nexus,
            AJIET&apos;s student-led tech umbrella.
          </p>

          <div className="mt-10">
            <PixelLabel>COORDINATES</PixelLabel>
            <p className="retro mt-5 text-[10px] leading-[2] text-zinc-400">
              A J Institute of Engineering &amp; Technology
              <br />
              Mangaluru, Karnataka · IN
            </p>
            <a
              href="mailto:aboobakkartwaha@gmail.com"
              className="retro mt-5 inline-flex max-w-full items-center gap-2.5 text-[10px] break-all text-zinc-300 transition-colors hover:text-[#22c55e]"
            >
              <span aria-hidden="true" className="inline-block size-2 shrink-0 bg-[#22c55e]" />
              aboobakkartwaha@gmail.com
            </a>
          </div>
        </div>

        <FooterColumn title="CONNECT" links={CONNECT} />
        <FooterColumn title="EXPLORE" links={EXPLORE} />
      </div>

      {/* Bottom bar */}
      <div className="relative mx-auto mt-16 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-white/10 pt-7 sm:flex-row">
        <p className="retro text-[10px] tracking-[0.2em] text-zinc-500">
          © 2026 DEVNATION · ALL RIGHTS RESERVED
        </p>
        <a
          href="https://github.com/Ajiet-DevNation"
          target="_blank"
          rel="noopener noreferrer"
          className="retro flex items-center gap-2 text-[10px] tracking-[0.2em] text-zinc-500 transition-colors hover:text-[#22c55e]"
        >
          <FaGithub className="size-3.5" /> MADE BY DEVNATION{" "}
          <span className="text-[#22c55e]">♥</span>
        </a>
      </div>
    </footer>
  );
}
