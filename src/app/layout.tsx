import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "porotta.in — Anonymous Chat",
    template: "%s | porotta.in",
  },
  description:
    "Talk to real people anonymously. Gender-directed matching, no account needed. Fast, private, safe — every session.",
  keywords: [
    "anonymous chat",
    "random chat",
    "talk to strangers",
    "anonymous conversation",
    "private chat India",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://porotta.in",
    siteName: "porotta.in",
    title: "porotta.in — Anonymous Chat",
    description:
      "Talk to real people anonymously. Gender-directed matching, no account needed.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

import DesktopAd from "@/components/ads/DesktopAd";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-dvh flex flex-col relative">
        <DesktopAd />
        {children}
      </body>
    </html>
  );
}
