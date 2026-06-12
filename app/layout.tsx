import type { Metadata } from "next";
import { Bebas_Neue, IBM_Plex_Mono, Inter_Tight } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";

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
      className={`${bebasNeue.variable} ${ibmPlexMono.variable} ${interTight.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text">

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
