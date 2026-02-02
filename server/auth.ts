import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail } from "./email";

const scryptAsync = promisify(scrypt);

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashedPassword, salt] = stored.split(".");
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

function isStrongPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters" };
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must include uppercase and lowercase letters" };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: "Password must include at least one number" };
  }
  return { valid: true };
}

function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

function createRateLimiter(windowMs: number, maxRequests: number) {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response): boolean => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const entry = attempts.get(key);
    if (entry && entry.resetAt > now) {
      if (entry.count >= maxRequests) {
        res.status(429).json({ error: "Too many requests. Please try again later." });
        return false;
      }
      entry.count += 1;
      attempts.set(key, entry);
      return true;
    }
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  };
}

export function setupAuth(app: Express) {
  const MemoryStoreSession = MemoryStore(session);
  const authLimiter = createRateLimiter(15 * 60 * 1000, 20);
  const passwordResetLimiter = createRateLimiter(15 * 60 * 1000, 10);

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "joblify-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStoreSession({
        checkPeriod: 86400000,
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      if (!authLimiter(req, res)) return;
      const { name, username, email, password, intro, skills } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Username is optional - we can generate from email if not provided
      const finalUsername = username || email.split('@')[0] + randomBytes(3).toString('hex');

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

      const existingUsername = await storage.getUserByUsername(finalUsername);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await hashPassword(password);
      const verificationToken = generateVerificationToken();
      
      const user = await storage.createUser({
        name,
        username: finalUsername,
        email,
        password: hashedPassword,
        verificationToken,
      });

      // If intro and skills are provided (from multi-step form), save them to profile
      if (intro || skills) {
        await storage.setProfile(user.id, {
          intro: intro || '',
          skills: skills || [],
          isComplete: !!(intro && skills && skills.length > 0),
        });
      }

      req.session.userId = user.id;

      // Send verification email
      const emailSent = await sendVerificationEmail(user.email, user.username, verificationToken);
      if (!emailSent) {
        console.error("Failed to send verification email.");
      }

      res.json({
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          emailVerified: user.emailVerified,
        },
        message: emailSent 
          ? "Account created. Please check your email to verify your account."
          : "Account created. Email verification is pending.",
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      if (!authLimiter(req, res)) return;
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await comparePasswords(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id;

      res.json({
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          emailVerified: user.emailVerified,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
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

      if (user.emailVerified) {
        return res.json({ message: "Email already verified" });
      }

      await storage.updateUser(user.id, {
        emailVerified: true,
        verificationToken: null,
      });

      await sendWelcomeEmail(user.email, user.username);

      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
    try {
      if (!authLimiter(req, res)) return;
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      if (user.emailVerified) {
        return res.json({ message: "Email already verified" });
      }

      const verificationToken = generateVerificationToken();
      await storage.updateUser(user.id, { verificationToken });

      await sendVerificationEmail(user.email, user.username, verificationToken);

      res.json({ message: "Verification email sent" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to resend verification email" });
    }
  });

  app.post("/api/auth/request-password-reset", async (req: Request, res: Response) => {
    try {
      if (!passwordResetLimiter(req, res)) return;
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (user) {
        const token = randomBytes(32).toString("hex");
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

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      if (!passwordResetLimiter(req, res)) return;
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

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
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
