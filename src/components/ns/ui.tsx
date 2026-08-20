"use client";

import { cn } from "@/lib/utils";
import { GAME_LABELS, STATUS_LABELS, STATUS_PILL } from "@/lib/types";
import { Trophy } from "lucide-react";

/** Team monogram avatar (gold gradient with initials) */
export function TeamMonogram({
  name,
  logo,
  size = 48,
  className,
}: {
  name: string;
  logo?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  if (logo) {
    return (
      <img
        src={logo}
        alt={name}
        style={{ width: size, height: size }}
        className={cn("rounded-lg object-cover border border-gold/30", className)}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={cn(
        "rounded-lg flex items-center justify-center font-display font-bold text-black",
        "bg-gradient-to-br from-[#E6D69A] via-[#D5BE77] to-[#92783D] border border-gold/50",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]",
        className
      )}
    >
      {initials || "?"}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const cls = STATUS_PILL[status] || "ns-pill-pending";
  const label = STATUS_LABELS[status] || status;
  const live = status === "ONGOING";
  return (
    <span className={cn("ns-pill", cls)}>
      {live && <span className="ns-dot-live" />}
      {label}
    </span>
  );
}

export function GameBadge({ game, className }: { game: string; className?: string }) {
  const isMLBB = game === "MLBB";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[0.7rem] font-bold tracking-wider border",
        isMLBB
          ? "border-gold/40 bg-gold/10 text-gold-light"
          : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          isMLBB ? "bg-gold" : "bg-cyan-400"
        )}
      />
      {GAME_LABELS[game] || game}
    </span>
  );
}

export function SectionHeading({
  kicker,
  title,
  description,
  align = "left",
  className,
}: {
  kicker?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className
      )}
    >
      {kicker && (
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold/60" />
          <span className="ns-kicker">{kicker}</span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-gold/60" />
        </div>
      )}
      <h2 className="font-display font-extrabold text-3xl md:text-4xl lg:text-5xl text-white tracking-tight">
        {title}
      </h2>
      {description && (
        <p className="text-muted-foreground text-base md:text-lg max-w-2xl">
          {description}
        </p>
      )}
    </div>
  );
}

/** Decorative animated gold ring */
export function GoldRing({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute", className)}>
      <div className="ns-rotate-slow w-full h-full rounded-full border border-gold/20" />
    </div>
  );
}

export function PrizeTag({ prize, className }: { prize: string; className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gradient-to-r from-[#92783D]/30 to-[#D5BE77]/20 border border-gold/40",
        className
      )}
    >
      <Trophy className="w-4 h-4 text-gold" />
      <span className="font-display font-bold text-gold-light tracking-wide">{prize}</span>
    </div>
  );
}

/** Loading skeleton block */
export function NSCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "ns-card ns-card-gold-edge rounded-xl overflow-hidden",
        className
      )}
    >
      <div className="h-40 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
      </div>
    </div>
  );
}
