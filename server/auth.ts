import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import { pool } from "./db";
import { storage } from "./storage";
import { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail } from "./email";
import { 
  hashPassword, 
  verifyPassword, 
  isStrongPassword,
  generateSecureToken,
  isArgon2Hash
} from "./lib/crypto";
import { authRateLimit, registrationRateLimit, trackLoginAttempt, resetLoginAttempts, isAccountLocked } from "./middleware/security";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    pending2FAUserId?: string; // User ID waiting for 2FA verification
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

const ACCOUNT_BLOCKED_MESSAGE = "This account has been blocked. Please contact support for assistance.";

// Export for use in other modules
export { hashPassword, verifyPassword, isStrongPassword, establishSession };

// Helper to establish session for a user
async function establishSession(req: Request, userId: string): Promise<void> {
  req.session.userId = userId;
  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => err ? reject(err) : resolve());
  });
}

// Helper to generate username from email
function generateUsername(email: string): string {
  return email.split('@')[0] + generateSecureToken(3).substring(0, 6);
}

// Password reset rate limiter
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per 15 minutes
  message: "Too many password reset requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export async function setupAuth(app: Express) {
  if (process.env.NODE_ENV === "production") {
    try {
      // Ensure session table exists in production
      // We use a separate query to avoid issues with schema synchronization tools
      // that might try to drop the table if they don't see it in the ORM schema.
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL,
          CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
        );
        CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
      `);
      console.log('[Auth] Session table verified');
    } catch (err) {
      console.error('[Auth] Failed to ensure session table exists:', err);
    }
  }

  const sessionStore = process.env.NODE_ENV === "production"
    ? new (connectPgSimple(session))({
        pool: pool,
        tableName: "session",
        createTableIfMissing: false,
      })
    : new (MemoryStore(session))({
        checkPeriod: 86400000,
      });

  // Require SESSION_SECRET in production
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in production");
  }

  // Session middleware
  const isProduction = process.env.NODE_ENV === "production";
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "joblify-dev-secret-key-insecure",
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      proxy: isProduction,
      cookie: {
        secure: isProduction,
        sameSite: isProduction ? "lax" : "lax",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  // Register endpoint - session-based authentication with rate limiting
  app.post("/api/auth/register", registrationRateLimit, async (req: Request, res: Response) => {
    try {
      const { name, username, email, password, intro, skills, phone, linkedin, website } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Username is optional - we can generate from email if not provided
      const finalUsername = username || generateUsername(email);

      if (finalUsername.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Please enter a valid email address" });
      }

      const passwordCheck = isStrongPassword(password);
      if (!passwordCheck.valid) {
        return res.status(400).json({ error: passwordCheck.message });
      }

      // Check for existing user
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }
      
      const existingUsername = await storage.getUserByUsername(finalUsername);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      // Check if email is in deleted accounts tracker (abuse prevention)
      const deletedCheck = await storage.checkDeletedAccount(email);
      if (deletedCheck.isBlocked) {
        const hoursRemaining = Math.ceil(
          (deletedCheck.expiresAt!.getTime() - Date.now()) / (1000 * 60 * 60)
        );
        return res.status(403).json({
          error: "Account Registration Temporarily Restricted",
          message: `This email was recently used for an account that was deleted. For security reasons, you cannot create a new account with this email for 72 hours. Time remaining: ${hoursRemaining} hours. If you believe this is an error, please contact support@joblifyai.com`,
        });
      }

      let user;
      
      // Create user with Argon2 password hashing
      const hashedPassword = await hashPassword(password);
      const verificationToken = generateSecureToken(32);
      
      user = await storage.createUser({
        name,
        username: finalUsername,
        email,
        password: hashedPassword,
        verificationToken,
        profileSetupComplete: true,
      });

      // Profile will be set up later in account settings, not during registration
      req.session.userId = user.id;

      // Create initial resume with quick data if provided
      if (phone || linkedin || website) {
        const { resumes } = await import("../shared/schema");
        const { createEmptyResumeData } = await import("../shared/schema");
        const { db } = await import("./db");
        
        const resumeData = createEmptyResumeData();
        resumeData.personalInfo.name = name || user.username;
        resumeData.personalInfo.email = email;
        if (phone) resumeData.personalInfo.phone = phone;
        if (linkedin) resumeData.personalInfo.linkedin = linkedin;
        if (website) resumeData.personalInfo.website = website;
        
        await db.insert(resumes).values({
          userId: user.id,
          title: "My Resume",
          template: "modern",
          resumeData,
        });
      }

      // Initialize email engagement system (welcome email + feature reminders)
      const { initializeEmailEngagement } = await import("./email-engagement");
      initializeEmailEngagement(user.id).catch(() => {
        console.error('[AUTH] Email engagement initialization failed');
      });

      // Add user to Brevo contact list on signup
      const brevoListId = process.env.BREVO_SIGNUP_LIST_ID;
      if (brevoListId) {
        const parsedListId = parseInt(brevoListId, 10);
        if (!isNaN(parsedListId)) {
          const { addContactToBrevoList } = await import("./brevo");
          addContactToBrevoList(user.email, parsedListId, {
            FIRSTNAME: user.name || user.username,
          }).catch(() => {
            console.error('[AUTH] Brevo list addition failed');
          });
        }
      }

      // Send verification email
      const emailSent = await sendVerificationEmail(user.email, user.username, verificationToken);

      res.json({
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          emailVerified: user.emailVerified,
          authProvider: user.authProvider,
          profileSetupComplete: true,
        },
        message: emailSent 
          ? "Account created. Please check your email to verify your account."
          : "Account created. Email verification is pending.",
      });
    } catch (error) {
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Login endpoint with enhanced security
  app.post("/api/auth/login", authRateLimit, async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      // Check if account is locked due to failed attempts
      if (await isAccountLocked(username)) {
        return res.status(429).json({ 
          error: "Account temporarily locked due to multiple failed login attempts. Please try again in 15 minutes." 
        });
      }

      // Use session-based authentication
      const user = await storage.getUserByUsername(username);
      if (!user) {
        await trackLoginAttempt(username);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.accountBlocked) {
        return res.status(403).json({
          error: "Account access blocked",
          message: ACCOUNT_BLOCKED_MESSAGE,
        });
      }

      const isValid = await verifyPassword(user.password, password);
      if (!isValid) {
        await trackLoginAttempt(username);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Successful login - reset attempts
      await resetLoginAttempts(username);

      // Auto-upgrade password hash if using legacy scrypt
      if (!isArgon2Hash(user.password)) {
        const newHash = await hashPassword(password);
        await storage.updateUser(user.id, { password: newHash });
      }

      // Check if user has 2FA enabled
      if (user.twoFactorEnabled) {
        // Generate and send 2FA code via email
        const { generate2FACode, get2FACodeExpiry } = await import("./lib/email2fa");
        const { send2FAEmail } = await import("./email");
        
        const code = generate2FACode();
        const expiresAt = get2FACodeExpiry();
        
        // Store verification code in database
        await storage.createVerificationCode({
          userId: user.id,
          code,
          codeType: 'email_2fa',
          expiresAt,
        });
        
        // Send email with 2FA code
        const emailSent = await send2FAEmail(user.email, user.username, code);
        
        if (!emailSent) {
          return res.status(500).json({ 
            error: "Failed to send verification code. Please try again or contact support." 
          });
        }
        
        // Store pending 2FA user ID in session
        req.session.pending2FAUserId = user.id;
        
        return res.json({
          requires2FA: true,
          message: "Please check your email for the verification code",
        });
      }

      // If 2FA not enabled, complete login
      req.session.userId = user.id;

      res.json({
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          emailVerified: user.emailVerified,
          isAdmin: user.isAdmin,
          authProvider: user.authProvider,
          profileSetupComplete: user.profileSetupComplete,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Verify 2FA code endpoint
  app.post("/api/auth/verify-2fa", authRateLimit, async (req: Request, res: Response) => {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Verification code is required" });
      }

      // Check if there's a pending 2FA user
      if (!req.session.pending2FAUserId) {
        return res.status(400).json({ error: "No pending 2FA verification" });
      }

      const userId = req.session.pending2FAUserId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get the most recent unused email_2fa code for this user
      const verificationCode = await storage.getLatestVerificationCode(userId, 'email_2fa');
      
      if (!verificationCode) {
        return res.status(400).json({ error: "No verification code found. Please request a new code." });
      }

      // Check if code is expired
      const { is2FACodeExpired } = await import("./lib/email2fa");
      if (is2FACodeExpired(verificationCode.expiresAt)) {
        return res.status(400).json({ error: "Verification code has expired. Please request a new code." });
      }

      // Verify the code
      const { verify2FACode } = await import("./lib/email2fa");
      if (!verify2FACode(code, verificationCode.code)) {
        return res.status(401).json({ error: "Invalid verification code" });
      }

      // Mark code as used
      await storage.markVerificationCodeAsUsed(verificationCode.id);

      // Complete the login
      req.session.userId = userId;
      delete req.session.pending2FAUserId;

      res.json({
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          emailVerified: user.emailVerified,
          isAdmin: user.isAdmin,
          authProvider: user.authProvider,
          profileSetupComplete: user.profileSetupComplete,
        },
      });
    } catch (error) {
      console.error("2FA verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified,
        isAdmin: user.isAdmin,
        authProvider: user.authProvider,
        profileSetupComplete: user.profileSetupComplete,
      },
    });
  });

  app.get("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Invalid verification token" });
      }

      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired verification token" });
      }

      // If already verified, return success to avoid confusion
      if (user.emailVerified) {
        // Still establish session if not already logged in
        if (!req.session.userId) {
          await establishSession(req, user.id);
        }
        return res.json({ message: "Email verified successfully", alreadyVerified: true });
      }

      await storage.updateUser(user.id, {
        emailVerified: true,
        verificationToken: null,
      });

      // Establish session for the user (auto-login after verification)
      await establishSession(req, user.id);

      await sendWelcomeEmail(user.email, user.username);

      return res.json({ message: "Email verified successfully", alreadyVerified: false });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/auth/resend-verification", authRateLimit, async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Session expired. Please log in again to resend verification email." });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      if (user.emailVerified) {
        return res.json({ message: "Email already verified" });
      }

      const verificationToken = generateSecureToken(32);
      await storage.updateUser(user.id, { verificationToken });

      await sendVerificationEmail(user.email, user.username, verificationToken);

      res.json({ message: "Verification email" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to resend verification email" });
    }
  });

  app.post("/api/auth/request-password-reset", passwordResetLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }

      // Session-based password reset
      const user = await storage.getUserByEmail(email);
      if (user) {
        const token = generateSecureToken(32);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await storage.updateUser(user.id, {
          passwordResetToken: token,
          passwordResetExpiresAt: expiresAt,
        });
        await sendPasswordResetEmail(user.email, user.username, token);
      }

      res.json({ message: "If that email exists, a reset link has been sent." });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ error: "Failed to request password reset" });
    }
  });

  app.post("/api/auth/reset-password", passwordResetLimiter, async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;

      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Invalid reset token" });
      }

      const passwordCheck = isStrongPassword(password || "");
      if (!passwordCheck.valid) {
        return res.status(400).json({ error: passwordCheck.message });
      }

      const user = await storage.getUserByPasswordResetToken(token);
      if (!user || !user.passwordResetExpiresAt) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      if (new Date(user.passwordResetExpiresAt).getTime() < Date.now()) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      const hashedPassword = await hashPassword(password);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  if (user.accountBlocked) {
    return res.status(403).json({
      error: "Account access blocked",
      message: ACCOUNT_BLOCKED_MESSAGE,
    });
  }

  next();
}

export async function requireVerifiedEmail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }
  
  if (!user.emailVerified) {
    return res.status(403).json({ 
      error: "Email verification required", 
      code: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email address to access this feature."
    });
  }
  
  next();
}
