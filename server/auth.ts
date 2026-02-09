import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { expressjwt } from "express-jwt";
import jwksRsa from "jwks-rsa";
import { storage } from "./storage";
import { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail } from "./email";
import { 
  auth0Config, 
  validateAuth0Config, 
  getManagementClient, 
  getAuthenticationClient 
} from "./auth0-config";

const scryptAsync = promisify(scrypt);

// Check if Auth0 is configured
const isAuth0Enabled = validateAuth0Config();

declare module "express-session" {
  interface SessionData {
    userId?: string;
    auth0AccessToken?: string;
    auth0RefreshToken?: string;
    auth0IdToken?: string;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashedPassword, salt] = stored.split(".");
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

export function isStrongPassword(password: string): { valid: boolean; message?: string } {
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

// Auth0 helper functions
async function createAuth0User(email: string, password: string, name?: string, username?: string) {
  const management = getManagementClient();
  
  try {
    const auth0User = await management.users.create({
      email,
      password,
      name: name || email.split('@')[0],
      username: username || email.split('@')[0] + randomBytes(3).toString('hex'),
      connection: 'Username-Password-Authentication',
      email_verified: false,
      verify_email: true,
    });
    
    return auth0User;
  } catch (error: any) {
    console.error("[Auth0] User creation error:", error);
    throw new Error(error.message || "Failed to create Auth0 user");
  }
}

async function authenticateWithAuth0(username: string, password: string) {
  const authClient = getAuthenticationClient();
  
  try {
    const result = await authClient.oauth.passwordGrant({
      username,
      password,
      audience: auth0Config.audience,
      scope: 'openid profile email offline_access',
    });
    
    return result.data;
  } catch (error: any) {
    console.error("[Auth0] Authentication error:", error);
    throw new Error("Invalid credentials");
  }
}

async function syncAuth0UserToLocal(auth0User: any, intro?: string, skills?: any[]) {
  // Check if user exists in local DB by email
  let localUser = await storage.getUserByEmail(auth0User.email);
  
  if (!localUser) {
    // Create new local user
    const username = auth0User.username || auth0User.email.split('@')[0] + randomBytes(3).toString('hex');
    localUser = await storage.createUser({
      name: auth0User.name || auth0User.email.split('@')[0],
      username,
      email: auth0User.email,
      password: 'auth0', // Placeholder - not used with Auth0
      verificationToken: undefined,
      emailVerified: auth0User.email_verified || false,
    });
    
    // Set profile if provided
    if (intro || skills) {
      await storage.setProfile(localUser.id, {
        intro: intro || '',
        skills: skills || [],
        isComplete: !!(intro && skills && skills.length > 0),
      });
    }
  } else {
    // Update existing user with Auth0 data
    await storage.updateUser(localUser.id, {
      emailVerified: auth0User.email_verified || false,
      name: auth0User.name || localUser.name,
    });
  }
  
  return localUser;
}

async function requestAuth0PasswordReset(email: string) {
  const authClient = getAuthenticationClient();
  
  try {
    await authClient.database.changePassword({
      email,
      connection: 'Username-Password-Authentication',
    });
  } catch (error: any) {
    console.error("[Auth0] Password reset error:", error);
    // Don't throw - silently fail for security
  }
}

export function setupAuth(app: Express) {
  const MemoryStoreSession = MemoryStore(session);
  const authLimiter = createRateLimiter(15 * 60 * 1000, 20);
  const passwordResetLimiter = createRateLimiter(15 * 60 * 1000, 10);

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

  // Register endpoint - works with both Auth0 and legacy auth
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
      
      if (isAuth0Enabled) {
        // Create user in Auth0
        try {
          const auth0User = await createAuth0User(email, password, name, finalUsername);
          
          // Sync to local database
          user = await syncAuth0UserToLocal(auth0User, intro, skills);
          
          // Note: Auth0 sends verification email automatically
          const emailSent = true;
          
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
        } catch (error: any) {
          console.error("Auth0 registration error:", error);
          return res.status(500).json({ error: error.message || "Registration failed" });
        }
      } else {
        // Legacy authentication
        const hashedPassword = await hashPassword(password);
        const verificationToken = generateVerificationToken();
        
        user = await storage.createUser({
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
      }
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

      if (isAuth0Enabled) {
        // Authenticate with Auth0
        try {
          const tokens = await authenticateWithAuth0(username, password);
          
          // Get user info from Auth0 token
          // For now, we'll look up the user in our local DB
          const user = await storage.getUserByUsername(username);
          if (!user) {
            // Try by email
            const userByEmail = await storage.getUserByEmail(username);
            if (userByEmail) {
              // Store tokens in session
              req.session.userId = userByEmail.id;
              req.session.auth0AccessToken = tokens.access_token;
              req.session.auth0RefreshToken = tokens.refresh_token;
              req.session.auth0IdToken = tokens.id_token;
              
              return res.json({
                user: {
                  id: userByEmail.id,
                  name: userByEmail.name,
                  username: userByEmail.username,
                  email: userByEmail.email,
                  emailVerified: userByEmail.emailVerified,
                },
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                idToken: tokens.id_token,
              });
            }
            return res.status(401).json({ error: "Invalid credentials" });
          }
          
          // Store tokens in session
          req.session.userId = user.id;
          req.session.auth0AccessToken = tokens.access_token;
          req.session.auth0RefreshToken = tokens.refresh_token;
          req.session.auth0IdToken = tokens.id_token;

          res.json({
            user: {
              id: user.id,
              name: user.name,
              username: user.username,
              email: user.email,
              emailVerified: user.emailVerified,
            },
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            idToken: tokens.id_token,
          });
        } catch (error: any) {
          console.error("Auth0 login error:", error);
          return res.status(401).json({ error: "Invalid credentials" });
        }
      } else {
        // Legacy authentication
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
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    // Clear Auth0 tokens if present
    if (req.session.auth0AccessToken) {
      req.session.auth0AccessToken = undefined;
      req.session.auth0RefreshToken = undefined;
      req.session.auth0IdToken = undefined;
    }
    
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    // Check for JWT token in Authorization header (for Auth0)
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ') && isAuth0Enabled) {
      // JWT token authentication
      const token = authHeader.substring(7);
      
      // For now, we'll still use session-based lookup
      // In production, you'd validate the JWT and extract user info from it
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
    } else if (!req.session.userId) {
      // Session-based authentication
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

      if (isAuth0Enabled) {
        // Use Auth0 password reset
        await requestAuth0PasswordReset(email);
      } else {
        // Legacy password reset
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

  // Auth0 callback endpoint (for future OAuth flow support)
  app.get("/api/auth/callback", async (req: Request, res: Response) => {
    if (!isAuth0Enabled) {
      return res.status(404).json({ error: "Auth0 not configured" });
    }
    
    // This endpoint would be used if we implement OAuth flow in the future
    // For now, we're using Resource Owner Password Grant which doesn't need a callback
    res.redirect("/dashboard");
  });

  // Token refresh endpoint
  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    if (!isAuth0Enabled) {
      return res.status(404).json({ error: "Auth0 not configured" });
    }

    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    try {
      const authClient = getAuthenticationClient();
      const result = await authClient.oauth.refreshTokenGrant({
        refresh_token: refreshToken,
      });

      // Update session with new tokens
      if (req.session.userId) {
        req.session.auth0AccessToken = result.data.access_token;
        if (result.data.refresh_token) {
          req.session.auth0RefreshToken = result.data.refresh_token;
        }
        if (result.data.id_token) {
          req.session.auth0IdToken = result.data.id_token;
        }
      }

      res.json({
        accessToken: result.data.access_token,
        refreshToken: result.data.refresh_token,
        idToken: result.data.id_token,
      });
    } catch (error: any) {
      console.error("Token refresh error:", error);
      res.status(401).json({ error: "Failed to refresh token" });
    }
  });
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Check for Authorization header with Bearer token (Auth0 JWT)
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ') && isAuth0Enabled) {
    // For JWT authentication, we still rely on session for user ID
    // In production, you'd decode and validate the JWT here
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
  } else if (!req.session.userId) {
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
