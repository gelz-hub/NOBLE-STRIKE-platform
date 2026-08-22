"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Bell, LayoutDashboard, Settings, Trophy, Users } from "lucide-react";

const TAB_HREFS = [
  { href: "/dashboard", key: "overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/teams", key: "myTeams", icon: Users, exact: false },
  { href: "/dashboard/registrations", key: "registrations", icon: Trophy, exact: false },
  { href: "/dashboard/notifications", key: "notifications", icon: Bell, exact: false },
  { href: "/settings/profile", key: "settings", icon: Settings, exact: false },
] as const;

export function DashboardNav() {
  const t = useTranslations("dashboard.nav");
  const pathname = usePathname();
  const TABS = TAB_HREFS.map((tab) => ({ ...tab, label: t(tab.key) }));

  return (
    <nav className="flex flex-wrap gap-1.5 border-b border-gold/10 pb-4 mb-8">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
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
