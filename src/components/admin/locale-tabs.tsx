"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/**
 * Wraps a bilingual CMS field pair (English tab / Khmer tab) so editors can
 * fill both language versions from a single form without the page growing a
 * second set of visible fields. Khmer is always optional — the public site
 * falls back to English via pickLocalized() when a Khmer field is blank.
 *
 * Usage:
 *   <LocaleTabs
 *     en={<Input name="title_en" defaultValue={item?.title_en} required />}
 *     km={<Input name="title_km" defaultValue={item?.title_km} />}
 *   />
 */
export function LocaleTabs({ en, km }: { en: React.ReactNode; km: React.ReactNode }) {
  const t = useTranslations("admin.localeTabs");

  return (
    <Tabs defaultValue="en" className="w-full">
      <TabsList>
        <TabsTrigger value="en">{t("english")}</TabsTrigger>
        <TabsTrigger value="km">{t("khmer")}</TabsTrigger>
      </TabsList>
      <TabsContent value="en" className="pt-2">
        {en}
      </TabsContent>
      <TabsContent value="km" className="pt-2 space-y-1.5">
        {km}
        <p className="text-xs text-muted-foreground">{t("khmerHint")}</p>
      </TabsContent>
    </Tabs>
  );
}
