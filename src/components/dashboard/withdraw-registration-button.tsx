"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Loader2, XCircle } from "lucide-react";
import { withdrawRegistration } from "@/app/dashboard/registrations/actions";

export function WithdrawRegistrationButton({ registrationId }: { registrationId: string }) {
  const t = useTranslations("dashboard.registrations");
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await withdrawRegistration(registrationId);
          if ("error" in result) {
            toast.error(result.error);
            return;
          }
          toast.success(t("registrationWithdrawn"));
        });
      }}
      className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/60 hover:text-destructive transition-colors disabled:opacity-50"
    >
      {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
      {t("withdraw")}
    </button>
  );
}
