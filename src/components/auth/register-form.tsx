"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, MailCheck } from "lucide-react";
import { signUpAction, type ActionResult } from "@/app/(auth)/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("auth.register");
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold w-full h-11">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
      {pending ? t("creatingAccount") : t("submit")}
    </Button>
  );
}

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    signUpAction,
    null
  );

  if (state && "success" in state) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center">
          <MailCheck className="w-6 h-6 text-gold" />
        </div>
        <div className="space-y-1">
          <h1 className="font-display font-bold text-xl text-white">{t("checkEmailTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("checkEmailBody")}</p>
        </div>
        <Link href="/login">
          <Button className="ns-btn-outline mt-2">{t("backToSignIn")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="font-display font-bold text-xl text-white">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="username" className="text-xs text-muted-foreground">
            {t("usernameLabel")}
          </Label>
          <Input
            id="username"
            name="username"
            required
            minLength={3}
            maxLength={24}
            placeholder="your_ign"
            className="ns-input"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs text-muted-foreground">
            {t("emailLabel")}
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="ns-input"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs text-muted-foreground">
            {t("passwordLabel")}
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

      <p className="text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/login" className="text-gold hover:text-gold-light font-medium">
          {t("signInLink")}
        </Link>
      </p>
    </div>
  );
}
