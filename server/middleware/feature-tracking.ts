import { Request, Response, NextFunction } from "express";
import { trackFeatureUsage, FEATURES } from "./email-engagement";

/**
 * Middleware to track feature usage
 * Usage: app.get("/api/some-endpoint", trackFeature(FEATURES.SOME_FEATURE), requireAuth, handler)
 */
export function trackFeature(featureName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.session.userId) {
      // Track in background, don't block the request
      trackFeatureUsage(req.session.userId, featureName).catch(err => {
        console.error(`Failed to track feature usage for ${featureName}:`, err);
      });
    }
    next();
  };
}

/**
 * Track multiple features (for endpoints that span multiple features)
 */
export function trackFeatures(featureNames: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.session.userId) {
      const userId = req.session.userId;
      // Track all features in parallel
      Promise.all(
        featureNames.map(feature => 
          trackFeatureUsage(userId, feature).catch(err => {
            console.error(`Failed to track feature usage for ${feature}:`, err);
          })
        )
      );
    }
    next();
  };
}

export { FEATURES } from "./email-engagement";
