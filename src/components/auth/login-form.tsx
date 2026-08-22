"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn } from "lucide-react";
import { signInAction, type ActionResult } from "@/app/(auth)/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("auth.login");
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold w-full h-11">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
      {pending ? t("signingIn") : t("submit")}
    </Button>
  );
}

export function LoginForm() {
  const t = useTranslations("auth.login");
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    signInAction,
    null
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="font-display font-bold text-xl text-white">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs text-muted-foreground">
              {t("passwordLabel")}
            </Label>
            <Link href="/forgot-password" className="text-xs text-gold hover:text-gold-light">
              {t("forgotPassword")}
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="ns-input"
          />
        </div>

        {state && "error" in state && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <SubmitButton />
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-gold hover:text-gold-light font-medium">
          {t("registerLink")}
        </Link>
      </p>
    </div>
  );
}
