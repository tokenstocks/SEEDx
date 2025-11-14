import { db } from '../db';
import { milestoneActivityLog, users, projects, projectMilestones } from '../../shared/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';

export interface LogActivityData {
  milestoneId: string;
  projectId: string;
  activityType: string;
  performedBy: string;
  previousStatus?: string;
  newStatus?: string;
  changesSummary?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export const auditLib = {
  /**
   * Log milestone activity (standard - async, non-blocking)
   * Used for NON-CRITICAL operations
   */
  async logActivity(data: LogActivityData) {
    try {
      const [activity] = await db.insert(milestoneActivityLog).values({
        milestoneId: data.milestoneId,
        projectId: data.projectId,
        activityType: data.activityType,
        performedBy: data.performedBy,
        previousStatus: data.previousStatus,
        newStatus: data.newStatus,
        changesSummary: data.changesSummary || null,
        metadata: data.metadata || null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      }).returning();

      return { success: true, activity };
    } catch (error: any) {
      console.error('❌ Error logging activity:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Log milestone activity within a Drizzle transaction
   * Used for CRITICAL operations (approve, disburse, bank_transfer)
   * 
   * @param data - Activity data to log
   * @param tx - Drizzle transaction client (typeof db)
   */
  async logActivityInTransaction(data: LogActivityData, tx: typeof db) {
    try {
      const [activity] = await tx.insert(milestoneActivityLog).values({
        milestoneId: data.milestoneId,
        projectId: data.projectId,
        activityType: data.activityType,
        performedBy: data.performedBy,
        previousStatus: data.previousStatus,
        newStatus: data.newStatus,
        changesSummary: data.changesSummary || null,
        metadata: data.metadata || null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      }).returning();

      return { success: true, activity };
    } catch (error: any) {
      console.error('❌ Error logging activity in transaction:', error);
      throw error; // Throw to trigger transaction rollback
    }
  },

  /**
   * Async logging with error monitoring (fire-and-forget)
   * Used for NON-CRITICAL operations where logging failure shouldn't block the operation
   */
  logActivityAsync(data: LogActivityData) {
    this.logActivity(data).catch((error) => {
      console.error('❌ AUDIT LOG FAILED (Non-Critical):', {
        milestoneId: data.milestoneId,
        activityType: data.activityType,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      
      // TODO: Send to error monitoring service (Sentry, DataDog, etc.)
      // Example: Sentry.captureException(error, { extra: data });
    });
  },

  /**
   * Get activity log for a specific milestone
   */
  async getMilestoneActivity(milestoneId: string, limit: number = 50) {
    try {
      const activities = await db
        .select({
          id: milestoneActivityLog.id,
          activityType: milestoneActivityLog.activityType,
          performedBy: milestoneActivityLog.performedBy,
          performedByName: users.name,
          performedByEmail: users.email,
          previousStatus: milestoneActivityLog.previousStatus,
          newStatus: milestoneActivityLog.newStatus,
          changesSummary: milestoneActivityLog.changesSummary,
          metadata: milestoneActivityLog.metadata,
          ipAddress: milestoneActivityLog.ipAddress,
          userAgent: milestoneActivityLog.userAgent,
          createdAt: milestoneActivityLog.createdAt,
        })
        .from(milestoneActivityLog)
        .leftJoin(users, eq(milestoneActivityLog.performedBy, users.id))
        .where(eq(milestoneActivityLog.milestoneId, milestoneId))
        .orderBy(desc(milestoneActivityLog.createdAt))
        .limit(limit);

      return { success: true, activities };
    } catch (error: any) {
      console.error('Error fetching milestone activity:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get activity log for a specific project (all milestones)
   */
  async getProjectActivity(projectId: string, limit: number = 100) {
    try {
      const activities = await db
        .select({
          id: milestoneActivityLog.id,
          milestoneId: milestoneActivityLog.milestoneId,
          milestoneTitle: projectMilestones.title,
          milestoneNumber: projectMilestones.milestoneNumber,
          activityType: milestoneActivityLog.activityType,
          performedBy: milestoneActivityLog.performedBy,
          performedByName: users.name,
          performedByEmail: users.email,
          previousStatus: milestoneActivityLog.previousStatus,
          newStatus: milestoneActivityLog.newStatus,
          changesSummary: milestoneActivityLog.changesSummary,
          metadata: milestoneActivityLog.metadata,
          createdAt: milestoneActivityLog.createdAt,
        })
        .from(milestoneActivityLog)
        .leftJoin(users, eq(milestoneActivityLog.performedBy, users.id))
        .leftJoin(projectMilestones, eq(milestoneActivityLog.milestoneId, projectMilestones.id))
        .where(eq(milestoneActivityLog.projectId, projectId))
        .orderBy(desc(milestoneActivityLog.createdAt))
        .limit(limit);

      return { success: true, activities };
    } catch (error: any) {
      console.error('Error fetching project activity:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get activity statistics for a project
   */
  async getProjectActivityStats(projectId: string) {
    try {
      const stats = await db
        .select({
          activityType: milestoneActivityLog.activityType,
          count: sql<number>`count(*)::int`,
        })
        .from(milestoneActivityLog)
        .where(eq(milestoneActivityLog.projectId, projectId))
        .groupBy(milestoneActivityLog.activityType);

      return { success: true, stats };
    } catch (error: any) {
      console.error('Error fetching activity stats:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get recent activity across all projects (Admin dashboard)
   */
  async getRecentActivity(limit: number = 50) {
    try {
      const activities = await db
        .select({
          id: milestoneActivityLog.id,
          projectId: milestoneActivityLog.projectId,
          projectName: projects.name,
          milestoneId: milestoneActivityLog.milestoneId,
          milestoneTitle: projectMilestones.title,
          milestoneNumber: projectMilestones.milestoneNumber,
          activityType: milestoneActivityLog.activityType,
          performedBy: milestoneActivityLog.performedBy,
          performedByName: users.name,
          performedByEmail: users.email,
          previousStatus: milestoneActivityLog.previousStatus,
          newStatus: milestoneActivityLog.newStatus,
          createdAt: milestoneActivityLog.createdAt,
        })
        .from(milestoneActivityLog)
        .leftJoin(users, eq(milestoneActivityLog.performedBy, users.id))
        .leftJoin(projects, eq(milestoneActivityLog.projectId, projects.id))
        .leftJoin(projectMilestones, eq(milestoneActivityLog.milestoneId, projectMilestones.id))
        .orderBy(desc(milestoneActivityLog.createdAt))
        .limit(limit);

      return { success: true, activities };
    } catch (error: any) {
      console.error('Error fetching recent activity:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get activity by date range
   */
  async getActivityByDateRange(
    projectId: string,
    startDate: Date,
    endDate: Date
  ) {
    try {
      const activities = await db
        .select({
          id: milestoneActivityLog.id,
          milestoneId: milestoneActivityLog.milestoneId,
          milestoneTitle: projectMilestones.title,
          activityType: milestoneActivityLog.activityType,
          performedBy: milestoneActivityLog.performedBy,
          performedByName: users.name,
          previousStatus: milestoneActivityLog.previousStatus,
          newStatus: milestoneActivityLog.newStatus,
          createdAt: milestoneActivityLog.createdAt,
        })
        .from(milestoneActivityLog)
        .leftJoin(users, eq(milestoneActivityLog.performedBy, users.id))
        .leftJoin(projectMilestones, eq(milestoneActivityLog.milestoneId, projectMilestones.id))
        .where(
          and(
            eq(milestoneActivityLog.projectId, projectId),
            gte(milestoneActivityLog.createdAt, startDate),
            lte(milestoneActivityLog.createdAt, endDate)
          )
        )
        .orderBy(desc(milestoneActivityLog.createdAt));

      return { success: true, activities };
    } catch (error: any) {
      console.error('Error fetching activity by date range:', error);
      return { success: false, error: error.message };
    }
  },
};
