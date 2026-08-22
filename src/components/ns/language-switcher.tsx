"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/app/actions/locale";
import { isLocale, localeCookieName, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

const STORAGE_KEY = localeCookieName;

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const router = useRouter();
  const syncedRef = useRef(false);

  // First paint uses the server-rendered (cookie) locale. If the visitor's
  // saved localStorage preference disagrees — e.g. a fresh cookie on a
  // returning browser — sync the cookie to match and refresh once.
  useEffect(() => {
    if (syncedRef.current) return;
    syncedRef.current = true;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isLocale(stored) && stored !== locale) {
        void setLocale(stored).then(() => router.refresh());
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — cookie stays authoritative.
    }
  }, [locale, router]);

  async function switchTo(next: Locale) {
    if (next === locale) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore — cookie persistence still works
    }
    await setLocale(next);
    router.refresh();
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-gold/20 overflow-hidden text-xs font-semibold uppercase tracking-wider",
        className
      )}
      role="group"
      aria-label={t("language")}
    >
      {(["en", "km"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => switchTo(code)}
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
