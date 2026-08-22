import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getLegacyEventById } from "@/lib/legacy/queries";
import { LegacyForm } from "@/components/admin/legacy-form";
import { LegacyActionsMenu } from "@/components/admin/legacy-actions-menu";
import { pickLocalized } from "@/lib/i18n/content";
import type { Locale } from "@/i18n/config";
import { updateLegacyEvent } from "../../actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditLegacyEventPage({ params }: Props) {
  const { id } = await params;
  const [event, localeStr, t] = await Promise.all([
    getLegacyEventById(id),
    getLocale(),
    getTranslations("admin.legacy"),
  ]);
  if (!event) notFound();
  const locale = localeStr as Locale;

  const boundUpdate = updateLegacyEvent.bind(null, id);
  const title = pickLocalized(event, "title", locale);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">{t("editEventTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {event.year} · {title}
          </p>
        </div>
        <LegacyActionsMenu eventId={id} title={title} isPublished={event.is_published} />
      </div>

      <div className="ns-card ns-card-gold-edge rounded-xl p-6">
        <LegacyForm action={boundUpdate} initial={event} mode="edit" />
      </div>
    </div>
  );
}
