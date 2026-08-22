"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";

export function EventGallery({ urls, eventTitle }: { urls: string[]; eventTitle: string }) {
  const t = useTranslations("legacy.gallery");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (urls.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[0.65rem] uppercase tracking-wider text-gold-light flex items-center gap-1.5">
        <Images className="w-3 h-3" />
        {t("title")}
      </p>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <button
            key={url + i}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="relative w-16 h-16 rounded-lg overflow-hidden border border-gold/20 hover:border-gold/50 transition-colors"
          >
            <Image src={url} alt={`${eventTitle} photo ${i + 1}`} fill sizes="64px" className="object-cover" />
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpenIndex(null)}
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:text-gold-light"
            aria-label={t("close")}
          >
            <X className="w-5 h-5" />
          </button>

          {urls.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenIndex((i) => (i! - 1 + urls.length) % urls.length);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:text-gold-light"
                aria-label={t("previousImage")}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenIndex((i) => (i! + 1) % urls.length);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:text-gold-light"
                aria-label={t("nextImage")}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <div
            className="relative w-full max-w-3xl h-[70vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={urls[openIndex]}
              alt={`${eventTitle} photo ${openIndex + 1}`}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
