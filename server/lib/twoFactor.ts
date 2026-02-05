import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.TWO_FACTOR_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('TWO_FACTOR_ENCRYPTION_KEY environment variable is required in production');
  }
  console.warn('[2FA] WARNING: TWO_FACTOR_ENCRYPTION_KEY not set. Using temporary key for development only.');
}

const ENCRYPTION_KEY_BUFFER = Buffer.from((ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')).slice(0, 32));
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt sensitive data
 */
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY_BUFFER, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt sensitive data
 */
function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY_BUFFER, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

/**
 * Generate a new 2FA secret for a user
 */
export function generate2FASecret(userEmail: string): {
  secret: string;
  encryptedSecret: string;
  otpauthUrl: string;
} {
  const secret = speakeasy.generateSecret({
    name: `Joblify (${userEmail})`,
    issuer: 'Joblify',
    length: 32,
  });

  return {
    secret: secret.base32,
    encryptedSecret: encrypt(secret.base32),
    otpauthUrl: secret.otpauth_url || '',
  };
}

/**
 * Generate QR code data URL from otpauth URL
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(otpauthUrl);
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verify a TOTP token
 */
export function verify2FAToken(
  encryptedSecret: string,
  token: string,
  window: number = 1
): boolean {
  try {
    const secret = decrypt(encryptedSecret);
    
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window, // Allow tokens from 1 time step before and after
    });
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    return false;
  }
}

/**
 * Generate backup codes for account recovery
 */
export function generateBackupCodes(count: number = 10): {
  codes: string[];
  encryptedCodes: string[];
} {
  const codes: string[] = [];
  const encryptedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
    encryptedCodes.push(encrypt(code));
  }

  return { codes, encryptedCodes };
}

/**
 * Verify a backup code
 */
export function verifyBackupCode(
  encryptedCodes: string[],
  code: string
): { valid: boolean; remainingCodes: string[] } {
  const normalizedCode = code.replace(/[\s-]/g, '').toUpperCase();
  
  for (let i = 0; i < encryptedCodes.length; i++) {
    try {
      const decryptedCode = decrypt(encryptedCodes[i]);
      if (decryptedCode === normalizedCode) {
        // Remove used code
        const remainingCodes = [
          ...encryptedCodes.slice(0, i),
          ...encryptedCodes.slice(i + 1)
        ];
        return { valid: true, remainingCodes };
      }
    } catch (error) {
      // Continue checking other codes
      continue;
    }
  }

  return { valid: false, remainingCodes: encryptedCodes };
}

/**
 * Format backup codes for display (group in pairs)
 */
export function formatBackupCode(code: string): string {
  return code.match(/.{1,4}/g)?.join('-') || code;
}

/**
 * Check if 2FA setup is complete
 */
export function is2FAComplete(user: {
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  backupCodes: unknown;
}): boolean {
  return (
    user.twoFactorEnabled &&
    !!user.twoFactorSecret &&
    Array.isArray(user.backupCodes) &&
    user.backupCodes.length > 0
  );
}
