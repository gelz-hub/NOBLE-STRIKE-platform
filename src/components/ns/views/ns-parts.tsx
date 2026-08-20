"use client";

import { cn } from "@/lib/utils";
import {
  SectionHeading,
  GameBadge,
} from "../ui";
import {
  Crown,
  Trophy,
  Medal,
  MapPin,
  Calendar,
  ExternalLink,
  MessageCircle,
  Twitter,
  Youtube,
  Twitch,
  Instagram,
  Facebook,
} from "lucide-react";
import type { NSMember, Sponsor, SocialLink, Achievement } from "@/lib/types";

export { SectionHeading, GameBadge };

const ROLE_COLORS: Record<string, string> = {
  GOLD: "from-yellow-400/20 to-yellow-600/10 border-yellow-400/40 text-yellow-300",
  MID: "from-purple-400/20 to-purple-600/10 border-purple-400/40 text-purple-300",
  EXP: "from-orange-400/20 to-orange-600/10 border-orange-400/40 text-orange-300",
  ROAM: "from-cyan-400/20 to-cyan-600/10 border-cyan-400/40 text-cyan-300",
  JUNGLE: "from-green-400/20 to-green-600/10 border-green-400/40 text-green-300",
};

function roleClass(role: string): string {
  const key = Object.keys(ROLE_COLORS).find((k) =>
    role.toUpperCase().includes(k)
  );
  return key ? ROLE_COLORS[key] : "from-gold/20 to-gold/5 border-gold/40 text-gold-light";
}

export function RosterCard({
  member,
  compact,
}: {
  member: NSMember;
  compact?: boolean;
}) {
  const initials = (member.ign || member.name)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div className="group relative ns-card ns-card-gold-edge rounded-xl overflow-hidden">
      {/* portrait */}
      <div
        className={cn(
          "relative flex items-center justify-center bg-gradient-to-br border-b border-gold/15",
          compact ? "h-32" : "h-44",
          roleClass(member.role)
        )}
      >
        <div className="absolute inset-0 ns-grid-bg opacity-20" />
        {member.image ? (
          <img
            src={member.image}
            alt={member.name}
            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="relative font-display font-black text-5xl text-white/90 group-hover:scale-110 transition-transform duration-500">
            {initials}
          </div>
        )}
        {/* type badge */}
        <div className="absolute top-3 left-3">
          <span
            className={cn(
              "ns-pill",
              member.type === "PLAYER"
                ? "ns-pill-ongoing"
                : "ns-pill-approved"
            )}
          >
            {member.type}
          </span>
        </div>
      </div>

      {/* info */}
      <div className="p-4">
        <p className="font-display font-bold text-white text-base group-hover:text-gold-light transition-colors">
          {member.ign || member.name}
        </p>
        {member.ign && member.name !== member.ign && (
          <p className="text-xs text-muted-foreground">{member.name}</p>
        )}
        <p className="mt-2 text-[0.7rem] uppercase tracking-wider text-gold/80 font-semibold">
          {member.role}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.7rem] text-muted-foreground">
          {member.country && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {member.country}
            </span>
          )}
          {member.joinDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Joined {member.joinDate}
            </span>
          )}
        </div>
        {member.bio && !compact && (
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {member.bio}
          </p>
        )}
      </div>
    </div>
  );
}

export function AchievementCard({ achievement }: { achievement: Achievement }) {
  return (
    <div className="group relative ns-card ns-card-gold-edge rounded-xl p-6 overflow-hidden">
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gold/5 group-hover:bg-gold/10 transition-colors" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#E6D69A]/20 to-[#92783D]/10 border border-gold/40 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-gold" />
          </div>
          {achievement.placement && (
            <span className="ns-pill ns-pill-approved">
              <Medal className="w-3 h-3" />
              {achievement.placement}
            </span>
          )}
        </div>
        <h3 className="font-display font-bold text-lg text-white group-hover:text-gold-light transition-colors">
          {achievement.title}
        </h3>
        {achievement.description && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {achievement.description}
          </p>
        )}
        <p className="mt-4 text-xs text-gold/70 font-heading tracking-wider">
          {achievement.date}
        </p>
      </div>
    </div>
  );
}

const TIER_STYLES: Record<string, string> = {
  TITANIUM: "border-gold/60 bg-gradient-to-br from-[#D5BE77]/15 to-transparent",
  PLATINUM: "border-cyan-300/40 bg-gradient-to-br from-cyan-300/10 to-transparent",
  GOLD: "border-yellow-400/40 bg-gradient-to-br from-yellow-400/10 to-transparent",
  PARTNER: "border-white/20 bg-gradient-to-br from-white/5 to-transparent",
};

export function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  const tier = sponsor.tier || "PARTNER";
  const tierLabel =
    tier === "TITANIUM"
      ? "Titanium Partner"
      : tier === "PLATINUM"
      ? "Platinum Partner"
      : tier === "GOLD"
      ? "Gold Partner"
      : "Official Partner";
  return (
    <a
      href={sponsor.url || "#"}
      target={sponsor.url ? "_blank" : undefined}
      rel="noreferrer"
      className={cn(
        "group ns-card rounded-xl p-6 flex items-center gap-4 transition-all hover:-translate-y-1",
        TIER_STYLES[tier] || TIER_STYLES.PARTNER
      )}
    >
      <div className="w-14 h-14 rounded-lg bg-black/40 border border-gold/30 flex items-center justify-center shrink-0">
        {sponsor.logo ? (
          <img
            src={sponsor.logo}
            alt={sponsor.name}
            className="w-full h-full object-contain rounded-lg"
          />
        ) : (
          <Crown className="w-7 h-7 text-gold/70 group-hover:text-gold transition-colors" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-bold text-white text-lg group-hover:text-gold-light transition-colors truncate">
          {sponsor.name}
        </h3>
        <p className="text-[0.7rem] uppercase tracking-wider text-gold/70 font-semibold">
          {tierLabel}
        </p>
      </div>
      {sponsor.url && (
        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-gold-light transition-colors" />
      )}
    </a>
  );
}

const SOCIAL_ICONS: Record<string, React.ElementType> = {
  DISCORD: MessageCircle,
  TWITTER: Twitter,
  X: Twitter,
  YOUTUBE: Youtube,
  TWITCH: Twitch,
  INSTAGRAM: Instagram,
  FACEBOOK: Facebook,
};

export function SocialLinks({ socials }: { socials: SocialLink[] }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
      {socials.map((s) => {
        const Icon = SOCIAL_ICONS[s.platform.toUpperCase()] || ExternalLink;
        return (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3 px-5 py-3 rounded-lg ns-card ns-card-gold-edge hover:-translate-y-0.5 transition-all min-w-[160px]"
          >
            <div className="w-9 h-9 rounded-md bg-gold/10 border border-gold/30 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
              <Icon className="w-4.5 h-4.5 text-gold" />
            </div>
            <div className="text-left">
              <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                {s.platform}
              </p>
              <p className="text-sm font-heading font-semibold text-white group-hover:text-gold-light transition-colors">
                {s.handle || "Follow"}
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}
