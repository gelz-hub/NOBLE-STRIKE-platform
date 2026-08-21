"use client";

import Link from "next/link";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import { signOutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Trophy,
  UserCircle2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuLink {
  href: string;
  label: string;
  icon: React.ElementType;
}

const USER_LINKS: MenuLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/teams", label: "My Teams", icon: Users },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/profile", label: "Account Settings", icon: Settings },
];

// Admins get the user links too (they still own teams/see notifications),
// plus the admin-only section below.
const ADMIN_ONLY_LINKS: MenuLink[] = [
  { href: "/admin/tournaments", label: "Tournament Management", icon: Trophy },
  { href: "/admin/registrations", label: "Registrations", icon: ClipboardList },
  { href: "/admin", label: "Admin Panel", icon: Shield },
];

export function AccountMenu({ mobile }: { mobile?: boolean }) {
  const { user, profile, loading } = useSupabaseUser();

  if (loading) {
    return <div className={cn("h-9 w-20 rounded-md bg-white/5 animate-pulse", mobile && "h-12 w-full")} />;
  }

  if (!user) {
    return (
      <Link href="/login">
        <Button
          variant="ghost"
          className={cn(
            "h-9 px-4 text-xs uppercase tracking-wider text-text-secondary hover:text-gold-light border border-gold/20 hover:border-gold/50",
            mobile && "h-12 w-full text-sm"
          )}
        >
          <UserCircle2 className="w-4 h-4" />
          Login
        </Button>
      </Link>
    );
  }

  // Reuses the same role check the server enforces (profiles.role === "admin"),
  // fetched via the RLS-scoped Supabase client — never trust a role from
  // anywhere else. This only controls what renders; every admin route and
  // action re-checks the role server-side regardless.
  const isAdmin = profile?.role === "admin";
  const profileLink: MenuLink[] = profile?.username
    ? [{ href: `/users/${profile.username}`, label: "My Profile", icon: UserCircle2 }]
    : [];
  const links = [...profileLink, ...USER_LINKS, ...(isAdmin ? ADMIN_ONLY_LINKS : [])];
  const initials = (profile?.username || user.email || "?").slice(0, 2).toUpperCase();

  if (mobile) {
    return (
      <div className="flex flex-col gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 px-4 py-3 font-heading font-semibold uppercase tracking-wider rounded-lg text-text-secondary hover:bg-surface-secondary border border-transparent"
          >
            <link.icon className="w-4 h-4" />
            {link.label}
          </Link>
        ))}
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-4 py-3 font-heading font-semibold uppercase tracking-wider rounded-lg text-text-secondary hover:bg-surface-secondary border border-transparent text-left"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </form>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-9 h-9 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center text-xs font-bold text-gold-light hover:border-gold/70 transition-colors">
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border-gold/30 w-56">
        <DropdownMenuLabel className="text-text-primary">
          {profile?.username || user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gold/10" />
        {links.map((link) => (
          <DropdownMenuItem key={link.href} asChild className="focus:bg-gold/10 focus:text-gold-light">
            <Link href={link.href}>
              <link.icon className="w-4 h-4" />
              {link.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-gold/10" />
        <DropdownMenuItem asChild className="focus:bg-white/10 text-text-secondary">
          <form action={signOutAction} className="w-full">
            <button type="submit" className="flex items-center gap-2 w-full text-left">
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
