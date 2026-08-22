import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getAdminLegacyEvents } from "@/lib/legacy/queries";
import { LegacyRow } from "@/components/admin/legacy-row";
import { Button } from "@/components/ui/button";
import { History, Plus } from "lucide-react";

export default async function AdminLegacyPage() {
  const [events, t] = await Promise.all([getAdminLegacyEvents(), getTranslations("admin.legacy")]);
  const byYear = new Map<number, typeof events>();
  for (const e of events) {
    if (!byYear.has(e.year)) byYear.set(e.year, []);
    byYear.get(e.year)!.push(e);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <Link href="/admin/legacy/new">
          <Button className="ns-btn-gold h-10 px-4 text-xs uppercase tracking-wider">
            <Plus className="w-4 h-4" />
            {t("newEvent")}
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="ns-card rounded-xl p-12 flex flex-col items-center text-center gap-3">
          <History className="w-8 h-8 text-gold/50" />
          <p className="text-white/70">{t("emptyState")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {years.map((year) => (
            <div key={year} className="space-y-2">
              <p className="text-xs font-heading font-semibold uppercase tracking-wider text-gold-light">{year}</p>
              <div className="space-y-2">
                {byYear.get(year)!.map((e) => (
                  <LegacyRow key={e.id} event={e} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
