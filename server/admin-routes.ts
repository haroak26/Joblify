import type { Express, Response, Request } from "express";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import { requireAdmin, logAdminAction } from "./middleware/admin";
import { sendPerkAwardedEmail, sendAccountBlockedEmail } from "./email";
import { perks, userPerks } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * Setup admin-only routes
 * All routes here require authentication and admin role
 */
export function setupAdminRoutes(app: Express) {
  
  // ============================================
  // User Management
  // ============================================
  
  /**
   * GET /api/admin/users
   * Get all users with pagination and search
   */
  app.get("/api/admin/users", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;
      
      console.log('[API] Admin fetching users:', { page, limit, search });
      const result = await storage.getAllUsers({ page, limit, search });
      console.log('[API] Admin fetch result:', { count: result.users.length, total: result.total });
      
      // Remove sensitive data before sending
      const sanitizedUsers = result.users.map((user: any) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        aiAccessBlocked: user.aiAccessBlocked,
        accountBlocked: user.accountBlocked,
        isAdmin: user.isAdmin,
      }));
      
      res.json({
        users: sanitizedUsers,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  
  /**
   * GET /api/admin/users/:userId
   * Get detailed user information (GDPR compliant - no resume content)
   */
  app.get("/api/admin/users/:userId", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const stats = await storage.getUserStatistics(userId);
      
      if (!stats) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ error: "Failed to fetch user details" });
    }
  });
  
  /**
   * POST /api/admin/users/:userId/block-account
   * Block a user's account
   */
  app.post("/api/admin/users/:userId/block-account", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      
      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ error: "Internal note/reason is required" });
      }
      
      const adminId = req.session.userId!;
      
      // Block the account
      const user = await storage.blockUserAccount(userId, adminId, reason);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Log admin action
      const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex');
      await logAdminAction(
        adminId,
        'BLOCK_ACCOUNT',
        userId,
        { reason },
        ipHash
      );
      
      // Send email notification to user (without internal note)
      await sendAccountBlockedEmail(user.email, user.name || user.username);
      
      res.json({ success: true, message: "Account blocked successfully" });
    } catch (error) {
      console.error("Error blocking account:", error);
      res.status(500).json({ error: "Failed to block account" });
    }
  });
  
  /**
   * POST /api/admin/users/:userId/unblock-account
   * Unblock a user's account
   */
  app.post("/api/admin/users/:userId/unblock-account", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const adminId = req.session.userId!;
      
      const user = await storage.unblockUserAccount(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Log admin action
      const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex');
      await logAdminAction(
        adminId,
        'UNBLOCK_ACCOUNT',
        userId,
        {},
        ipHash
      );
      
      res.json({ success: true, message: "Account unblocked successfully" });
    } catch (error) {
      console.error("Error unblocking account:", error);
      res.status(500).json({ error: "Failed to unblock account" });
    }
  });
  
  /**
   * POST /api/admin/users/:userId/block-ai
   * Block a user's AI access
   */
  app.post("/api/admin/users/:userId/block-ai", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      
      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ error: "Internal note/reason is required" });
      }
      
      const adminId = req.session.userId!;
      
      const user = await storage.blockUserAIAccess(userId, adminId, reason);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Log admin action
      const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex');
      await logAdminAction(
        adminId,
        'BLOCK_AI_ACCESS',
        userId,
        { reason },
        ipHash
      );
      
      res.json({ success: true, message: "AI access blocked successfully" });
    } catch (error) {
      console.error("Error blocking AI access:", error);
      res.status(500).json({ error: "Failed to block AI access" });
    }
  });
  
  /**
   * POST /api/admin/users/:userId/unblock-ai
   * Unblock a user's AI access
   */
  app.post("/api/admin/users/:userId/unblock-ai", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const adminId = req.session.userId!;
      
      const user = await storage.unblockUserAIAccess(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Log admin action
      const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex');
      await logAdminAction(
        adminId,
        'UNBLOCK_AI_ACCESS',
        userId,
        {},
        ipHash
      );
      
      res.json({ success: true, message: "AI access unblocked successfully" });
    } catch (error) {
      console.error("Error unblocking AI access:", error);
      res.status(500).json({ error: "Failed to unblock AI access" });
    }
  });
  
  /**
   * GET /api/admin/users/:userId/activity
   * Get user activity logs
   */
  app.get("/api/admin/users/:userId/activity", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const activities = await storage.getUserActivityLogs(userId, limit);
      
      res.json({ activities });
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({ error: "Failed to fetch user activity" });
    }
  });
  
  /**
   * GET /api/admin/users/:userId/ai-usage
   * Get user AI usage logs
   */
  app.get("/api/admin/users/:userId/ai-usage", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const aiUsage = await storage.getUserAiUsageLogs(userId, limit);
      
      res.json({ aiUsage });
    } catch (error) {
      console.error("Error fetching AI usage:", error);
      res.status(500).json({ error: "Failed to fetch AI usage" });
    }
  });
  
  // ============================================
  // Perks Management
  // ============================================
  
  /**
   * GET /api/admin/perks
   * Get all available perks
   */
  app.get("/api/admin/perks", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const allPerks = await storage.getAllPerks();
      res.json({ perks: allPerks });
    } catch (error) {
      console.error("Error fetching perks:", error);
      res.status(500).json({ error: "Failed to fetch perks" });
    }
  });
  
  /**
   * POST /api/admin/users/:userId/award-perk
   * Award a perk to a user
   */
  app.post("/api/admin/users/:userId/award-perk", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { perkId } = req.body;
      
      if (!perkId) {
        return res.status(400).json({ error: "Perk ID is required" });
      }
      
      const adminId = req.session.userId!;
      
      // Check if perk exists
      const [perk] = await db.select().from(perks).where(eq(perks.id, perkId));
      if (!perk) {
        return res.status(404).json({ error: "Perk not found" });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Award the perk
      const userPerk = await storage.awardPerkToUser(userId, perkId, adminId);
      
      // Log admin action
      const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex');
      await logAdminAction(
        adminId,
        'AWARD_PERK',
        userId,
        { perkId, perkName: perk.name },
        ipHash
      );
      
      // Send email notification to user
      await sendPerkAwardedEmail(
        user.email,
        user.name || user.username,
        perk.name,
        perk.description
      );
      
      res.json({ 
        success: true, 
        message: "Perk awarded successfully",
        userPerk 
      });
    } catch (error) {
      console.error("Error awarding perk:", error);
      res.status(500).json({ error: "Failed to award perk" });
    }
  });
  
  /**
   * GET /api/admin/users/:userId/perks
   * Get all perks awarded to a user
   */
  app.get("/api/admin/users/:userId/perks", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const userPerksData = await storage.getUserPerks(userId);
      
      // Get perk details for each user perk
      const perksWithDetails = await Promise.all(
        userPerksData.map(async (up) => {
          const [perk] = await db.select().from(perks).where(eq(perks.id, up.perkId));
          return {
            ...up,
            perk,
          };
        })
      );
      
      res.json({ perks: perksWithDetails });
    } catch (error) {
      console.error("Error fetching user perks:", error);
      res.status(500).json({ error: "Failed to fetch user perks" });
    }
  });
  
  // ============================================
  // Admin Logs / Audit Trail
  // ============================================
  
  /**
   * GET /api/admin/logs
   * Get admin action logs
   */
  app.get("/api/admin/logs", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const adminUserId = req.query.adminUserId as string;
      const action = req.query.action as string;
      
      const result = await storage.getAdminLogs({
        page,
        limit,
        adminUserId,
        action,
      });
      
      res.json({
        logs: result.logs,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      });
    } catch (error) {
      console.error("Error fetching admin logs:", error);
      res.status(500).json({ error: "Failed to fetch admin logs" });
    }
  });
  
  // ============================================
  // Dashboard Statistics
  // ============================================
  
  /**
   * GET /api/admin/dashboard/stats
   * Get overall platform statistics
   */
  app.get("/api/admin/dashboard/stats", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      // Get total user count
      const result = await storage.getAllUsers({ page: 1, limit: 1 });
      const totalUsers = result.total;
      
      // These stats would need more sophisticated queries in production
      // For now, returning basic structure
      res.json({
        totalUsers,
        stats: {
          // Add more stats as needed
          usersToday: 0, // Would need to query users created today
          activeUsers: 0, // Would need to query recent logins
          blockedAccounts: 0, // Would need to count blocked users
        },
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });
}
