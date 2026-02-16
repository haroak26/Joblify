import helmet from "helmet";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { normalizePlan, type PlanType } from "@shared/schema";
import { storage } from "../storage";
import { pool } from "../db";

declare global {
  namespace Express {
    interface Request {
      userPlan?: PlanType;
    }
  }
}

// Time constants (in milliseconds)
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// Rate limiting windows
const AUTH_WINDOW_MS = 15 * MINUTE_MS;
const REGISTRATION_WINDOW_MS = 1 * HOUR_MS;
const SESSION_MAX_AGE_MS = 30 * DAY_MS;

// Account lockout settings
const MAX_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCKOUT_DURATION_MS = 15 * MINUTE_MS;

const CREATE_RATE_LIMIT_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS rate_limit_counters (
    key TEXT PRIMARY KEY,
    hits INTEGER NOT NULL,
    reset_time TIMESTAMPTZ NOT NULL
  );
`;
const CREATE_RATE_LIMIT_RESET_INDEX_SQL = "CREATE INDEX IF NOT EXISTS rate_limit_counters_reset_time_idx ON rate_limit_counters (reset_time);";
const UPSERT_RATE_LIMIT_COUNTER_SQL = `
  INSERT INTO rate_limit_counters (key, hits, reset_time)
  VALUES ($1, 1, NOW() + ($2 * INTERVAL '1 second'))
  ON CONFLICT (key) DO UPDATE
  SET
    hits = CASE
      WHEN rate_limit_counters.reset_time <= NOW() THEN 1
      ELSE rate_limit_counters.hits + 1
    END,
    reset_time = CASE
      WHEN rate_limit_counters.reset_time <= NOW() THEN NOW() + ($2 * INTERVAL '1 second')
      ELSE rate_limit_counters.reset_time
    END
  RETURNING hits, reset_time;
