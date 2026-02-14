import crypto from "crypto";

/**
 * Generate a 6-digit verification code for email-based 2FA
 */
export function generate2FACode(): string {
  // Generate a random 6-digit code
  const code = crypto.randomInt(100000, 999999).toString();
  return code;
}

/**
 * Verify a 2FA code matches the expected code
 */
export function verify2FACode(providedCode: string, expectedCode: string): boolean {
  // Remove any spaces or formatting
  const normalizedProvided = providedCode.replace(/\s+/g, '');
  const normalizedExpected = expectedCode.replace(/\s+/g, '');
  
  // Check if lengths match before constant-time comparison
  if (normalizedProvided.length !== normalizedExpected.length) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(normalizedProvided),
    Buffer.from(normalizedExpected)
  );
}

/**
 * Calculate expiration time for 2FA code (5 minutes from now)
 */
export function get2FACodeExpiry(): Date {
  const now = new Date();
  return new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
}

/**
 * Check if a 2FA code has expired
 */
export function is2FACodeExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
