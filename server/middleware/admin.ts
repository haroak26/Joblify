import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import type { AuthenticatedRequest } from "../auth";

/**
 * Middleware to require admin role
 * Must be used after requireAuth middleware
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = await storage.getUser(req.session.userId);
  
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  if (!user.isAdmin) {
    return res.status(403).json({ 
      error: "Forbidden", 
      message: "Admin access required" 
    });
  }

  // Attach full user to request for convenience
  req.user = {
    id: user.id,
    username: user.username,
    email: user.email,
  };

  next();
}

/**
 * Helper function to log admin actions for audit trail
 */
export async function logAdminAction(
  adminUserId: string,
  action: string,
  targetUserId: string | null,
  details: Record<string, any>,
  ipAddressHash?: string
) {
  await storage.createAdminLog({
    adminUserId,
    action,
    targetUserId,
    details,
    ipAddressHash,
  });
}
