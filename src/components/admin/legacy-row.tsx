import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { PenSquare, Crown } from "lucide-react";
import { LegacyActionsMenu } from "./legacy-actions-menu";
import { pickLocalized } from "@/lib/i18n/content";
import type { Locale } from "@/i18n/config";
import type { LegacyEvent } from "@/lib/types/database";

export async function LegacyRow({ event }: { event: LegacyEvent }) {
  const [localeStr, t, tCategory] = await Promise.all([
    getLocale(),
    getTranslations("admin.legacy"),
    getTranslations("legacy.category"),
  ]);
  const locale = localeStr as Locale;
  const title = pickLocalized(event, "title", locale);

  return (
    <div className="ns-card rounded-lg p-3 flex items-center gap-3">
      <div className="relative w-16 h-10 rounded-md overflow-hidden bg-black/40 border border-gold/15 shrink-0">
        {event.cover_image_url ? (
          <Image src={event.cover_image_url} alt="" fill sizes="64px" className="object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-black" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {event.champion && <Crown className="w-3 h-3 text-gold shrink-0" />}
          <p className="text-sm font-medium text-white truncate" lang={locale}>
            {title}
          </p>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {event.year} · {tCategory(event.category.toLowerCase())}
          {event.teams_label ? ` · ${event.teams_label} ${t("teamsSuffix")}` : ""}
        </p>
      </div>

      <span
        className={`hidden sm:inline-flex text-[0.65rem] uppercase tracking-wider px-2 py-1 rounded-md border shrink-0 ${
          event.is_published
            ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
            : "text-muted-foreground border-white/10"
        }`}
      >
        {event.is_published ? t("published") : t("hidden")}
      </span>

      <Link
        href={`/admin/legacy/${event.id}/edit`}
        className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-gold/20 text-xs uppercase tracking-wider text-white/70 hover:text-gold-light hover:border-gold/40 transition-colors shrink-0"
      >
        <PenSquare className="w-3.5 h-3.5" />
        {t("edit")}
      </Link>

      <LegacyActionsMenu eventId={event.id} title={title} isPublished={event.is_published} />
    </div>
  );
}
