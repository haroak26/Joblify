/**
 * Modern CSRF Protection Middleware
 * 
 * Implements the Double Submit Cookie pattern for CSRF protection.
 * This is more modern and secure than the deprecated csurf package.
 * 
 * How it works:
 * 1. Server generates a random CSRF token and stores it in a cookie
 * 2. Client must include this token in a custom header for state-changing requests
 * 3. Server verifies the header matches the cookie
 */

import { randomBytes } from "crypto";
import type { Request, Response, NextFunction } from "express";

// Constants
const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = "_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Generate a random CSRF token
 */
function generateToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

/**
 * Middleware to set CSRF token in cookie for GET requests
 */
export function csrfSetToken(req: Request, res: Response, next: NextFunction) {
  // Only set token for GET requests (reading operations)
  if (req.method !== "GET") {
    return next();
  }

  // Check if token already exists
  let token = req.cookies[CSRF_COOKIE_NAME];
  
  if (!token) {
    // Generate new token
    token = generateToken();
    res.cookie(CSRF_COOKIE_NAME, token, CSRF_COOKIE_OPTIONS);
  }

  // Make token available to templates/responses if needed
  res.locals.csrfToken = token;
  
  next();
}

/**
 * Middleware to verify CSRF token for state-changing requests
 */
export function csrfVerifyToken(req: Request, res: Response, next: NextFunction) {
  // Only verify for state-changing methods
  const methodsToProtect = ["POST", "PUT", "DELETE", "PATCH"];
  if (!methodsToProtect.includes(req.method)) {
    return next();
  }

  // Skip CSRF check for Stripe webhook endpoints (they are authenticated via signature verification)
  const normalizedPath = (req.originalUrl || req.path).split("?")[0].replace(/\/+$/, "") || "/";
  const webhookPaths = new Set([
    "/api/webhooks/stripe",
    "/webhooks/stripe",
    "/api/stripe/webhook",
    "/api/stripe-webhook",
    "/api/stripe/events",
    "/stripe/webhook",
    "/api/webhook/stripe",
    "/webhook/stripe",
  ]);

  if (webhookPaths.has(normalizedPath) || normalizedPath.endsWith("/webhook")) {
    return next();
  }

  const hasStripeSignatureHeader = typeof req.headers["stripe-signature"] === "string";
  const userAgent = (req.headers["user-agent"] || "").toString().toLowerCase();
  const isStripeUserAgent = userAgent.includes("stripe");
  const looksLikeStripeWebhookPath =
    normalizedPath.includes("stripe") &&
    (normalizedPath.includes("webhook") || normalizedPath.includes("event"));

  // Fallback: allow Stripe webhook requests when proxies or API gateways rewrite path prefixes.
  // Signature verification is still strictly enforced in the webhook route itself.
  if (hasStripeSignatureHeader && (looksLikeStripeWebhookPath || isStripeUserAgent)) {
    return next();
  }

  // Get token from cookie and header
  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  // Verify both tokens exist and match
  if (!cookieToken || !headerToken) {
    return res.status(403).json({ 
      error: "CSRF token missing",
      message: "This request requires CSRF protection. Please refresh the page and try again."
    });
  }

  if (cookieToken !== headerToken) {
    return res.status(403).json({ 
      error: "CSRF token mismatch",
      message: "Invalid CSRF token. Please refresh the page and try again."
    });
  }

  next();
}

/**
 * Combined CSRF middleware for convenience
 * Use this if you want both set and verify in one middleware
 */
export function csrf(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET") {
    csrfSetToken(req, res, next);
  } else {
    csrfVerifyToken(req, res, next);
  }
}

/**
 * Get the CSRF token name for use in client-side code
 */
export function getCsrfTokenName(): string {
  return CSRF_COOKIE_NAME;
}

/**
 * Get the CSRF header name for use in client-side code
 */
export function getCsrfHeaderName(): string {
  return CSRF_HEADER_NAME;
}

/**
 * Endpoint handler to explicitly get/refresh CSRF token
 * This ensures token is always available when needed
 */
export function csrfTokenEndpoint(req: Request, res: Response) {
  // Get existing token or generate new one
  let token = req.cookies[CSRF_COOKIE_NAME];
  
  if (!token) {
    token = generateToken();
    res.cookie(CSRF_COOKIE_NAME, token, CSRF_COOKIE_OPTIONS);
  }
  
  res.json({ csrfToken: token });
}
