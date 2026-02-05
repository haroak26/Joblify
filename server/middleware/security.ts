import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { normalizePlan } from "@shared/schema";

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

  return rateLimit({
    windowMs,
    max: (req) => {
      // Get user plan from session
      const user = (req as any).user;
      if (!user) return freeLimit;

      const plan = normalizePlan(user.plan || "free");
      
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
    standardHeaders: true,
    legacyHeaders: false,
    // Use higher limits in development but don't skip entirely
    skip: (req) => false,
  });
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
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: "Too many login attempts. Please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Registration rate limiter (prevents spam)
 */
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: "Too many accounts created. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Input sanitization middleware
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Basic XSS prevention - strip HTML tags from string inputs
  const sanitize = (obj: any): any => {
    if (typeof obj === "string") {
      // Remove script tags and on* event handlers
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
        .replace(/on\w+\s*=\s*[^\s>]*/gi, "");
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === "object") {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
}

/**
 * Session security configuration
 */
export const sessionConfig = {
  cookie: {
    httpOnly: true, // Prevents client-side JS from reading the cookie
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "lax" as const, // CSRF protection
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  rolling: true, // Reset maxAge on every request
  resave: false,
  saveUninitialized: false,
};

/**
 * Account lockout tracking
 * 
 * NOTE: This uses an in-memory Map which means:
 * 1. Data is lost on server restart
 * 2. Won't work correctly in multi-server deployments
 * 
 * For production multi-server deployments, consider:
 * - Using Redis for distributed state
 * - Using the security_events table
 * - Implementing a distributed cache
 */
const loginAttempts = new Map<string, { count: number; lockUntil?: number }>();

export function trackLoginAttempt(identifier: string): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(identifier);

  // Check if locked
  if (attempt?.lockUntil && attempt.lockUntil > now) {
    return false; // Still locked
  }

  // Reset if lock expired
  if (attempt?.lockUntil && attempt.lockUntil <= now) {
    loginAttempts.delete(identifier);
    return true;
  }

  // Increment attempts
  const newCount = (attempt?.count || 0) + 1;
  
  // Lock after 5 failed attempts
  if (newCount >= 5) {
    loginAttempts.set(identifier, {
      count: newCount,
      lockUntil: now + 15 * 60 * 1000, // Lock for 15 minutes
    });
    return false;
  }

  loginAttempts.set(identifier, { count: newCount });
  return true;
}

export function resetLoginAttempts(identifier: string) {
  loginAttempts.delete(identifier);
}

export function isAccountLocked(identifier: string): boolean {
  const attempt = loginAttempts.get(identifier);
  if (!attempt?.lockUntil) return false;
  
  const now = Date.now();
  if (attempt.lockUntil > now) return true;
  
  // Lock expired, clean up
  loginAttempts.delete(identifier);
  return false;
}

// Clean up expired locks every hour
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(loginAttempts.entries());
  for (const [key, value] of entries) {
    if (value.lockUntil && value.lockUntil <= now) {
      loginAttempts.delete(key);
    }
  }
}, 60 * 60 * 1000);
