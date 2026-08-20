import type { Metadata } from "next";
import { Orbitron, Rajdhani, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "NOBLE STRIKE — Compete. Conquer. Become Legendary.",
  description:
    "NOBLE STRIKE (NS) is a premium esports organization and tournament organizer for 5v5 MOBA competition — Mobile Legends: Bang Bang & Honor of Kings. Join elite tournaments, track pro teams, and follow the road to legend.",
  keywords: [
    "NOBLE STRIKE",
    "NS esports",
    "MLBB tournament",
    "Honor of Kings tournament",
    "esports platform",
    "MOBA tournament",
    "pro esports",
    "tournament organizer",
  ],
  authors: [{ name: "NOBLE STRIKE" }],
  icons: {
    icon: "/noble-strike-logo.png",
    apple: "/noble-strike-logo.png",
  },
  openGraph: {
    title: "NOBLE STRIKE — Compete. Conquer. Become Legendary.",
    description:
      "Premium esports tournaments for Mobile Legends: Bang Bang & Honor of Kings. 5v5 MOBA competition, elite teams, legendary moments.",
    url: "https://noblestrike.gg",
    siteName: "NOBLE STRIKE",
    type: "website",
    images: ["/noble-strike-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "NOBLE STRIKE",
    description: "Compete. Conquer. Become Legendary.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${orbitron.variable} ${rajdhani.variable} ${inter.variable} ${jetMono.variable} antialiased`}
      >
        {children}
        <Toaster />
        <SonnerToaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