`;
const SELECT_RATE_LIMIT_COUNTER_SQL = "SELECT hits, reset_time FROM rate_limit_counters WHERE key = $1 AND reset_time > NOW();";
const DELETE_RATE_LIMIT_COUNTER_SQL = "DELETE FROM rate_limit_counters WHERE key = $1;";
const DELETE_EXPIRED_RATE_LIMIT_COUNTERS_SQL = "DELETE FROM rate_limit_counters WHERE reset_time <= NOW();";
let rateLimitStorageInitPromise: Promise<void> | null = null;

async function ensureRateLimitStorage() {
  if (!rateLimitStorageInitPromise) {
    rateLimitStorageInitPromise = pool
      .query(CREATE_RATE_LIMIT_TABLE_SQL)
      .then(() => pool.query(CREATE_RATE_LIMIT_RESET_INDEX_SQL))
      .then(() => undefined)
      .catch((error) => {
        rateLimitStorageInitPromise = null;
        throw error;
      });
  }

  return rateLimitStorageInitPromise;
}

async function incrementRateCounter(key: string, windowMs: number) {
  await ensureRateLimitStorage();
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const result = await pool.query<{ hits: number; reset_time: Date }>(UPSERT_RATE_LIMIT_COUNTER_SQL, [key, windowSeconds]);

  return {
    hits: Number(result.rows[0]?.hits ?? 0),
    resetTimeMs: result.rows[0]?.reset_time ? new Date(result.rows[0].reset_time).getTime() : Date.now() + windowMs,
  };
}

async function getRateCounter(key: string) {
  await ensureRateLimitStorage();
  const result = await pool.query<{ hits: number; reset_time: Date }>(SELECT_RATE_LIMIT_COUNTER_SQL, [key]);

  if (!result.rows[0]) {
    return { hits: 0, resetTimeMs: Date.now() };
  }

  return {
    hits: Number(result.rows[0].hits),
    resetTimeMs: new Date(result.rows[0].reset_time).getTime(),
  };
}

async function resetRateCounter(key: string) {
  await ensureRateLimitStorage();
  await pool.query(DELETE_RATE_LIMIT_COUNTER_SQL, [key]);
}

function setRateLimitHeaders(res: Response, limit: number, hits: number, resetTimeMs: number) {
  const remaining = Math.max(0, limit - hits);
  const resetSeconds = Math.max(0, Math.ceil((resetTimeMs - Date.now()) / 1000));

  res.setHeader("RateLimit-Limit", String(limit));
  res.setHeader("RateLimit-Remaining", String(remaining));
  res.setHeader("RateLimit-Reset", String(resetSeconds));
}

function getRequestIdentity(req: Request): string {
  return req.user?.id || req.ip || "unknown";
}

function createDistributedRateLimit(options: {
  namespace: string;
  windowMs: number;
  max: number | ((req: Request) => number | Promise<number>);
  message: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
}): RequestHandler {
  const { namespace, windowMs, max, message, keyGenerator = getRequestIdentity, skipSuccessfulRequests = false } = options;

  return async (req, res, next) => {
    const key = `${namespace}:${keyGenerator(req)}`;

    try {
      const limit = typeof max === "function" ? await max(req) : max;

      if (skipSuccessfulRequests) {
        const current = await getRateCounter(key);
        setRateLimitHeaders(res, limit, current.hits, current.resetTimeMs);

        if (current.hits >= limit) {
          return res.status(429).json({ message });
        }

        res.on("finish", () => {
          if (res.statusCode >= 400) {
            incrementRateCounter(key, windowMs).catch((error) => {
              console.error(`[Security] Failed to increment rate limit counter for ${namespace}`, error);
            });
          }
        });

        return next();
      }

      const counter = await incrementRateCounter(key, windowMs);
      setRateLimitHeaders(res, limit, counter.hits, counter.resetTimeMs);

      if (counter.hits > limit) {
        return res.status(429).json({ message });
      }

      next();
    } catch (error) {
      console.error(`[Security] Distributed rate limiter failed for ${namespace}. Allowing request.`, error);
      next();
    }
  };
}

/**
 * Security headers middleware using helmet
 */
export function securityHeaders() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          ...(isDevelopment ? ["'unsafe-inline'", "'unsafe-eval'"] : []), // Only in dev for Vite HMR
          "https://cdn.posthog.com",
          "https://static.zdassets.com",
          "https://ekr.zdassets.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: [
          "'self'",
          "https://app.posthog.com",
          "https://*.zendesk.com",
          "https://*.zdassets.com",
        ],
        fontSrc: ["'self'", "data:", "https:"],
        frameSrc: ["'self'", "https://*.zendesk.com"],
        workerSrc: ["'self'", "blob:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for some third-party integrations
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  });
}

/**
 * Tiered rate limiting based on user plan
 */
export function createTieredRateLimit(options: {
  freeLimit: number;
  plusLimit: number;
  ultraLimit: number;
  windowMs?: number;
  message?: string;
}) {
  const {
    freeLimit,
    plusLimit,
    ultraLimit,
    windowMs = 60 * 1000, // 1 minute default
    message = "Too many requests, please try again later.",
  } = options;

  return createDistributedRateLimit({
    namespace: `tiered:${message}`,
    windowMs,
    max: (req) => {
      const plan = normalizePlan(req.userPlan);
      
      switch (plan) {
        case "ultra":
        case "lifetime":
          return ultraLimit;
        case "plus":
          return plusLimit;
        default:
          return freeLimit;
      }
    },
    message,
  });
}

/**
 * Resolves authenticated session users to their subscription plan.
 *
 * This middleware should run before tiered rate limiters so they can
 * read `req.userPlan` without doing DB work on every limiter callback.
 */
export async function resolveUserPlan(req: Request, _res: Response, next: NextFunction) {
  const userId = req.session?.userId;

  // Anonymous users keep free tier defaults
  if (!userId) {
    req.userPlan = "free";
    return next();
  }

  try {
    const subscription = await storage.getSubscription(userId);
    req.userPlan = normalizePlan(subscription?.plan);
  } catch (error) {
    // Fail open to free limits if plan resolution errors
    req.userPlan = "free";
    console.error("Failed to resolve user subscription plan for rate limiting", error);
  }

  next();
}

/**
 * AI features rate limiter (more restrictive)
 */
export const aiRateLimit = createTieredRateLimit({
  freeLimit: 10, // 10 requests per minute for free users
  plusLimit: 50, // 50 requests per minute for plus users
  ultraLimit: 200, // 200 requests per minute for ultra/lifetime users
  message: "AI request limit exceeded. Please upgrade your plan for higher limits.",
});

/**
 * Job scraping rate limiter
 */
export const jobScrapingRateLimit = createTieredRateLimit({
  freeLimit: 5, // 5 scrapes per minute
  plusLimit: 30, // 30 scrapes per minute
  ultraLimit: 100, // 100 scrapes per minute
  message: "Job scraping limit exceeded. Please try again later or upgrade your plan.",
});

/**
 * General API rate limiter
 */
export const generalApiRateLimit = createTieredRateLimit({
  freeLimit: 100, // 100 requests per minute
  plusLimit: 300, // 300 requests per minute
  ultraLimit: 1000, // 1000 requests per minute
  message: "Too many requests. Please try again later.",
});

/**
 * Authentication endpoints rate limiter (prevents brute force)
 */
export const authRateLimit = createDistributedRateLimit({
  namespace: "auth",
  windowMs: AUTH_WINDOW_MS,
  max: 5,
  skipSuccessfulRequests: true,
  message: "Too many login attempts. Please try again after 15 minutes.",
  keyGenerator: (req) => req.ip || "unknown",
});

/**
 * Registration rate limiter (prevents spam)
 */
export const registrationRateLimit = createDistributedRateLimit({
  namespace: "registration",
  windowMs: REGISTRATION_WINDOW_MS,
  max: 3,
  message: "Too many accounts created. Please try again later.",
  keyGenerator: (req) => req.ip || "unknown",
});

/**
 * Input sanitization middleware
 *
 * This middleware avoids altering legitimate payload values and only removes
 * prototype-pollution keys from untrusted request objects.
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  try {
    const blockedKeys = new Set(["__proto__", "prototype", "constructor"]);

    const scrubObject = (value: unknown): unknown => {
      if (Array.isArray(value)) {
        return value.map(scrubObject);
      }

      if (value && typeof value === "object") {
        const input = value as Record<string, unknown>;
        const output: Record<string, unknown> = {};

        for (const [key, nested] of Object.entries(input)) {
          if (blockedKeys.has(key)) {
            continue;
          }

          output[key] = scrubObject(nested);
        }

        return output;
      }

      return value;
    };

    if (req.body && typeof req.body === "object") {
      req.body = scrubObject(req.body);
    }

    if (req.query && typeof req.query === "object") {
      const sanitized = scrubObject(req.query) as Record<string, unknown>;
      Object.keys(req.query).forEach((key) => delete (req.query as Record<string, unknown>)[key]);
      Object.assign(req.query as Record<string, unknown>, sanitized);
    }

    if (req.params && typeof req.params === "object") {
      const sanitized = scrubObject(req.params) as Record<string, unknown>;
      Object.keys(req.params).forEach((key) => delete (req.params as Record<string, unknown>)[key]);
      Object.assign(req.params as Record<string, unknown>, sanitized);
    }

    next();
  } catch (error) {
    console.error("Error in sanitizeInput middleware - sanitization failed", error);
    res.status(500).json({
      error: "Request sanitization failed",
      message: "Unable to process request safely",
    });
  }
}

/**
 * Session security configuration
 */
export const sessionConfig = {
  cookie: {
    httpOnly: true, // Prevents client-side JS from reading the cookie
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "lax" as const, // CSRF protection
    maxAge: SESSION_MAX_AGE_MS,
  },
  rolling: true, // Reset maxAge on every request
  resave: false,
  saveUninitialized: false,
};

function getLoginLockoutKey(identifier: string): string {
  return `login-lockout:${identifier.toLowerCase()}`;
}

export async function trackLoginAttempt(identifier: string): Promise<boolean> {
  try {
    const counter = await incrementRateCounter(getLoginLockoutKey(identifier), ACCOUNT_LOCKOUT_DURATION_MS);
    return counter.hits < MAX_LOGIN_ATTEMPTS;
  } catch (error) {
    console.error("[Security] Failed to track login attempt", error);
    return true;
  }
}

export async function resetLoginAttempts(identifier: string): Promise<void> {
  try {
    await resetRateCounter(getLoginLockoutKey(identifier));
  } catch (error) {
    console.error("[Security] Failed to reset login attempts", error);
  }
}

export async function isAccountLocked(identifier: string): Promise<boolean> {
  try {
    const counter = await getRateCounter(getLoginLockoutKey(identifier));
    return counter.hits >= MAX_LOGIN_ATTEMPTS && counter.resetTimeMs > Date.now();
  } catch (error) {
    console.error("[Security] Failed to read account lock state", error);
    return false;
  }
}

// Clean up expired counters every hour
setInterval(() => {
  ensureRateLimitStorage()
    .then(() => pool.query(DELETE_EXPIRED_RATE_LIMIT_COUNTERS_SQL))
    .catch((error) => {
      console.error("[Security] Failed cleaning expired rate limit counters", error);
    });
}, 60 * 60 * 1000);
