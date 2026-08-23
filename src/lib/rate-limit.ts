import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import { logEvent } from "@/lib/logger";

/**
 * Sliding-window rate limiting backed by Upstash Redis — the standard
 * choice for a Vercel-deployed serverless app, since regular in-memory
 * counters don't survive across function instances. NOT auto-provisioned
 * by this code: run `vercel integration add upstash` (or install it from
 * the Vercel Marketplace dashboard) against your linked project, which
 * sets the env vars this reads automatically. See DEPLOYMENT.md's "Rate
 * limiting" section.
 *
 * Supports both env var namings Vercel's Marketplace has used for Upstash
 * Redis over time (`UPSTASH_REDIS_REST_URL`/`_TOKEN` directly, or the
 * legacy Vercel KV naming `KV_REST_API_URL`/`KV_REST_API_TOKEN`).
 *
 * Fails open, not closed: if Redis isn't configured (e.g. local dev, or
 * before the integration is provisioned), every check simply allows the
 * request and logs a one-time warning — this is a defense-in-depth layer,
 * not the only thing standing between the app and abuse (every gated
 * action still has its own auth/validation checks), so "rate limiting is
 * temporarily unavailable" should never mean "the app is down."
 */

const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

if (!redis) {
  logEvent({
    event: "rate_limit.unconfigured",
    level: "warn",
    message: "UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting is disabled (failing open).",
  });
}

export type RateLimitBucket =
  | "login"
  | "registration"
  | "news-view"
  | "dispute-create"
  | "post-create"
  | "report-create";

const BUCKET_LIMITS: Record<RateLimitBucket, { limit: number; windowSeconds: number }> = {
  // Login: generous enough for a genuine typo or two, tight enough to slow
  // credential stuffing.
  login: { limit: 10, windowSeconds: 60 },
  // Account signup: 5 per IP per hour — tight enough to blunt a mass
  // account-creation script, generous enough for a shared IP (office,
  // internet cafe, mobile carrier NAT) creating a handful of real accounts.
  registration: { limit: 5, windowSeconds: 3600 },
  // News view-count RPC: anonymous-callable by design (see the news
  // migration), so it's the most exposed single endpoint to a naive
  // view-count-inflation script.
  "news-view": { limit: 30, windowSeconds: 60 },
  // Match dispute creation: legitimate use is rare (one dispute per
  // contested match); a tight limit mostly targets spam/harassment via the
  // dispute explanation field.
  "dispute-create": { limit: 5, windowSeconds: 300 },
  // Recruitment post create/update: a real user posts a handful of LFT/LFP
  // listings, not a stream of them.
  "post-create": { limit: 5, windowSeconds: 60 },
  // Reports: generous enough to report several bad posts/users in one
  // sitting, tight enough to stop a report-flooding harassment campaign.
  "report-create": { limit: 10, windowSeconds: 3600 },
};

const limiters = new Map<RateLimitBucket, Ratelimit>();

function limiterFor(bucket: RateLimitBucket): Ratelimit | null {
  if (!redis) return null;
  let limiter = limiters.get(bucket);
  if (!limiter) {
    const { limit, windowSeconds } = BUCKET_LIMITS[bucket];
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `noble-strike:ratelimit:${bucket}`,
      analytics: true,
    });
    limiters.set(bucket, limiter);
  }
  return limiter;
}

/** Vercel populates x-forwarded-for on every request; falls back to a
 *  constant so rate limiting still degrades gracefully (shared bucket
 *  across all callers) rather than throwing when it's absent, e.g. in
 *  local dev without a proxy in front of the app. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  /** Seconds until the caller should retry, only meaningful when !allowed. */
  retryAfterSeconds: number;
}

/**
 * `identifier` should be something the caller controls scoping for — an IP
 * address (from request headers), a user id, or a composite
 * (`${ip}:${email}`) for login attempts specifically.
 */
export async function checkRateLimit(
  bucket: RateLimitBucket,
  identifier: string
): Promise<RateLimitResult> {
  const limiter = limiterFor(bucket);
  if (!limiter) {
    return { allowed: true, remaining: Infinity, limit: Infinity, retryAfterSeconds: 0 };
  }

  const result = await limiter.limit(identifier);
  const retryAfterSeconds = result.success ? 0 : Math.max(0, Math.ceil((result.reset - Date.now()) / 1000));

  if (!result.success) {
    logEvent({
      event: "rate_limit.blocked",
      level: "warn",
      bucket,
      identifier,
      limit: result.limit,
    });
  }

  return {
    allowed: result.success,
    remaining: result.remaining,
    limit: result.limit,
    retryAfterSeconds,
  };
}
