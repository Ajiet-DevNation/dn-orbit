import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Press_Start_2P } from "next/font/google";
import { DotGridBackground } from "@/components/ui/DotGridBackground";
import "./globals.css";
import { Toaster } from "@/components/ui/8bit-toast";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";

// Two families, deliberately. The 8-bit identity is carried entirely by Press
// Start 2P (`--font-pixel`, the `.retro` class) with IBM Plex Mono
// (`--font-mono`) for body copy that needs to stay readable at small sizes.
// Geist, Inter Tight and Bebas Neue used to be loaded here too — all three had
// zero consumers and were pure critical-path weight.
const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  display: "swap",
});

// Loaded once, at the root, so `--font-pixel` is defined on <html> and is
// therefore inherited by body-level portals (drawer, select dropdowns, toasts)
// as well as by the landing tree.
const pressStart = Press_Start_2P({
  weight: "400",
  variable: "--font-pixel",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://dn-orbit.vercel.app";
const SITE_DESCRIPTION =
  "ORBIT is the platform for DevNation, the student developer community at A J Institute of Engineering & Technology (AJIET), Mangaluru. Track the live leaderboard, explore club events and projects, and meet the members.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ORBIT · DevNation",
    template: "%s · ORBIT",
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
    siteName: "ORBIT · DevNation",
    title: "ORBIT · DevNation",
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
    title: "ORBIT · DevNation",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolve the session once on the server and hand it to the client provider so
  // it doesn't fire its own /api/auth/session fetch on mount (see Providers).
  const session = await auth();
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={cn("h-full", ibmPlexMono.variable, pressStart.variable)}
    >
      <body className="min-h-full flex flex-col bg-bg text-text">
        <DotGridBackground />
        <Providers session={session}>{children}</Providers>
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
