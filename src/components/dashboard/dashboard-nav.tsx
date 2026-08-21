"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Bell, LayoutDashboard, Settings, Trophy, Users } from "lucide-react";

const TABS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/teams", label: "My Teams", icon: Users },
  { href: "/dashboard/registrations", label: "Registrations", icon: Trophy },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/profile", label: "Settings", icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();

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
