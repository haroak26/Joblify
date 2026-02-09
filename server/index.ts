import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { setupStripeRoutes } from "./stripe";
import { startScheduleRunner } from "./scheduler";
import { securityHeaders, sanitizeInput, generalApiRateLimit } from "./middleware/security";

// Validate critical environment variables
function validateEnvVars() {
  const required = {
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
  };

  const optional = {
    POE_API_KEY: process.env.POE_API_KEY,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
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
    process.exit(1);
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
    if (!optional.APIFY_TOKEN) {
      console.warn('[Startup]   - Job scraping from Reddit and X will not work');
    }
    if (!optional.BREVO_API_KEY) {
      console.warn('[Startup]   - Email notifications will not work');
    }
    if (!optional.STRIPE_SECRET_KEY) {
      console.warn('[Startup]   - Payment processing will not work');
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

app.use(
  "/api/stripe/webhook",
  express.raw({
    type: "application/json",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

const jsonParser = express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
});

app.use((req, res, next) => {
  if (req.originalUrl === "/api/stripe/webhook") {
    return next();
  }
  return jsonParser(req, res, next);
});

app.use(express.urlencoded({ extended: false }));

// Apply input sanitization and rate limiting
app.use(sanitizeInput);
app.use('/api', generalApiRateLimit);

setupAuth(app);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

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
  await setupStripeRoutes(app);
  await registerRoutes(httpServer, app);
  if (process.env.SCHEDULE_RUNNER_ENABLED === "true") {
    startScheduleRunner();
  }

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
