"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link2, Facebook, Twitter } from "lucide-react";

export function ShareLinks({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("news.share");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("share")}</span>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-8 h-8 rounded-md flex items-center justify-center border border-gold/20 text-white/60 hover:text-gold-light hover:border-gold/40 transition-colors"
        aria-label={t("shareOnX")}
      >
        <Twitter className="w-3.5 h-3.5" />
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-8 h-8 rounded-md flex items-center justify-center border border-gold/20 text-white/60 hover:text-gold-light hover:border-gold/40 transition-colors"
        aria-label={t("shareOnFacebook")}
      >
        <Facebook className="w-3.5 h-3.5" />
      </a>
      <button
        onClick={copyLink}
        className="w-8 h-8 rounded-md flex items-center justify-center border border-gold/20 text-white/60 hover:text-gold-light hover:border-gold/40 transition-colors"
        aria-label={t("copyLink")}
      >
        <Link2 className="w-3.5 h-3.5" />
      </button>
      {copied && <span className="text-xs text-emerald-400">{t("copied")}</span>}
    </div>
  );
}
