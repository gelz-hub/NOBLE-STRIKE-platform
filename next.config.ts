import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Content-Security-Policy, assembled explicitly (not string-templated) so
// each directive's reasoning is visible in the diff. See SECURITY.md /
// DEPLOYMENT.md's "Security headers" section for what each one covers and
// why. next/font self-hosts every font used in this app at build time, so
// no Google Fonts domain needs allowlisting here.
const CSP_DIRECTIVES = [
  "default-src 'self'",
  // Next.js's own inline bootstrap scripts require 'unsafe-inline'; no
  // nonce-based CSP is wired up (a stricter follow-up, not done here).
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self' data:",
  // Supabase (DB/auth) + Sentry error ingest are the only external APIs
  // this app's client code talks to directly.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP_DIRECTIVES },
  // Belt-and-suspenders with frame-ancestors above — some older browsers
  // only honor this legacy header.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Only takes effect over HTTPS (which Vercel terminates by default) —
  // harmless as a no-op over local HTTP dev.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // "standalone" output is for self-hosting (see OPERATIONS.md/DEPLOYMENT.md's
  // `npm run build`/`npm run start` self-host path) — Vercel's own builder
  // produces its own optimized serverless bundle and the two modes conflict
  // (standalone's reorganized .next layout breaks Vercel's file-tracing
  // step). VERCEL is set automatically in Vercel's build environment, so
  // this stays "standalone" everywhere else without needing two configs.
  output: process.env.VERCEL ? undefined : "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    loader: "custom",
    loaderFile: "./src/lib/cloudinary/image-loader.ts",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // Only uploads source maps / creates a release when these are set (CI or
  // a Vercel build with the Sentry integration configured) — silently
  // skipped otherwise, so this is safe to ship even before Sentry is wired
  // up. See DEPLOYMENT.md / MONITORING.md.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
});
