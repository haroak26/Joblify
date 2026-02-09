import type { Express, Request, Response } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";
import AppleStrategy = require("passport-apple");
import { storage } from "./storage";
import { randomBytes } from "crypto";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

interface OAuthProfile {
  provider: "google" | "apple";
  providerId: string;
  email: string;
  name?: string;
  emailVerified: boolean;
}

function extractGoogleProfile(profile: GoogleProfile): OAuthProfile {
  const email = profile.emails?.[0]?.value;
  if (!email) {
    throw new Error("No email found in Google profile");
  }
  
  return {
    provider: "google",
    providerId: profile.id,
    email,
    name: profile.displayName,
    emailVerified: profile.emails?.[0]?.verified || false,
  };
}

function extractAppleProfile(profile: AppleStrategy.Profile, idToken?: string): OAuthProfile {
  const email = profile.email;
  if (!email) {
    throw new Error("No email found in Apple profile");
  }
  
  return {
    provider: "apple",
    providerId: profile.id || profile.sub,
    email,
    name: profile.name?.firstName && profile.name?.lastName 
      ? `${profile.name.firstName} ${profile.name.lastName}`
      : undefined,
    emailVerified: true, // Apple emails are always verified
  };
}

async function findOrCreateOAuthUser(profile: OAuthProfile) {
  // Try to find user by OAuth provider ID
  const existingUser = await storage.getUserByOAuthProvider(profile.provider, profile.providerId);
  if (existingUser) {
    return existingUser;
  }

  // Try to find user by email
  const userByEmail = await storage.getUserByEmail(profile.email);
  if (userByEmail) {
    // Link OAuth provider to existing account
    await storage.updateUser(userByEmail.id, {
      oauthProvider: profile.provider,
      oauthProviderId: profile.providerId,
      emailVerified: profile.emailVerified || userByEmail.emailVerified,
    });
    return storage.getUser(userByEmail.id);
  }

  // Create new user
  const username = profile.email.split('@')[0] + randomBytes(3).toString('hex');
  const user = await storage.createUser({
    name: profile.name,
    username,
    email: profile.email,
    password: null, // OAuth users don't have passwords
    oauthProvider: profile.provider,
    oauthProviderId: profile.providerId,
    emailVerified: profile.emailVerified,
  });

  return user;
}

export function setupOAuth(app: Express) {
  const baseUrl = process.env.BASE_URL || "http://localhost:5000";
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${baseUrl}/api/auth/google/callback`,
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const oauthProfile = extractGoogleProfile(profile);
            const user = await findOrCreateOAuthUser(oauthProfile);
            done(null, user);
          } catch (error) {
            done(error);
          }
        }
      )
    );

    // Google OAuth routes
    app.get("/api/auth/google", passport.authenticate("google", {
      scope: ["profile", "email"],
    }));

    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/login?error=oauth_failed" }),
      (req: Request, res: Response) => {
        if (req.user) {
          req.session.userId = (req.user as any).id;
          res.redirect("/dashboard");
        } else {
          res.redirect("/login?error=oauth_failed");
        }
      }
    );
  }

  // Apple OAuth Strategy
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    passport.use(
      new AppleStrategy(
        {
          clientID: process.env.APPLE_CLIENT_ID,
          teamID: process.env.APPLE_TEAM_ID,
          keyID: process.env.APPLE_KEY_ID,
          privateKeyString: process.env.APPLE_PRIVATE_KEY,
          callbackURL: `${baseUrl}/api/auth/apple/callback`,
          scope: ["name", "email"],
          passReqToCallback: false,
        },
        async (
          accessToken: string, 
          refreshToken: string, 
          idToken: string, 
          profile: AppleStrategy.Profile, 
          done: AppleStrategy.VerifyCallback
        ) => {
          try {
            const oauthProfile = extractAppleProfile(profile, idToken);
            const user = await findOrCreateOAuthUser(oauthProfile);
            done(null, user);
          } catch (error) {
            done(error as Error);
          }
        }
      )
    );

    // Apple OAuth routes
    app.post("/api/auth/apple", passport.authenticate("apple"));

    app.post(
      "/api/auth/apple/callback",
      passport.authenticate("apple", { failureRedirect: "/login?error=oauth_failed" }),
      (req: Request, res: Response) => {
        if (req.user) {
          req.session.userId = (req.user as any).id;
          res.redirect("/dashboard");
        } else {
          res.redirect("/login?error=oauth_failed");
        }
      }
    );
  }
}
