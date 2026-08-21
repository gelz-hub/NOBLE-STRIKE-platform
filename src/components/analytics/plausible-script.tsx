import Script from "next/script";

/**
 * Plausible — chosen over PostHog for being a single script tag with no
 * client SDK, no cookies, and no separate consent-banner requirement
 * (privacy-friendly by default, no personal data collected). Renders
 * nothing if NEXT_PUBLIC_PLAUSIBLE_DOMAIN isn't set (e.g. local dev, or
 * before a Plausible account/self-host is provisioned — see
 * DEPLOYMENT.md's "Analytics" section).
 */
export function PlausibleScript() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;

  const scriptSrc = process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL || "https://plausible.io/js/script.custom-events.js";

  return (
    <Script
      defer
      data-domain={domain}
      src={scriptSrc}
      strategy="afterInteractive"
    />
  );
}
