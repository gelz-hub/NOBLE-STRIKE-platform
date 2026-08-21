"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CheckCheck, Loader2 } from "lucide-react";
import { markAllNotificationsRead } from "@/app/dashboard/notifications/actions";

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={pending}
      onClick={() => startTransition(() => markAllNotificationsRead())}
      className="h-9 px-3 text-xs uppercase tracking-wider text-gold hover:text-gold-light"
    >
      {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
      Mark All Read
    </Button>
  );
}
