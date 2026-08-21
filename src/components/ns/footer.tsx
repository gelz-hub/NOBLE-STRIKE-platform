"use client";

import { useApp } from "@/lib/store";
import { NSWordmark, NSLogo } from "./logo";
import type { NSView } from "@/lib/types";
import { Youtube, Twitch, Twitter, Instagram, MessageCircle } from "lucide-react";
import { TelegramButtons } from "@/components/telegram/telegram-buttons";

const FOOTER_LINKS: { title: string; links: { label: string; view: NSView }[] }[] = [
  {
    title: "Compete",
    links: [
      { label: "Tournaments", view: "tournaments" },
      { label: "Register Team", view: "teams" },
      { label: "Brackets", view: "brackets" },
    ],
  },
  {
    title: "Organisation",
    links: [
      { label: "NS Squad", view: "ns-team" },
      { label: "All Teams", view: "teams" },
      { label: "Newsroom", view: "news" },
    ],
  },
  {
    title: "Platform",
    links: [{ label: "Home", view: "home" }],
  },
];

const SOCIALS = [
  { icon: MessageCircle, label: "Discord" },
  { icon: Twitter, label: "X" },
  { icon: Youtube, label: "YouTube" },
  { icon: Twitch, label: "Twitch" },
  { icon: Instagram, label: "Instagram" },
];

export function Footer() {
  const setView = useApp((s) => s.setView);

  return (
    <footer className="mt-auto relative border-t border-gold/15 bg-black">
      {/* gold accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      {/* radial glow */}
      <div className="absolute inset-x-0 -top-24 h-24 bg-gradient-to-t from-[#D5BE77]/8 to-transparent pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-12 md:py-16">
        <div className="grid gap-10 md:gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <NSLogo size={48} />
              <NSWordmark />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The premier 5v5 MOBA esports organization &amp; tournament
              organizer. Compete in Mobile Legends: Bang Bang &amp; Honor of
              Kings. Forge your legend.
            </p>
            <div className="flex items-center gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href="#/ns-team"
                  onClick={(e) => {
                    e.preventDefault();
                    setView("ns-team");
                  }}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-md flex items-center justify-center border border-gold/20 text-text-secondary hover:text-gold-light hover:border-gold/50 hover:bg-gold/10 transition-all"
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <h4 className="ns-kicker">{col.title}</h4>
              {col.links.map((l) => (
                <button
                  key={l.label}
                  onClick={() => setView(l.view)}
                  className="text-left text-sm text-text-secondary hover:text-gold-light transition-colors w-fit"
                >
                  {l.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        <TelegramButtons className="mt-10" />

        <div className="ns-divider my-10" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground tracking-wide">
            © {new Date().getFullYear()} NOBLE STRIKE. All rights reserved.
            Compete. Conquer. Become Legendary.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="hover:text-gold-light cursor-pointer transition-colors">
              Terms of Service
            </span>
            <span className="h-3 w-px bg-gold/20" />
            <span className="hover:text-gold-light cursor-pointer transition-colors">
              Privacy Policy
            </span>
            <span className="h-3 w-px bg-gold/20" />
            <span className="hover:text-gold-light cursor-pointer transition-colors">
              Rulebook
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
