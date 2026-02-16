import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupAdminRoutes } from "./admin-routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { pool } from "./db";
import { securityHeaders, sanitizeInput, resolveUserPlan, generalApiRateLimit } from "./middleware/security";
import { csrfSetToken, csrfVerifyToken } from "./middleware/csrf";

// Validate critical environment variables
function validateEnvVars() {
  const required = {
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
  };

  // Add encryption keys to required list in production
  if (process.env.NODE_ENV === 'production') {
    Object.assign(required, {
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
      TWO_FACTOR_ENCRYPTION_KEY: process.env.TWO_FACTOR_ENCRYPTION_KEY,
    });
  }

  const optional = {
    POE_API_KEY: process.env.POE_API_KEY,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
  };

  const missing: string[] = [];
  
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('[Startup] CRITICAL: Missing required environment variables:', missing.join(', '));
    console.error('[Startup] Application cannot start without these variables.');
    if (process.env.NODE_ENV === 'production') {
      console.error('[Startup] In production, ENCRYPTION_KEY and TWO_FACTOR_ENCRYPTION_KEY are required for data security.');
    }
    process.exit(1);
  }

  // Warn about encryption keys in development
  if (process.env.NODE_ENV !== 'production') {
    if (!process.env.ENCRYPTION_KEY || !process.env.TWO_FACTOR_ENCRYPTION_KEY) {
      console.warn('[Startup] WARNING: Encryption keys not set in development mode.');
      console.warn('[Startup] Encrypted data (2FA secrets, backup codes) will be lost on server restart!');
    }
  }

  const warnings: string[] = [];
  for (const [key, value] of Object.entries(optional)) {
    if (!value) {
      warnings.push(key);
    }
  }

  if (warnings.length > 0) {
    console.warn('[Startup] WARNING: Missing optional environment variables:', warnings.join(', '));
    console.warn('[Startup] Some features may not work correctly:');
    if (!optional.POE_API_KEY) {
      console.warn('[Startup]   - AI features (skill suggestions, message generation) will not work');
    }
    if (!optional.BREVO_API_KEY) {
      console.warn('[Startup]   - Email notifications will not work');
    }
  }

  console.log('[Startup] Environment validation completed');
}

// Validate environment before starting
validateEnvVars();

const app = express();
const httpServer = createServer(app);

// Trust first proxy (required for rate limiting with X-Forwarded-For header)
app.set("trust proxy", 1);

// Apply security headers (helmet)
app.use(securityHeaders());

declare module "http" {
  interface IncomingMessage {
    rawBody: Buffer;
  }
}

const jsonParser = express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
});

app.use(jsonParser);

app.use(express.urlencoded({ extended: false }));

// Parse cookies for CSRF protection
app.use(cookieParser());

// Apply CSRF protection
// Set CSRF token for GET requests
app.use(csrfSetToken);
// Verify CSRF token for state-changing requests (POST, PUT, DELETE, PATCH)
app.use(csrfVerifyToken);

// Apply input sanitization
app.use(sanitizeInput);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Track cleanup tasks
const cleanupTasks: (() => Promise<void> | void)[] = [];

export function registerCleanupTask(task: () => Promise<void> | void) {
  cleanupTasks.push(task);
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  log(`Received ${signal}, starting graceful shutdown...`);
  
  // Run cleanup tasks
  for (const task of cleanupTasks) {
    try {
      await task();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
  
  // Close HTTP server
  httpServer.close(() => {
    log('HTTP server closed');
    process.exit(0);
  });
  
  // Force exit if shutdown takes too long
  setTimeout(() => {
    console.error('Graceful shutdown timed out after 10 seconds, forcefully exiting');
    process.exit(1);
  }, 10000); // 10 second timeout
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const shouldLogRequests = process.env.LOG_REQUESTS === "true";

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (shouldLogRequests && path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  await setupAuth(app);

  // Resolve user plan before applying tiered API limits
  app.use(resolveUserPlan);
  app.use('/api', generalApiRateLimit);

  setupAdminRoutes(app);
  await registerRoutes(httpServer, app);
  
  // Start scheduler if enabled
  let schedulerTimer: NodeJS.Timeout | undefined;
  if (process.env.SCHEDULE_RUNNER_ENABLED === "true") {
    const { startScheduleRunner, stopScheduler } = await import("./scheduler");
    schedulerTimer = startScheduleRunner();
    
    // Register cleanup task to stop scheduler
    registerCleanupTask(() => {
      if (schedulerTimer) {
        stopScheduler(schedulerTimer);
      }
    });
  }
  
  // Register database cleanup
  registerCleanupTask(async () => {
    log('Closing database connections...');
    await pool.end();
  });

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
