import type { Metadata } from "next";
import { Orbitron, Rajdhani, Inter, JetBrains_Mono, Noto_Sans_Khmer } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { isLocale, defaultLocale } from "@/i18n/config";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/server";
import { PlausibleScript } from "@/components/analytics/plausible-script";
import { RouteTransition } from "@/components/route-transition";

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

// Loaded globally as a fallback in the font stack (see globals.css) — it
// only supplies glyphs for the Khmer script and has no effect on Latin
// text, so it's safe to include even for English-only page loads.
const notoSansKhmer = Noto_Sans_Khmer({
  variable: "--font-khmer",
  subsets: ["khmer"],
  weight: ["400", "500", "600", "700"],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Best-effort: read the signed-in user's stored theme preference so SSR
  // renders with the right class from the start (avoids a flash-of-wrong-
  // theme on load). Anonymous visitors fall back to next-themes' own
  // localStorage-based default ("dark", matching this app's original
  // hard-locked theme).
  let initialTheme: "dark" | "light" | "system" = "dark";
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("theme_preference")
        .eq("id", user.id)
        .single();
      if (profile?.theme_preference) initialTheme = profile.theme_preference;
    }
  } catch {
    // Anonymous / no session — keep the dark default.
  }

  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <PlausibleScript />
      </head>
      <body
        className={`${orbitron.variable} ${rajdhani.variable} ${inter.variable} ${jetMono.variable} ${notoSansKhmer.variable} antialiased`}
      >
        <I18nProvider initialLocale={locale}>
          <ThemeProvider attribute="class" defaultTheme={initialTheme} enableSystem storageKey="ns-theme">
            <RouteTransition>{children}</RouteTransition>
            <Toaster />
            <SonnerToaster theme="dark" position="bottom-right" />
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
