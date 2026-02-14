import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import rateLimit from "express-rate-limit";
import { WorkOS } from "@workos-inc/node";
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

// Initialize WorkOS client
const workos = new WorkOS(process.env.WORKOS_API_KEY || "");
const workosClientId = process.env.WORKOS_CLIENT_ID || "";

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

// Export for use in other modules
// Export for use in other modules
export { hashPassword, verifyPassword, isStrongPassword };

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

export function setupAuth(app: Express) {
  const MemoryStoreSession = MemoryStore(session);

  // Session middleware (still needed for backwards compatibility and token storage)
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

  // Register endpoint - session-based authentication with rate limiting
  app.post("/api/auth/register", registrationRateLimit, async (req: Request, res: Response) => {
    try {
      const { name, username, email, password, intro, skills } = req.body;

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

      // Initialize email engagement system (welcome email + feature reminders)
      const { initializeEmailEngagement } = await import("./email-engagement");
      initializeEmailEngagement(user.id).catch(err => {
        console.error("Failed to initialize email engagement:", err);
      });

      // Add user to Brevo contact list on signup
      const brevoListId = process.env.BREVO_SIGNUP_LIST_ID;
      if (brevoListId) {
        const parsedListId = parseInt(brevoListId, 10);
        if (!isNaN(parsedListId)) {
          const { addContactToBrevoList } = await import("./brevo");
          addContactToBrevoList(user.email, parsedListId, {
            FIRSTNAME: user.name || user.username,
          }).catch(err => {
            console.error("Failed to add contact to Brevo list:", err);
          });
        }
      }

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
          authProvider: user.authProvider,
          profileSetupComplete: true,
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

  // Login endpoint with enhanced security
  app.post("/api/auth/login", authRateLimit, async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      // Check if account is locked due to failed attempts
      if (isAccountLocked(username)) {
        return res.status(429).json({ 
          error: "Account temporarily locked due to multiple failed login attempts. Please try again in 15 minutes." 
        });
      }

      // Use session-based authentication
      const user = await storage.getUserByUsername(username);
      if (!user) {
        trackLoginAttempt(username);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await verifyPassword(user.password, password);
      if (!isValid) {
        trackLoginAttempt(username);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Successful login - reset attempts
      resetLoginAttempts(username);

      // Auto-upgrade password hash if using legacy scrypt
      if (!isArgon2Hash(user.password)) {
        console.log(`[AUTH] Auto-upgrading password hash for user ${user.id}`);
        const newHash = await hashPassword(password);
        await storage.updateUser(user.id, { password: newHash });
      }

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

  // WorkOS AuthKit: Initiate OAuth flow
  app.get("/api/auth/sso/:provider", async (req: Request, res: Response) => {
    try {
      const provider = String(req.params.provider);
      const validProviders = ["GoogleOAuth", "LinkedInOAuth", "GitHubOAuth", "AppleOAuth"];
      
      if (!validProviders.includes(provider)) {
        return res.status(400).json({ error: "Unsupported provider" });
      }

      if (!workosClientId) {
        return res.status(500).json({ error: "OAuth is not configured" });
      }

      type OAuthProvider = "GoogleOAuth" | "LinkedInOAuth" | "GitHubOAuth" | "AppleOAuth";

      const authorizationUrl = workos.userManagement.getAuthorizationUrl({
        provider: provider as OAuthProvider,
        clientId: workosClientId,
        redirectUri: `${process.env.APP_URL || "http://localhost:5000"}/api/auth/callback`,
      });

      res.json({ url: authorizationUrl });
    } catch (error) {
      console.error("SSO initiation error:", error);
      res.status(500).json({ error: "Failed to initiate authentication" });
    }
  });

  // WorkOS AuthKit: OAuth callback
  app.get("/api/auth/callback", async (req: Request, res: Response) => {
    try {
      const { code } = req.query;

      if (!code || typeof code !== "string") {
        return res.redirect("/login?error=invalid_callback");
      }

      const { user: workosUser } = await workos.userManagement.authenticateWithCode({
        code,
        clientId: workosClientId,
      });

      const providerEmail = workosUser.email;
      const providerName = [workosUser.firstName, workosUser.lastName].filter(Boolean).join(" ") || null;
      const providerId = workosUser.id;

      // Check if user already exists with this provider account
      let user = await storage.getUserByAuthProvider("workos", providerId);

      if (user) {
        // Existing provider user - log them in
        req.session.userId = user.id;
        if (!user.profileSetupComplete) {
          return res.redirect("/auth/setup-profile");
        }
        return res.redirect("/dashboard");
      }

      // Check if email already exists (registered via email/password)
      const existingEmailUser = await storage.getUserByEmail(providerEmail);
      if (existingEmailUser) {
        // Email already registered through email/password
        return res.redirect("/login?error=email_exists");
      }

      // Create new user from provider with initial username (user will set their own in profile setup)
      const initialUsername = `user_${generateSecureToken(4)}`;
      user = await storage.createUser({
        name: providerName || undefined,
        username: initialUsername,
        email: providerEmail,
        password: "",
        authProvider: "workos",
        authProviderId: providerId,
        emailVerified: true,
        profileSetupComplete: false,
      });

      // Initialize email engagement system
      const { initializeEmailEngagement } = await import("./email-engagement");
      initializeEmailEngagement(user.id).catch(err => {
        console.error("Failed to initialize email engagement:", err);
      });

      // Add user to Brevo contact list on signup
      const brevoListId = process.env.BREVO_SIGNUP_LIST_ID;
      if (brevoListId) {
        const parsedListId = parseInt(brevoListId, 10);
        if (!isNaN(parsedListId)) {
          const { addContactToBrevoList } = await import("./brevo");
          addContactToBrevoList(user.email, parsedListId, {
            FIRSTNAME: user.name || user.username,
          }).catch(err => {
            console.error("Failed to add contact to Brevo list:", err);
          });
        }
      }

      req.session.userId = user.id;
      return res.redirect("/auth/setup-profile");
    } catch (error) {
      console.error("OAuth callback error:", error);
      return res.redirect("/login?error=auth_failed");
    }
  });

  // Provider profile setup - set name and username after OAuth signup
  app.post("/api/auth/setup-profile", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { name, username } = req.body;

      if (!name || name.length < 2) {
        return res.status(400).json({ error: "Name must be at least 2 characters" });
      }

      if (!username || username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: "Username must be between 3 and 20 characters" });
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return res.status(400).json({ error: "Username can only contain letters, numbers, hyphens, and underscores" });
      }

      // Check username availability
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername && existingUsername.id !== req.session.userId) {
        return res.status(400).json({ error: "Username already taken" });
      }

      const user = await storage.updateUser(req.session.userId, {
        name,
        username,
        profileSetupComplete: true,
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Send welcome email
      await sendWelcomeEmail(user.email, user.username);

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
      console.error("Profile setup error:", error);
      res.status(500).json({ error: "Failed to set up profile" });
    }
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
        return res.json({ message: "Email verified successfully", alreadyVerified: true });
      }

      await storage.updateUser(user.id, {
        emailVerified: true,
        verificationToken: null,
      });

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
