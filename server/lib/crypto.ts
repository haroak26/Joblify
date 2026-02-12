/**
 * Cryptographic utilities for Joblify
 * 
 * This module provides:
 * - Argon2 password hashing (military-grade security)
 * - AES-256 encryption for sensitive data
 * - Secure token generation
 */

import argon2 from "argon2";
import { createCipheriv, createDecipheriv, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Argon2 configuration for maximum security
const ARGON2_OPTIONS = {
  type: argon2.argon2id, // Recommended by OWASP
  memoryCost: 65536, // 64 MB (high cost for security)
  timeCost: 3, // Number of iterations
  parallelism: 4, // Number of threads
};

/**
 * Hash a password using Argon2id (OWASP recommended)
 * This is significantly more secure than bcrypt or scrypt
 */
export async function hashPasswordArgon2(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a password against an Argon2 hash
 */
export async function verifyPasswordArgon2(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    // Invalid hash format
    return false;
  }
}

/**
 * Legacy scrypt password hashing (for backward compatibility)
 * DO NOT USE for new passwords - use Argon2 instead
 */
export async function hashPasswordScrypt(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Legacy scrypt password verification (for backward compatibility)
 */
export async function verifyPasswordScrypt(stored: string, supplied: string): Promise<boolean> {
  try {
    const [hashedPassword, salt] = stored.split(".");
    if (!hashedPassword || !salt) return false;
    
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  } catch (error) {
    return false;
  }
}

/**
 * Check if a hash is Argon2 format
 */
export function isArgon2Hash(hash: string): boolean {
  return hash.startsWith("$argon2");
}

/**
 * Unified password hashing that auto-upgrades from scrypt to Argon2
 */
export async function hashPassword(password: string): Promise<string> {
  return hashPasswordArgon2(password);
}

/**
 * Unified password verification with auto-detection of hash type
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  if (isArgon2Hash(hash)) {
    return verifyPasswordArgon2(hash, password);
  } else {
    // Legacy scrypt hash
    return verifyPasswordScrypt(hash, password);
  }
}

/**
 * AES-256-GCM encryption for sensitive data at rest
 * Uses environment variable for encryption key
 */
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Derive encryption key from password/secret using PBKDF2
 */
async function deriveKey(secret: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(secret, salt, 32)) as Buffer;
}

/**
 * Get encryption key from environment or generate a random one
 * WARNING: In production, ALWAYS set ENCRYPTION_KEY env variable
 */
function getEncryptionSecret(): string {
  const secret = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!secret) {
    console.error("[SECURITY] CRITICAL: No ENCRYPTION_KEY or SESSION_SECRET found in environment!");
    console.error("[SECURITY] Encryption will use a temporary key that changes on restart!");
    // In development, generate a temporary key (NOT FOR PRODUCTION!)
    return randomBytes(32).toString("hex");
  }
  return secret;
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * Returns: salt.iv.authTag.encrypted (base64 encoded)
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    const salt = randomBytes(SALT_LENGTH);
    const key = await deriveKey(getEncryptionSecret(), salt);
    const iv = randomBytes(IV_LENGTH);
    
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");
    
    const authTag = cipher.getAuthTag();
    
    // Combine: salt.iv.authTag.encrypted
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, "base64"),
    ]);
    
    return combined.toString("base64");
  } catch (error) {
    console.error("[SECURITY] Encryption failed:", error);
    throw new Error("Encryption failed");
  }
}

/**
 * Decrypt data encrypted with encrypt()
 */
export async function decrypt(ciphertext: string): Promise<string> {
  try {
    const combined = Buffer.from(ciphertext, "base64");
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    
    const key = await deriveKey(getEncryptionSecret(), salt);
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted.toString("base64"), "base64", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("[SECURITY] Decryption failed:", error);
    throw new Error("Decryption failed");
  }
}

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(bytes: number = 32): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * Generate a random verification code (6 digits)
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Validate password strength
 */
export function isStrongPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must include at least one lowercase letter" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must include at least one uppercase letter" };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: "Password must include at least one number" };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: "Password must include at least one special character" };
  }
  return { valid: true };
}
