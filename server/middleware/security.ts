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
 * 
 * Note: This provides basic XSS protection. For production use,
 * consider using a library like DOMPurify or validator.js for more
 * comprehensive sanitization, especially for user-generated content
 * that will be rendered as HTML.
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  try {
    // Basic XSS prevention - escape HTML special characters
    const sanitize = (obj: any): any => {
      if (typeof obj === "string") {
        // HTML escape special characters
        return obj
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#x27;")
          .replace(/\//g, "&#x2F;");
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

    // Sanitize body (writable property - direct assignment works)
    if (req.body) {
      req.body = sanitize(req.body);
    }
    
    // Sanitize query (may be read-only - mutate in place)
    if (req.query && typeof req.query === 'object') {
      const sanitized = sanitize(req.query);
      // Delete existing properties first to remove any unsanitized data
      Object.keys(req.query).forEach(key => delete (req.query as any)[key]);
      // Assign sanitized values
      Object.keys(sanitized).forEach(key => (req.query as any)[key] = sanitized[key]);
    }
    
    // Sanitize params (may be read-only - mutate in place)
    if (req.params && typeof req.params === 'object') {
      const sanitized = sanitize(req.params);
      // Delete existing properties first to remove any unsanitized data
      Object.keys(req.params).forEach(key => delete (req.params as any)[key]);
      // Assign sanitized values
      Object.keys(sanitized).forEach(key => (req.params as any)[key] = sanitized[key]);
    }

    next();
  } catch (error) {
    console.error('Error in sanitizeInput middleware - sanitization failed');
    // Return error response instead of continuing with potentially unsanitized data
    res.status(500).json({ 
      error: 'Request sanitization failed',
      message: 'Unable to process request safely'
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
