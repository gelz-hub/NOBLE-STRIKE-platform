"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../locales/en.json";
import km from "../../../locales/km.json";
import { setLocale as persistLocaleCookie } from "@/app/actions/locale";
import { isLocale, localeCookieName, timeZone, type Locale } from "@/i18n/config";
import { mergeMessages } from "@/lib/i18n/merge";

const STORAGE_KEY = localeCookieName;

// Both dictionaries live in the client bundle and both merged trees are built
// once, at module load — so a language switch is a pure in-memory lookup with
// no network on the critical path. `mergeMessages` matches src/i18n/request.ts
// exactly, so the tree the client swaps to is identical to what the server
// would have rendered for that locale (no hydration mismatch, no English flash).
const MESSAGES: Record<Locale, ReturnType<typeof mergeMessages>> = {
  en,
  km: mergeMessages(en, km),
};

type I18nContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  /** True while the background Server Component refresh is in flight. */
  isSyncing: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [isSyncing, startTransition] = useTransition();
  const syncedRef = useRef(false);

  // Persist the cookie and reconcile Server-Component-rendered text
  // (dashboard/admin/news/legacy/detail pages use getTranslations) via a
  // low-priority refresh. Kept off the critical path — the client chrome has
  // already switched by the time this runs, and router.refresh() preserves
  // client state (scroll, this provider's own useState).
  const syncToServer = useCallback(
    (next: Locale) => {
      startTransition(async () => {
        try {
          await persistLocaleCookie(next);
        } catch {
          // Cookie write failed — localStorage still carries the preference
          // and the mount-time reconciler retries on the next load.
        }
        router.refresh();
      });
    },
    [router]
  );

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      // Instant: swap the in-memory dictionary. The provider sits above the
      // whole tree but React only re-renders useTranslations()/useLocale()
      // consumers.
      setLocaleState(next);
      if (typeof document !== "undefined") document.documentElement.lang = next;
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // localStorage unavailable (private mode) — cookie still persists.
      }
      syncToServer(next);
    },
    [locale, syncToServer]
  );

  // First paint uses the server-rendered (cookie) locale. If the visitor's
  // saved localStorage preference disagrees — e.g. a cleared cookie on a
  // returning browser — adopt it once, after hydration. The state update is
  // deferred into the transition (post-await) so it never runs synchronously
  // inside the effect.
  useEffect(() => {
    if (syncedRef.current) return;
    syncedRef.current = true;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return; // localStorage unavailable — cookie stays authoritative.
    }
    if (!isLocale(stored) || stored === locale) return;
    const next = stored;
    startTransition(async () => {
      try {
        await persistLocaleCookie(next);
      } catch {
        // ignore — retried on next load
      }
      setLocaleState(next);
      if (typeof document !== "undefined") document.documentElement.lang = next;
      router.refresh();
    });
  }, [locale, router]);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, isSyncing }),
    [locale, setLocale, isSyncing]
  );

  return (
    <I18nContext.Provider value={value}>
      <NextIntlClientProvider
        locale={locale}
        messages={MESSAGES[locale]}
        timeZone={timeZone}
      >
        {children}
      </NextIntlClientProvider>
    </I18nContext.Provider>
  );
}
