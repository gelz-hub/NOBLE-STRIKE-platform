"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Trophy, ClipboardList, Swords, Newspaper, Send, History } from "lucide-react";
import { LanguageSwitcher } from "@/components/ns/language-switcher";

const TAB_DEFS = [
  { href: "/admin/tournaments", key: "tournaments", icon: Trophy },
  { href: "/admin/registrations", key: "registrations", icon: ClipboardList },
  { href: "/admin/matches", key: "matches", icon: Swords },
  { href: "/admin/news", key: "news", icon: Newspaper },
  { href: "/admin/legacy", key: "legacy", icon: History },
  { href: "/admin/integrations/telegram", key: "telegram", icon: Send },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const t = useTranslations("admin.nav");
  const TABS = TAB_DEFS.map((tab) => ({ ...tab, label: t(tab.key) }));

  return (
    <nav className="flex flex-wrap items-center gap-1.5 border-b border-gold/10 pb-4 mb-8">
      <LanguageSwitcher className="mr-auto" />
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
