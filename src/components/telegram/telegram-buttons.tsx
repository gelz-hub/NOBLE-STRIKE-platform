import { Send, Users } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Public Telegram presence — channel + community group links. Deliberately
 * separate from the account-linking feature (src/components/settings/
 * telegram-link-card.tsx, currently unused/hidden — see TELEGRAM.md): these
 * are just external links, no auth, no backend call, nothing to hide.
 *
 * URLs are configurable via env vars rather than hardcoded so they can
 * change without a code deploy. Each button renders only if its URL is
 * set — never a dead link.
 */
export function TelegramButtons({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "compact";
}) {
  const channelUrl = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL;
  const groupUrl = process.env.NEXT_PUBLIC_TELEGRAM_GROUP_URL;

  if (!channelUrl && !groupUrl) return null;

  const buttonClass =
    variant === "compact"
      ? "flex items-center gap-1.5 text-xs text-text-secondary hover:text-gold-light transition-colors"
      : "ns-btn-outline inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-heading font-semibold uppercase tracking-wider";

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {channelUrl && (
        <a href={channelUrl} target="_blank" rel="noopener noreferrer" className={buttonClass}>
          <Send className={variant === "compact" ? "w-3.5 h-3.5" : "w-4 h-4"} />
          Join Telegram Channel
        </a>
      )}
      {groupUrl && (
        <a href={groupUrl} target="_blank" rel="noopener noreferrer" className={buttonClass}>
          <Users className={variant === "compact" ? "w-3.5 h-3.5" : "w-4 h-4"} />
          Join Telegram Community
        </a>
      )}
    </div>
  );
}
