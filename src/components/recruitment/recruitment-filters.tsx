"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { RECRUITMENT_GAMES, RECRUITMENT_ROLES, RECRUITMENT_STATUSES, getRoleLabels } from "@/lib/validation/recruitment";
import type { RecruitmentPostType } from "@/lib/types/database";

const GAME_LABELS: Record<string, string> = { MLBB: "Mobile Legends: Bang Bang", HOK: "Honor of Kings" };

export function RecruitmentTabs({ active }: { active: RecruitmentPostType }) {
  const t = useTranslations("recruitment");
  const searchParams = useSearchParams();
  const pathname = usePathname();

  function hrefFor(tab: RecruitmentPostType) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    params.delete("page");
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="flex gap-1.5 border-b border-gold/10 pb-4">
      {(["LFT", "LFP"] as const).map((tab) => (
        <Link
          key={tab}
          href={hrefFor(tab)}
          className={cn(
            "px-5 py-2.5 rounded-lg font-heading font-semibold text-sm uppercase tracking-wider transition-all border",
            active === tab
              ? "text-gold-light bg-gold/10 border-gold/40"
              : "text-text-secondary hover:text-text-primary border-transparent hover:border-gold/20"
          )}
        >
          {tab === "LFT" ? t("lookingForTeam") : t("lookingForPlayer")}
        </Link>
      ))}
    </div>
  );
}

export function RecruitmentFilters({ postType }: { postType: RecruitmentPostType }) {
  const t = useTranslations("recruitment");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [country, setCountry] = useState(searchParams.get("country") ?? "");
  const [, startTransition] = useTransition();

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "ANY" || value === "") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const activeGame = searchParams.get("game") ?? "ANY";
  const activeRole = searchParams.get("role") ?? "ANY";
  const activeStatus = searchParams.get("status") ?? "OPEN";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={activeGame} onValueChange={(v) => updateParams({ game: v })}>
        <SelectTrigger className="ns-input w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-gold/30">
          <SelectItem value="ANY">{t("allGames")}</SelectItem>
          {RECRUITMENT_GAMES.map((g) => (
            <SelectItem key={g} value={g}>
              {GAME_LABELS[g]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={activeRole} onValueChange={(v) => updateParams({ role: v })}>
        <SelectTrigger className="ns-input w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-gold/30">
          <SelectItem value="ANY">{t("allRoles")}</SelectItem>
          {RECRUITMENT_ROLES.filter((r) => r !== "ANY").map((r) => (
            <SelectItem key={r} value={r}>
              {getRoleLabels(activeGame)[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {postType === "LFT" && (
        <Input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && updateParams({ country: country || null })}
          onBlur={() => updateParams({ country: country || null })}
          placeholder={t("countryPlaceholder")}
          className="ns-input h-9 w-36 text-sm"
        />
      )}

      <Select value={activeStatus} onValueChange={(v) => updateParams({ status: v === "ANY" ? null : v })}>
        <SelectTrigger className="ns-input w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-gold/30">
          <SelectItem value="ANY">{t("anyStatus")}</SelectItem>
          {RECRUITMENT_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s === "OPEN" ? t("statusOpen") : t("statusClosed")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
