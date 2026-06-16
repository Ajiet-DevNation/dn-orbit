import type { Metadata, Viewport } from "next";
import {
  Bebas_Neue,
  IBM_Plex_Mono,
  Inter_Tight,
  Geist,
  Press_Start_2P,
} from "next/font/google";
import { DotGridBackground } from "@/components/ui/DotGridBackground";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/8bit-toast";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  display: "swap",
});

const interTight = Inter_Tight({
  weight: ["800", "900"],
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

// Loaded at root (not just /v2) so --font-pixel is defined on <html> and is
// therefore inherited by body-level portals (drawer, select dropdowns, toasts).
// Harmless to v1, which never references --font-pixel or .retro.
const pressStart = Press_Start_2P({
  weight: "400",
  variable: "--font-pixel",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dn-orbit.vercel.app";
const SITE_DESCRIPTION =
  "ORBIT is the platform for DevNation — the student developer community at A J Institute of Engineering & Technology (AJIET), Mangaluru. Track the live leaderboard, explore club events and projects, and meet the members.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ORBIT — DevNation",
    template: "%s — ORBIT",
  },
  description: SITE_DESCRIPTION,
  applicationName: "ORBIT",
  keywords: [
    "DevNation",
    "AJIET",
    "ORBIT",
    "student developer community",
    "coding club",
    "leaderboard",
    "LeetCode",
    "GitHub",
    "hackathons",
    "Mangaluru",
  ],
  authors: [{ name: "DevNation" }],
  creator: "DevNation",
  publisher: "DevNation",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "ORBIT — DevNation",
    title: "ORBIT — DevNation",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: "/assets/DNLogoTransparent.png",
        width: 512,
        height: 512,
        alt: "DevNation ORBIT",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "ORBIT — DevNation",
    description: SITE_DESCRIPTION,
    images: ["/assets/DNLogoTransparent.png"],
  },
  icons: { icon: "/favicon.ico" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        bebasNeue.variable,
        ibmPlexMono.variable,
        interTight.variable,
        pressStart.variable,
        "font-sans",
        geist.variable
      )}
    >
      <body className="min-h-full flex flex-col bg-bg text-text">
        <DotGridBackground />
        <Providers>{children}</Providers>
        {/* Single global Toaster. `className="dark"` is forwarded to the portaled
            <ol>, so the 8-bit Toast2 (bg-background / bg-destructive) resolves to the
            dark theme instead of rendering white on the dark site. */}
        <Toaster
          theme="dark"
          position="top-center"
          offset={48}
          className="dark retro"
        />
      </body>
    </html>
  );
}
