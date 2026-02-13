import type { Express, Response, Request } from "express";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import { requireAdmin, logAdminAction } from "./middleware/admin";
import { sendPerkAwardedEmail, sendAccountBlockedEmail, sendAiAccessBlockedEmail } from "./email";
import { perks, userPerks, redeemableCodes, users, aiUsageLogs } from "@shared/schema";
import { db } from "./db";
import { eq, gte, desc, sql, count } from "drizzle-orm";
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
      const sanitizedUsers = result.users.map((user) => ({
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
      
      // Send email notification to the user
      await sendAiAccessBlockedEmail(user.email, user.username);
      
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
   * Get user AI usage logs with aggregation for charts
   */
  app.get("/api/admin/users/:userId/ai-usage", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Get raw AI usage logs
      const aiUsage = await storage.getUserAiUsageLogs(userId, limit);
      
      // Get aggregated usage for last 4 weeks by feature
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      fourWeeksAgo.setHours(0, 0, 0, 0);
      
      const weeklyUsageByFeature = await db
        .select({
          week: sql<number>`FLOOR(EXTRACT(EPOCH FROM NOW() - ${aiUsageLogs.createdAt}) / 86400 / 7)::integer`,
          featureName: aiUsageLogs.featureName,
          count: count(),
        })
        .from(aiUsageLogs)
        .where(sql`${aiUsageLogs.userId} = ${userId} AND ${aiUsageLogs.createdAt} >= ${fourWeeksAgo}`)
        .groupBy(sql`FLOOR(EXTRACT(EPOCH FROM NOW() - ${aiUsageLogs.createdAt}) / 86400 / 7)::integer`, aiUsageLogs.featureName)
        .orderBy(sql`FLOOR(EXTRACT(EPOCH FROM NOW() - ${aiUsageLogs.createdAt}) / 86400 / 7)::integer`);
      
      // Interface for weekly usage data
      interface WeeklyUsageData {
        name: string;
        edits: number;
        scans: number;
        letters: number;
      }
      
      // Feature to category mapping for better maintainability
      const categorizeFeature = (featureName: string): keyof Omit<WeeklyUsageData, 'name'> => {
        const feature = featureName.toLowerCase();
        if (feature.includes('improve') || feature.includes('keyword') || feature.includes('grammar') || feature.includes('tone')) {
          return 'edits';
        } else if (feature.includes('ats') || feature.includes('scan')) {
          return 'scans';
        } else if (feature.includes('cover') || feature.includes('letter')) {
          return 'letters';
        } else {
          // Log unrecognized features for monitoring
          console.log(`[Admin API] Unrecognized AI feature type: ${featureName}, defaulting to edits category`);
          return 'edits';
        }
      };
      
      // Format data for charts - create weekly buckets
      const weeklyData: WeeklyUsageData[] = [];
      for (let i = 3; i >= 0; i--) {
        const weekData: WeeklyUsageData = { 
          name: `Week ${4 - i}`,
          edits: 0,
          scans: 0,
          letters: 0,
        };
        
        // Map features to categories
        weeklyUsageByFeature
          .filter((item) => item.week === i)
          .forEach((item) => {
            const category = categorizeFeature(item.featureName);
            weekData[category] += item.count;
          });
        
        weeklyData.push(weekData);
      }
      
      res.json({ 
        aiUsage,
        weeklyData,
      });
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
   * POST /api/admin/perks
   * Create a new perk
   */
  app.post("/api/admin/perks", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name, perkType, value, description } = req.body;
      
      if (!name || !perkType || !description) {
        return res.status(400).json({ error: "Name, perk type, and description are required" });
      }
      
      const adminId = req.session.userId!;
      
      // Create the perk
      const [perk] = await db
        .insert(perks)
        .values({
          name,
          perkType,
          value: value || null,
          description,
        })
        .returning();
      
      // Log admin action
      const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex');
      await logAdminAction(
        adminId,
        'CREATE_PERK',
        null,
        { perkId: perk.id, name, perkType },
        ipHash
      );
      
      res.json({ 
        success: true, 
        message: "Perk created successfully",
        perk
      });
    } catch (error) {
      console.error("Error creating perk:", error);
      res.status(500).json({ error: "Failed to create perk" });
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
  // Redeemable Codes Management
  // ============================================
  
  /**
   * POST /api/admin/codes/create
   * Create a new redeemable code
   */
  app.post("/api/admin/codes/create", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { perkId, userEmail, maxRedemptions, expiresAt } = req.body;
      
      if (!perkId || !userEmail) {
        return res.status(400).json({ error: "Perk ID and user email are required" });
      }
      
      const adminId = req.session.userId!;
      
      // Check if perk exists
      const [perk] = await db.select().from(perks).where(eq(perks.id, perkId));
      if (!perk) {
        return res.status(404).json({ error: "Perk not found" });
      }
      
      // Check if user exists by email
      const user = await storage.getUserByEmail(userEmail);
      if (!user) {
        return res.status(404).json({ error: "User not found with that email" });
      }
      
      // Generate a unique code with better entropy (8 bytes = 16 hex chars)
      const code = `PERK-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
      
      // Create the redeemable code
      const [redeemableCode] = await db
        .insert(redeemableCodes)
        .values({
          code,
          perkId,
          maxRedemptions: maxRedemptions || 1,
          currentRedemptions: 0,
          isActive: true,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdBy: adminId,
        })
        .returning();
      
      // Log admin action
      const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex');
      await logAdminAction(
        adminId,
        'CREATE_PERK_CODE',
        user.id,
        { perkId, perkName: perk.name, code },
        ipHash
      );
      
      // Send email notification to user with the code
      await sendPerkAwardedEmail(
        user.email,
        user.name || user.username,
        perk.name,
        `${perk.description}\n\nYour redemption code: ${code}\n\nRedeem it in your account settings.`
      );
      
      res.json({ 
        success: true, 
        message: "Redeemable code created and email sent to user",
        code: redeemableCode
      });
    } catch (error) {
      console.error("Error creating redeemable code:", error);
      res.status(500).json({ error: "Failed to create redeemable code" });
    }
  });
  
  /**
   * GET /api/admin/codes
   * Get all redeemable codes
   */
  app.get("/api/admin/codes", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const codes = await db.select().from(redeemableCodes);
      
      // Get perk details for each code
      const codesWithDetails = await Promise.all(
        codes.map(async (code) => {
          const [perk] = await db.select().from(perks).where(eq(perks.id, code.perkId));
          return {
            ...code,
            perk,
          };
        })
      );
      
      res.json({ codes: codesWithDetails });
    } catch (error) {
      console.error("Error fetching codes:", error);
      res.status(500).json({ error: "Failed to fetch codes" });
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
      
      // Get users created today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [usersToday] = await db
        .select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, today));
      
      // Get users who logged in within last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const [activeUsers] = await db
        .select({ count: count() })
        .from(users)
        .where(gte(users.lastLoginAt, sevenDaysAgo));
      
      // Get blocked accounts count
      const [blockedAccounts] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.accountBlocked, true));
      
      // Get AI usage for the last 7 days (grouped by day)
      const sevenDaysAgoStart = new Date();
      sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 6);
      sevenDaysAgoStart.setHours(0, 0, 0, 0);
      
      const weeklyUsage = await db
        .select({
          date: sql<string>`DATE(${aiUsageLogs.createdAt})`,
          count: count(),
        })
        .from(aiUsageLogs)
        .where(gte(aiUsageLogs.createdAt, sevenDaysAgoStart))
        .groupBy(sql`DATE(${aiUsageLogs.createdAt})`)
        .orderBy(sql`DATE(${aiUsageLogs.createdAt})`);
      
      // Format weekly usage data for charting
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const aiUsageByDay = [];
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(sevenDaysAgoStart);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = daysOfWeek[date.getDay()];
        
        const usage = weeklyUsage.find(u => u.date === dateStr);
        aiUsageByDay.push({
          name: dayName,
          usage: usage ? usage.count : 0,
          date: dateStr,
        });
      }
      
      res.json({
        totalUsers,
        stats: {
          usersToday: usersToday?.count || 0,
          activeUsers: activeUsers?.count || 0,
          blockedAccounts: blockedAccounts?.count || 0,
        },
        aiUsageByDay,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });
}
