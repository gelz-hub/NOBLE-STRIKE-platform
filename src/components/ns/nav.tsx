"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import { NSLogo } from "./logo";
import { cn } from "@/lib/utils";
import { Menu, X, Shield, Trophy } from "lucide-react";
import type { NSView } from "@/lib/types";
import { Button } from "@/components/ui/button";

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

  const go = (v: NSView) => {
    setView(v);
    setMobileOpen(false);
  };

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "glass-dark border-b border-gold/15 shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
          : "bg-transparent"
      )}
    >
      {/* top accent line */}
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
                    : "text-white/70 hover:text-white"
                )}
              >
                {item.label}
                {view === item.id && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-gradient-to-r from-transparent via-gold to-transparent" />
                )}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => go("admin")}
              className={cn(
                "hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-heading font-semibold uppercase tracking-wider transition-all",
                view === "admin"
                  ? "text-gold-light bg-gold/10 border border-gold/40"
                  : "text-white/60 hover:text-gold-light border border-transparent hover:border-gold/30"
              )}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
            <Button
              onClick={() => go("tournaments")}
              className="ns-btn-gold hidden md:inline-flex h-9 px-4 text-xs uppercase tracking-wider"
            >
              <Trophy className="w-3.5 h-3.5" />
              Join Tournament
            </Button>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-md text-gold-light border border-gold/20 hover:bg-gold/10"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden glass-dark border-t border-gold/15">
          <nav className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={cn(
                  "px-4 py-3 text-left font-heading font-semibold uppercase tracking-wider rounded-md transition-colors",
                  view === item.id
                    ? "text-gold-light bg-gold/10 border border-gold/30"
                    : "text-white/80 hover:bg-white/5"
                )}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => go("admin")}
              className={cn(
                "px-4 py-3 text-left font-heading font-semibold uppercase tracking-wider rounded-md transition-colors flex items-center gap-2",
                view === "admin"
                  ? "text-gold-light bg-gold/10 border border-gold/30"
                  : "text-white/80 hover:bg-white/5"
              )}
            >
              <Shield className="w-4 h-4" />
              Admin
            </button>
            <Button
              onClick={() => go("tournaments")}
              className="ns-btn-gold mt-2 h-11 text-sm uppercase tracking-wider"
            >
              <Trophy className="w-4 h-4" />
              Join Tournament
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
