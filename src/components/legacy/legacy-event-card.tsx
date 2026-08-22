import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Crown, Calendar, Gamepad2, Users, Coins, Radio, Info } from "lucide-react";
import { EventGallery } from "./event-gallery";
import { pickLocalized } from "@/lib/i18n/content";
import type { Locale } from "@/i18n/config";
import type { LegacyEvent } from "@/lib/types/database";

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-3.5 h-3.5 text-gold/60 shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-white/90">{value}</span>
    </div>
  );
}

export async function LegacyEventCard({ event, locale }: { event: LegacyEvent; locale: Locale }) {
  const [t, tStatus] = await Promise.all([
    getTranslations("legacy"),
    getTranslations("legacy.status"),
  ]);
  const title = pickLocalized(event, "title", locale);
  const description = pickLocalized(event, "description", locale);
  const hasResults = event.champion || event.runner_up || event.top_3_4.length > 0;

  return (
    <div className="ns-card ns-card-gold-edge rounded-xl overflow-hidden">
      {event.cover_image_url && (
        <div className="relative h-40 w-full">
          <Image src={event.cover_image_url} alt={title} fill sizes="600px" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        </div>
      )}

      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading font-bold text-lg text-white leading-tight" lang={locale}>
            {title}
          </h3>
          <span className="shrink-0 text-[0.6rem] uppercase tracking-wider px-2 py-1 rounded-md border border-gold/30 text-gold-light">
            {tStatus(event.status.toLowerCase())}
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
          {event.event_date_label && <DetailRow icon={Calendar} label={t("fields.date")} value={event.event_date_label} />}
          {event.game && <DetailRow icon={Gamepad2} label={t("fields.game")} value={event.game} />}
          {event.teams_label && <DetailRow icon={Users} label={t("fields.teams")} value={event.teams_label} />}
          {event.format && <DetailRow icon={Info} label={t("fields.format")} value={event.format} />}
          {event.organized_by && <DetailRow icon={Info} label={t("fields.organizedBy")} value={event.organized_by} />}
          {event.entry_fee && <DetailRow icon={Coins} label={t("fields.entryFee")} value={event.entry_fee} />}
          {event.tournament_mode && <DetailRow icon={Info} label={t("fields.mode")} value={event.tournament_mode} />}
          {(event.prize_pool_label || event.prize_pool_max != null) && (
            <DetailRow
              icon={Coins}
              label={t("fields.prizePool")}
              value={event.prize_pool_label ?? `$${event.prize_pool_max}`}
            />
          )}
          {event.live_broadcast && <DetailRow icon={Radio} label={t("fields.liveBroadcast")} value={t("yes")} />}
          {event.support_team && <DetailRow icon={Info} label={t("fields.supportTeam")} value={event.support_team} />}
        </div>

        {hasResults && (
          <div className="rounded-lg bg-black/30 border border-gold/10 p-3 space-y-1.5">
            {event.champion && (
              <p className="text-sm flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-gold shrink-0" />
                <span className="text-muted-foreground">{t("fields.champion")}:</span>
                <span className="text-white font-medium">{event.champion}</span>
              </p>
            )}
            {event.runner_up && (
              <p className="text-sm text-white/80 pl-5">
                {t("fields.runnerUp")}: {event.runner_up}
              </p>
            )}
            {event.top_3_4.length > 0 && (
              <p className="text-sm text-white/80 pl-5">
                {t("fields.top34")}: {event.top_3_4.join(", ")}
              </p>
            )}
          </div>
        )}

        <EventGallery urls={event.gallery_urls} eventTitle={title} />

        {description && (
          <p className="text-xs text-amber-300/80 bg-amber-400/5 border border-amber-400/20 rounded-lg p-3 leading-relaxed" lang={locale}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
