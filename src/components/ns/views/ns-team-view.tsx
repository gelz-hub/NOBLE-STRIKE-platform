"use client";

import { useFetch } from "../hooks";
import { NSLogo, NSWordmark } from "../logo";
import {
  SectionHeading,
  GameBadge,
  SponsorCard,
  RosterCard,
  AchievementCard,
  SocialLinks,
} from "./ns-parts";
import {
  Crown,
  Trophy,
  Users,
  Shield,
  Star,
  Target,
  Flame,
  Award,
} from "lucide-react";
import type {
  Team,
  NSMember,
  Sponsor,
  SocialLink,
  Achievement,
} from "@/lib/types";

interface NSBundle {
  team: (Team & { achievements?: Achievement[] }) | null;
  members: NSMember[];
  sponsors: Sponsor[];
  socials: SocialLink[];
}

export function NSTeamView() {
  const { data, loading } = useFetch<NSBundle>("/api/ns");
  const team = data?.team || null;
  const members = data?.members || [];
  const sponsors = data?.sponsors || [];
  const socials = data?.socials || [];
  const achievements = team?.achievements || [];

  const players = members.filter((m) => m.type === "PLAYER");
  const staff = members.filter((m) => m.type !== "PLAYER");

  return (
    <div className="pt-20 ns-fade-up" lang="en">
      {/* This page's copy is always English (no next-intl translations here) —
          lang="en" keeps its intentional Latin tracking/uppercase styling
          (.ns-kicker, tracking-[...]) intact even when the site-wide locale
          is Khmer, since :lang(km)'s letter-spacing reset (globals.css)
          would otherwise cascade down from <html lang="km">. */}
      {/* ============ HERO BANNER ============ */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-black to-[#0a0a0a]" />
        <div className="absolute inset-0 ns-grid-bg opacity-40" />
        <div className="absolute inset-0 ns-radial-gold" />

        {/* rotating rings */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="ns-rotate-slow w-[420px] h-[420px] md:w-[640px] md:h-[640px] rounded-full border border-gold/10" />
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div
            className="ns-rotate-slow w-[300px] h-[300px] md:w-[460px] md:h-[460px] rounded-full border border-gold/15"
            style={{ animationDirection: "reverse", animationDuration: "55s" }}
          />
        </div>

        <div className="relative z-10 text-center px-4 flex flex-col items-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 blur-3xl bg-gold/25 rounded-full" />
            <NSLogo size={110} className="relative" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold/60" />
            <span className="ns-kicker">Official Organization</span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-gold/60" />
          </div>
          <h1 className="font-display font-black text-5xl md:text-7xl lg:text-8xl tracking-[0.08em] text-gold-shine text-glow-gold">
            NOBLE STRIKE
          </h1>
          <p className="mt-5 max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed">
            The official NOBLE STRIKE competitive roster — forging legends across
            Mobile Legends: Bang Bang. A brotherhood of elite players united by one
            mission: <span className="text-gold-light">dominate the arena</span>.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {team?.game && <GameBadge game={team.game} />}
            <span className="ns-pill ns-pill-ongoing">
              <Crown className="w-3.5 h-3.5" />
              Founded 2023
            </span>
            <span className="ns-pill ns-pill-approved">Pro Division</span>
          </div>
        </div>
      </section>

      {/* ============ ABOUT ============ */}
      <section className="relative py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <div className="grid md:grid-cols-3 gap-6">
            <ValueCard
              icon={Target}
              title="Our Mission"
              text="To compete at the highest level of 5v5 MOBA esports and build a legacy of excellence, integrity, and championship mentality."
            />
            <ValueCard
              icon={Flame}
              title="Our Identity"
              text="Noble in conduct, lethal in the arena. We strike with precision, honor the game, and elevate everyone we compete with."
            />
            <ValueCard
              icon={Star
              }
              title="Our Vision"
              text="To become Southeast Asia's most respected esports organization and a global benchmark for competitive greatness."
            />
          </div>
        </div>
      </section>

      {/* ============ ROSTER ============ */}
      <section className="relative py-16 md:py-24 border-t border-gold/10 bg-gradient-to-b from-black to-[#0a0a0a]">
        <div className="absolute inset-0 ns-grid-bg opacity-20" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading
            kicker="The Starting Five"
            title="Current Roster"
            description="The elite lineup carrying the NS banner into battle."
            align="center"
            className="mb-12"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="ns-card rounded-xl h-72 animate-pulse"
                  />
                ))
              : players.map((m) => <RosterCard key={m.id} member={m} />)}
          </div>
        </div>
      </section>

      {/* ============ STAFF / MANAGEMENT ============ */}
      {staff.length > 0 && (
        <section className="relative py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <SectionHeading
              kicker="Behind The Banner"
              title="Management & Coaching"
              description="The minds shaping NS into a champion dynasty."
              align="center"
              className="mb-12"
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
              {staff.map((m) => (
                <RosterCard key={m.id} member={m} compact />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ ACHIEVEMENTS ============ */}
      {achievements.length > 0 && (
        <section className="relative py-16 md:py-24 border-t border-gold/10">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <SectionHeading
              kicker="Hall Of Legends"
              title="Achievements"
              description="Milestones etched into the NS legacy."
              align="center"
              className="mb-12"
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {achievements.map((a) => (
                <AchievementCard key={a.id} achievement={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ SPONSORS ============ */}
      {sponsors.length > 0 && (
        <section className="relative py-16 md:py-20 border-t border-gold/10 bg-gradient-to-b from-black to-[#0a0a0a]">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <SectionHeading
              kicker="Standing With Us"
              title="Our Sponsors"
              description="Elite partners powering the NS journey."
              align="center"
              className="mb-12"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sponsors.map((s) => (
                <SponsorCard key={s.id} sponsor={s} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ SOCIAL / CONNECT ============ */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 ns-radial-gold" />
        <div className="absolute inset-0 ns-grid-bg opacity-30" />
        <div className="relative mx-auto max-w-3xl px-4 text-center flex flex-col items-center">
          <NSLogo size={64} className="justify-center mb-6" />
          <h2 className="font-display font-black text-3xl md:text-5xl tracking-tight">
            Join The{" "}
            <span className="text-gold-gradient">NS Nation</span>
          </h2>
          <p className="mt-5 text-muted-foreground">
            Follow NOBLE STRIKE across every platform. Never miss a match, a
            signing, or a championship moment.
          </p>
          <SocialLinks socials={socials} />
        </div>
      </section>
    </div>
  );
}

function ValueCard({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
}) {
  return (
    <div className="ns-card ns-card-gold-edge rounded-xl p-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gold/10 border border-gold/30 mb-4">
        <Icon className="w-6 h-6 text-gold" />
      </div>
      <h3 className="font-display font-bold text-lg text-white mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}
