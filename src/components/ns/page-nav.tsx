"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { NSLogo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { useScrolled } from "./use-scrolled";
import { cn } from "@/lib/utils";

/**
 * The shared NOBLE STRIKE sticky navbar for every public route that isn't the
 * homepage SPA shell (News, News article, Recruitment, Tournament / Team /
 * Profile / Match detail, Legacy).
 *
 * Uses `position: sticky` — never `fixed` — so it occupies a real layout
 * slot from first paint: no scroll-jump, no content hidden underneath,
 * nothing to offset, and it can't be broken by an ancestor because none of
 * the wrappers above it (`RouteTransition` div, `body`, `html`) set
 * `overflow`.
 *
 * Past 8px of scroll it does a single 200ms "condense": ~72px → ~56px tall,
 * a touch more backdrop opacity, plus a hairline gold bottom border and soft
 * shadow — identical to the homepage `NavBar`'s scrolled treatment (both
 * read `useScrolled()`).
 */
export function PageNav({
  backHref = "/",
  backLabel,
}: {
  /** Where the "back" affordance points. Defaults to the site root. */
  backHref?: string;
  /** Overrides the default "Back to Site" label (already localized). */
  backLabel?: string;
}) {
  const t = useTranslations();
  const scrolled = useScrolled();
  const label = backLabel ?? t("common.backToSite");

  return (
    <header
      className={cn(
        "sticky top-0 z-50 backdrop-blur-md transition-all duration-200 ease-out",
        scrolled
          ? "bg-black/85 border-b border-gold/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
          : "bg-black/40 border-b border-transparent shadow-none"
      )}
    >
      <div className="h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div
          className={cn(
            "flex items-center justify-between gap-3 transition-all duration-200 ease-out",
            scrolled ? "h-14" : "h-18"
          )}
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 group shrink-0"
            aria-label={t("navigation.homeAriaLabel")}
          >
            <div className="transition-transform duration-500 group-hover:scale-105">
              <NSLogo size={30} />
            </div>
            <span className="hidden sm:flex flex-col leading-none" lang="en">
              <span className="font-display font-extrabold text-sm tracking-[0.18em] text-gold-shine">
                NOBLE
              </span>
              <span className="font-display font-extrabold text-sm tracking-[0.3em] text-gold-shine -mt-0.5">
                STRIKE
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/60 hover:text-gold-light transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              {label}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
