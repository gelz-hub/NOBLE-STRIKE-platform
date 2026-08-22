"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Bell, Lock, Palette, Shield, UserCircle2 } from "lucide-react";

const TAB_HREFS = [
  { href: "/settings/profile", key: "profile", icon: UserCircle2 },
  { href: "/settings/account", key: "account", icon: Lock },
  { href: "/settings/notifications", key: "notifications", icon: Bell },
  { href: "/settings/privacy", key: "privacy", icon: Shield },
  { href: "/settings/appearance", key: "appearance", icon: Palette },
] as const;

export function SettingsNav() {
  const t = useTranslations("settings.tabs");
  const pathname = usePathname();
  const TABS = TAB_HREFS.map((tab) => ({ ...tab, label: t(tab.key) }));

  return (
    <nav className="flex flex-wrap gap-1.5 border-b border-gold/10 pb-4 mb-8">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-heading font-semibold text-sm uppercase tracking-wider transition-all border",
              active
                ? "text-gold-light bg-gold/10 border-gold/40"
                : "text-text-secondary hover:text-text-primary border-transparent hover:border-gold/20"
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
