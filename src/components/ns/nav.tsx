"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { NSLogo } from "./logo";
import { cn } from "@/lib/utils";
import { Menu, X, Trophy, Users } from "lucide-react";
import type { NSView } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "./account-menu";

const NAV_ITEMS: { id: NSView; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "tournaments", label: "Tournaments" },
  { id: "teams", label: "Teams" },
  { id: "ns-team", label: "NS Squad" },
  { id: "news", label: "News" },
  { id: "brackets", label: "Brackets" },
];

export function NavBar() {
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // lock body scroll when mobile menu open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const go = (v: NSView) => {
    setView(v);
    setMobileOpen(false);
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-300",
          scrolled
            ? "glass-dark border-b border-gold/15 shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
            : "bg-transparent"
        )}
      >
        <div className="h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex h-16 md:h-20 items-center justify-between gap-4">
            {/* Logo */}
            <button
              onClick={() => go("home")}
              className="flex items-center gap-3 group"
              aria-label="NOBLE STRIKE home"
            >
              <div className="transition-transform group-hover:scale-105 group-hover:rotate-3 duration-500">
                <NSLogo size={scrolled ? 38 : 44} />
              </div>
              <div className="hidden sm:flex flex-col leading-none">
                <span className="font-display font-extrabold text-lg tracking-[0.18em] text-gold-shine">
                  NOBLE
                </span>
                <span className="font-display font-extrabold text-lg tracking-[0.32em] text-gold-shine -mt-0.5">
                  STRIKE
                </span>
              </div>
            </button>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className={cn(
                    "relative px-4 py-2 font-heading font-semibold text-sm uppercase tracking-wider transition-colors",
                    view === item.id
                      ? "text-gold-light"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {item.label}
                  {view === item.id && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-gradient-to-r from-transparent via-gold to-transparent" />
                  )}
                </button>
              ))}
              <Link
                href="/recruitment"
                className="relative px-4 py-2 font-heading font-semibold text-sm uppercase tracking-wider transition-colors text-text-secondary hover:text-text-primary"
              >
                Recruitment
              </Link>
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => go("tournaments")}
                className="ns-btn-gold hidden md:inline-flex h-9 px-4 text-xs uppercase tracking-wider"
              >
                <Trophy className="w-3.5 h-3.5" />
                Join Tournament
              </Button>

              <div className="hidden md:block">
                <AccountMenu />
              </div>

              {/* Mobile toggle */}
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-md text-gold-light border border-gold/20 hover:bg-gold/10 transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ============ Mobile Slide-Out Menu ============ */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm ns-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          {/* panel */}
          <div className="absolute right-0 top-0 h-full w-[82%] max-w-sm glass-dark border-l border-gold/20 ns-slide-in overflow-y-auto">
            {/* header */}
            <div className="flex items-center justify-between p-5 border-b border-gold/15">
              <div className="flex items-center gap-3">
                <NSLogo size={36} />
                <div className="flex flex-col leading-none">
                  <span className="font-display font-extrabold text-sm tracking-[0.18em] text-gold-shine">
                    NOBLE
                  </span>
                  <span className="font-display font-extrabold text-sm tracking-[0.32em] text-gold-shine -mt-0.5">
                    STRIKE
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* nav items */}
            <nav className="p-4 flex flex-col gap-1">
              {NAV_ITEMS.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  style={{ animationDelay: `${i * 50 + 100}ms` }}
                  className={cn(
                    "ns-fade-in flex items-center justify-between px-4 py-3.5 font-heading font-semibold uppercase tracking-wider rounded-lg transition-all",
                    view === item.id
                      ? "text-gold-light bg-gold/10 border border-gold/30"
                      : "text-text-secondary hover:bg-surface-secondary border border-transparent"
                  )}
                >
                  {item.label}
                  <ChevronRightSmall />
                </button>
              ))}
              <Link
                href="/recruitment"
                onClick={() => setMobileOpen(false)}
                className="ns-fade-in flex items-center justify-between px-4 py-3.5 font-heading font-semibold uppercase tracking-wider rounded-lg transition-all text-text-secondary hover:bg-surface-secondary border border-transparent"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gold/60" />
                  Recruitment
                </span>
                <ChevronRightSmall />
              </Link>
            </nav>

            {/* divider */}
            <div className="mx-5 ns-divider" />

            {/* account */}
            <div className="px-4">
              <AccountMenu mobile />
            </div>

            <div className="mx-5 ns-divider mt-2" />

            {/* CTA */}
            <div className="p-4 flex flex-col gap-2">
              <Button
                onClick={() => go("tournaments")}
                className="ns-btn-gold h-12 mt-2 text-sm uppercase tracking-wider ns-fade-in"
                style={{ animationDelay: "450ms" } as React.CSSProperties}
              >
                <Trophy className="w-4 h-4" />
                Join Tournament
              </Button>
            </div>

            {/* footer */}
            <div className="mt-auto p-5 border-t border-gold/10">
              <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground text-center">
                Compete. Conquer. Become Legendary.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ChevronRightSmall() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gold/40"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
