"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isDisposableEmail } from "@/lib/disposable-emails";
import { verifyTurnstileToken } from "@/lib/turnstile";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export type ActionResult = { error: string } | { success: true };

export async function signUpAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const t = await getTranslations("auth");
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const username = String(formData.get("username") || "").trim();
  const turnstileToken = String(formData.get("turnstileToken") || "");

  if (!email || !password || !username) {
    return { error: t("errors.fillAllFields") };
  }
  if (password.length < 8) {
    return { error: t("errors.passwordTooShort") };
  }
  if (isDisposableEmail(email)) {
    return { error: t("errors.disposableEmail") };
  }

  const ip = await getClientIp();

  const turnstileOk = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstileOk) {
    return { error: t("errors.captchaFailed") };
  }

  const { allowed, retryAfterSeconds } = await checkRateLimit("registration", ip);
  if (!allowed) {
    return { error: t("errors.tooManyRegistrationAttempts", { seconds: retryAfterSeconds }) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function signInAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const t = await getTranslations("auth");
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");

  if (!email || !password) {
    return { error: t("errors.fillAllFields") };
  }

  const ip = await getClientIp();
  const { allowed, retryAfterSeconds } = await checkRateLimit("login", `${ip}:${email}`);
  if (!allowed) {
    return { error: t("errors.tooManyLoginAttempts", { seconds: retryAfterSeconds }) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: t("errors.invalidCredentials") };
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordResetAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const t = await getTranslations("auth");
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: t("errors.enterEmail") };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });

  // Always report success to avoid leaking which emails are registered.
  if (error) {
    console.error("resetPasswordForEmail error:", error.message);
  }
  return { success: true };
}

export async function updatePasswordAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const t = await getTranslations("auth");
  const password = String(formData.get("password") || "");
  if (password.length < 8) {
    return { error: t("errors.passwordTooShort") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };
  redirect("/dashboard");
}
