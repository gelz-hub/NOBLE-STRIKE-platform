"use client";

import { useTranslations } from "next-intl";
import { useI18n } from "@/components/i18n/i18n-provider";
import { type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const { locale, setLocale } = useI18n();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-gold/20 overflow-hidden text-xs font-semibold uppercase tracking-wider",
        className
      )}
      role="group"
      aria-label={t("language")}
    >
      {(["en", "km"] as const).map((code: Locale) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={cn(
            "px-2.5 py-1.5 transition-colors",
            locale === code
              ? "bg-gold/15 text-gold-light"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-secondary"
          )}
        >
          {code === "en" ? "EN" : "ខ្មែរ"}
        </button>
      ))}
    </div>
  );
}
