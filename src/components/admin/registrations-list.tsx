"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { StatusPill, TeamMonogram } from "@/components/ns/ui";
import { RegistrationReviewPanel } from "./registration-review-panel";
import { pickLocalized } from "@/lib/i18n/content";
import type { AdminRegistrationRow } from "@/app/admin/registrations/actions";
import type { Locale } from "@/i18n/config";

export function RegistrationsList({ rows }: { rows: AdminRegistrationRow[] }) {
  const router = useRouter();
  const locale = useLocale() as Locale;

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="ns-card rounded-lg p-4 flex items-center gap-3">
          <TeamMonogram
            name={r.teams?.team_name ?? "?"}
            logo={r.teams?.logo_url}
            size={40}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{r.teams?.team_name}</p>
            <p className="text-xs text-muted-foreground truncate" lang={locale}>
              {r.tournaments ? pickLocalized(r.tournaments, "name", locale) : ""} ·{" "}
              {new Date(r.created_at).toLocaleDateString()}
            </p>
          </div>
          <StatusPill status={r.status} />
          <RegistrationReviewPanel registration={r} onDone={() => router.refresh()} />
        </div>
      ))}
    </div>
  );
}
