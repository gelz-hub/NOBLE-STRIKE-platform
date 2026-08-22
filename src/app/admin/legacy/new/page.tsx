import { getTranslations } from "next-intl/server";
import { LegacyForm } from "@/components/admin/legacy-form";
import { createLegacyEvent } from "../actions";

export default async function NewLegacyEventPage() {
  const t = await getTranslations("admin.legacy");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">{t("newEventTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("newEventSubtitle")}</p>
      </div>

      <div className="ns-card ns-card-gold-edge rounded-xl p-6">
        <LegacyForm action={createLegacyEvent} mode="create" />
      </div>
    </div>
  );
}
