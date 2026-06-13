import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "ORBIT — DevNation",
  description:
    "Terminal interface for the DevNation collective. Access encrypted project logs, member databases, and upcoming tactical events.",
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
      </body>
    </html>
  );
}
