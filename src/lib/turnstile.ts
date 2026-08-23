import "server-only";
import { logEvent } from "@/lib/logger";

/**
 * Cloudflare Turnstile server-side verification. NOT auto-provisioned: get
 * a site key + secret key from the Cloudflare dashboard (Turnstile ->
 * Add site) and set NEXT_PUBLIC_TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY.
 *
 * Fails open, not closed — same philosophy as src/lib/rate-limit.ts: if the
 * secret key isn't configured (local dev, or before Turnstile is set up in
 * production), verification is skipped with a one-time warning rather than
 * blocking every signup. This is a defense-in-depth layer on top of the
 * registration rate limit and disposable-email check, not the only thing
 * standing between the app and bot signups.
 */

let warnedUnconfigured = false;

export function isTurnstileConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

export async function verifyTurnstileToken(token: string | null, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      logEvent({
        event: "turnstile.unconfigured",
        level: "warn",
        message: "TURNSTILE_SECRET_KEY not set — CAPTCHA verification is disabled (failing open).",
      });
    }
    return true;
  }

  if (!token) return false;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const data = (await response.json()) as { success: boolean; ["error-codes"]?: string[] };
    if (!data.success) {
      logEvent({
        event: "turnstile.failed",
        level: "warn",
        errorCodes: data["error-codes"],
      });
    }
    return data.success;
  } catch (err) {
    logEvent({
      event: "turnstile.verify_error",
      level: "error",
      message: err instanceof Error ? err.message : String(err),
    });
    // Network failure talking to Cloudflare shouldn't itself lock out real
    // users — the rate limit + disposable-email check still apply.
    return true;
  }
}
