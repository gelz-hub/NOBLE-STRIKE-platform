"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound } from "lucide-react";
import { updatePasswordAction, type ActionResult } from "@/app/(auth)/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("auth.resetPassword");
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold w-full h-11">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
      {pending ? t("updating") : t("submit")}
    </Button>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations("auth.resetPassword");
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    updatePasswordAction,
    null
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="font-display font-bold text-xl text-white">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs text-muted-foreground">
            {t("newPasswordLabel")}
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder={t("passwordPlaceholder")}
            className="ns-input"
          />
        </div>

        {state && "error" in state && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <SubmitButton />
      </form>
    </div>
  );
}
