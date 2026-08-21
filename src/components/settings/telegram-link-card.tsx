"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Unlink } from "lucide-react";
import { generateTelegramLinkToken, unlinkTelegram } from "@/app/settings/actions";
import type { Profile } from "@/lib/types/database";

export function TelegramLinkCard({ profile }: { profile: Profile }) {
  const [pending, startTransition] = useTransition();
  const [deepLink, setDeepLink] = useState<string | null>(null);

  function handleLink() {
    startTransition(async () => {
      const result = await generateTelegramLinkToken();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setDeepLink(result.deepLink);
      window.open(result.deepLink, "_blank", "noopener,noreferrer");
    });
  }

  function handleUnlink() {
    startTransition(async () => {
      const result = await unlinkTelegram();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Telegram account unlinked.");
      setDeepLink(null);
    });
  }

  if (profile.telegram_id) {
    return (
      <div className="ns-card rounded-xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-text-primary">
            Linked as {profile.telegram_username ? `@${profile.telegram_username}` : `Telegram user ${profile.telegram_id}`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Since {profile.telegram_linked_at ? new Date(profile.telegram_linked_at).toLocaleDateString() : "—"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleUnlink} disabled={pending} className="ns-btn-outline">
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
          Unlink
        </Button>
      </div>
    );
  }

  return (
    <div className="ns-card rounded-xl p-5 space-y-3">
      <div>
        <p className="text-sm text-text-primary">Link your Telegram account</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Opens Telegram and starts a chat with the NOBLE STRIKE bot to finish linking.
        </p>
      </div>
      <Button onClick={handleLink} disabled={pending} className="ns-btn-gold h-9 px-4 text-xs">
        {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        {pending ? "Generating link..." : "Link Telegram"}
      </Button>
      {deepLink && (
        <p className="text-xs text-muted-foreground">
          Didn&apos;t open?{" "}
          <a href={deepLink} target="_blank" rel="noopener noreferrer" className="text-gold-light hover:underline">
            Tap here
          </a>{" "}
          (expires in 15 minutes).
        </p>
      )}
    </div>
  );
}
