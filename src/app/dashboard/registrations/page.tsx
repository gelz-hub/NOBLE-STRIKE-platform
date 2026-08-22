import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { StatusPill } from "@/components/ns/ui";
import { WithdrawRegistrationButton } from "@/components/dashboard/withdraw-registration-button";
import { pickLocalized } from "@/lib/i18n/content";
import { Trophy } from "lucide-react";
import { getMyRegistrations } from "./actions";
import type { Locale } from "@/i18n/config";

export default async function MyRegistrationsPage() {
  const registrations = await getMyRegistrations();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("dashboard.registrations");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">{t("heading")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subheading")}</p>
      </div>

      {registrations.length === 0 ? (
        <div className="ns-card rounded-xl p-12 flex flex-col items-center text-center gap-3">
          <Trophy className="w-8 h-8 text-gold/50" />
          <p className="text-white/70">{t("emptyState")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {registrations.map((r) => (
            <div key={r.id} className="ns-card rounded-lg p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate" lang={locale}>
                  {r.tournaments ? pickLocalized(r.tournaments, "name", locale) : t("tournamentFallback")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {r.teams?.team_name} · Submitted{" "}
                  {new Date(r.created_at).toLocaleDateString()}
                  {r.reviewed_at &&
                    ` · Reviewed ${new Date(r.reviewed_at).toLocaleDateString()}`}
                </p>
                {r.status === "REJECTED" && r.rejection_reason && (
                  <p className="text-xs text-red-400 mt-1">{t("reason", { reason: r.rejection_reason })}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusPill status={r.status} />
                {r.status === "PENDING" && <WithdrawRegistrationButton registrationId={r.id} />}
                {r.teams?.id && (
                  <Link
                    href={`/teams/${r.teams.id}`}
                    className="text-xs text-gold hover:text-gold-light uppercase tracking-wider"
                  >
                    {t("viewTeam")}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
