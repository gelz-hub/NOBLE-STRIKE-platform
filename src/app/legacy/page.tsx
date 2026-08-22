import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getPublishedLegacyEvents, getLegacyStats } from "@/lib/legacy/queries";
import { LegacyStatsGrid } from "@/components/legacy/legacy-stats";
import { LegacyEventCard } from "@/components/legacy/legacy-event-card";
import { ArrowLeft, History, ScrollText } from "lucide-react";
import type { Locale } from "@/i18n/config";

export async function generateMetadata() {
  const t = await getTranslations("legacy");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function LegacyPage() {
  const [yearGroups, stats, localeStr, t] = await Promise.all([
    getPublishedLegacyEvents(),
    getLegacyStats(),
    getLocale(),
    getTranslations("legacy"),
  ]);
  const locale = localeStr as Locale;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 space-y-10">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/60 hover:text-gold-light mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("backToSite")}
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <History className="w-5 h-5 text-gold" />
            <span className="ns-kicker">{t("kicker")}</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-white">{t("pageTitle")}</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">{t("pageIntro")}</p>
        </div>

        <LegacyStatsGrid stats={stats} />

        {yearGroups.length === 0 ? (
          <div className="ns-card rounded-xl p-12 flex flex-col items-center text-center gap-3">
            <History className="w-8 h-8 text-gold/50" />
            <p className="text-white/70">{t("emptyState")}</p>
          </div>
        ) : (
          <div className="space-y-12">
            {yearGroups.map((group) => (
              <section key={group.year} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-display font-extrabold text-2xl text-gold-shine">{group.year}</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-gold/30 to-transparent" />
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  {group.events.map((event) => (
                    <LegacyEventCard key={event.id} event={event} locale={locale} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="ns-card rounded-xl p-5 flex gap-3">
          <ScrollText className="w-5 h-5 text-gold/70 shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">{t("archiveNotice")}</p>
        </div>
      </div>
    </div>
  );
}
