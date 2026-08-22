"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Save, ShieldCheck } from "lucide-react";
import { updateEmail, updatePassword, type ActionResult } from "@/app/settings/actions";

function FormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-gold" />
        <h3 className="font-heading font-semibold uppercase text-sm tracking-wider text-text-primary">{title}</h3>
        <div className="flex-1 h-px bg-gradient-to-r from-gold/20 to-transparent" />
      </div>
      {children}
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const tCommon = useTranslations("common");
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold h-10 px-5">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {pending ? tCommon("saving") : label}
    </Button>
  );
}

export function AccountSettingsForm({ currentEmail }: { currentEmail: string }) {
  const t = useTranslations("settings.account");
  const [emailState, emailAction] = useActionState<ActionResult | null, FormData>(updateEmail, null);
  const [passwordState, passwordAction] = useActionState<ActionResult | null, FormData>(updatePassword, null);

  return (
    <div className="space-y-10">
      <form action={emailAction} className="space-y-4">
        <FormSection icon={Mail} title={t("emailAddressTitle")}>
          <div className="space-y-1.5 max-w-sm">
            <Label className="text-xs text-muted-foreground">{t("emailLabel")}</Label>
            <Input
              name="email"
              type="email"
              required
              defaultValue={currentEmail}
              className="ns-input"
            />
            <p className="text-[0.7rem] text-muted-foreground">{t("emailChangeHint")}</p>
          </div>
          {emailState && "error" in emailState && <p className="text-sm text-destructive">{emailState.error}</p>}
          {emailState && "success" in emailState && (
            <p className="text-sm text-emerald-400">{t("emailChangeSuccess")}</p>
          )}
          <SubmitButton label={t("updateEmail")} />
        </FormSection>
      </form>

      <form action={passwordAction} className="space-y-4 pt-8 border-t border-gold/10">
        <FormSection icon={ShieldCheck} title={t("passwordTitle")}>
          <div className="space-y-1.5 max-w-sm">
            <Label className="text-xs text-muted-foreground">{t("newPasswordLabel")}</Label>
            <Input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder={t("passwordPlaceholder")}
              className="ns-input"
            />
          </div>
          {passwordState && "error" in passwordState && (
            <p className="text-sm text-destructive">{passwordState.error}</p>
          )}
          {passwordState && "success" in passwordState && (
            <p className="text-sm text-emerald-400">{t("passwordUpdated")}</p>
          )}
          <SubmitButton label={t("updatePassword")} />
        </FormSection>
      </form>
    </div>
  );
}
