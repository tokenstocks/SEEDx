import { db } from '../db';
import { distributionActivityLog, users, distributionEvents, distributionWithdrawals } from '../../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import type { Request } from 'express';

// Infer exact transaction type from db.transaction signature
type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer T) => any ? T : never;

export interface LogDistributionActivityData {
  distributionEventId?: string | null;
  distributionWithdrawalId?: string | null;
  projectId: string;
  activityType: string;
  performedBy: string;
  previousStatus?: string;
  newStatus?: string;
  changesSummary?: Record<string, any>;
  metadata?: Record<string, any>;
  req?: Request;
}

/**
 * Helper to extract IP and User-Agent from Request
 */
function extractAuditMetadata(req?: Request) {
  if (!req) return { ipAddress: undefined, userAgent: undefined, auditMetadata: {} };
  
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                    req.socket?.remoteAddress || 
                    undefined;
  const userAgent = req.headers['user-agent'] || undefined;
  
  return {
    ipAddress,
    userAgent,
    auditMetadata: {
      ipAddress,
      userAgent,
    },
  };
}

/**
 * Helper to get performer's full name
 */
async function getPerformerName(performedBy: string): Promise<string> {
  try {
    const [user] = await db
      .select({
        name: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(users)
      .where(eq(users.id, performedBy))
      .limit(1);
    
    return user?.name || 'Unknown User';
  } catch (error) {
    console.error('Error fetching performer name:', error);
    return 'Unknown User';
  }
}

/**
 * Helper to get performer's full name within transaction
 */
async function getPerformerNameInTransaction(performedBy: string, tx: Tx): Promise<string> {
  try {
    const [user] = await tx
      .select({
        name: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(users)
      .where(eq(users.id, performedBy))
      .limit(1);
    
    return user?.name || 'Unknown User';
  } catch (error) {
    console.error('Error fetching performer name in transaction:', error);
    return 'Unknown User';
  }
}

/**
 * Log distribution activity in transaction (CRITICAL operations)
 * Used for financial operations: allocations_calculated, payment_recorded
 */
export async function logDistributionActivityInTransaction(
  distributionEventId: string | null | undefined,
  distributionWithdrawalId: string | null | undefined,
  projectId: string,
  activityType: string,
  performedBy: string,
  tx: Tx,
  previousStatus?: string,
  newStatus?: string,
  changesSummary?: Record<string, any>,
  metadata?: Record<string, any>,
  req?: Request
): Promise<void> {
  const { auditMetadata } = extractAuditMetadata(req);
  const performedByName = await getPerformerNameInTransaction(performedBy, tx);

  await tx.insert(distributionActivityLog).values({
    distributionEventId: distributionEventId || null,
    distributionWithdrawalId: distributionWithdrawalId || null,
    projectId,
    activityType,
    performedBy,
    performedByName,
    previousStatus: previousStatus || null,
    newStatus: newStatus || null,
    changesSummary: changesSummary || null,
    metadata: metadata || null,
    auditMetadata,
  });
}

/**
 * Log distribution activity async (NON-CRITICAL operations)
 * Used for administrative operations: event_created, withdrawal_requested, etc.
 */
export function logDistributionActivityAsync(
  distributionEventId: string | null | undefined,
  distributionWithdrawalId: string | null | undefined,
  projectId: string,
  activityType: string,
  performedBy: string,
  previousStatus?: string,
  newStatus?: string,
  changesSummary?: Record<string, any>,
  metadata?: Record<string, any>,
  req?: Request
): void {
  const { auditMetadata } = extractAuditMetadata(req);

  (async () => {
    try {
      const performedByName = await getPerformerName(performedBy);

      await db.insert(distributionActivityLog).values({
        distributionEventId: distributionEventId || null,
        distributionWithdrawalId: distributionWithdrawalId || null,
        projectId,
        activityType,
        performedBy,
        performedByName,
        previousStatus: previousStatus || null,
        newStatus: newStatus || null,
        changesSummary: changesSummary || null,
        metadata: metadata || null,
        auditMetadata,
      });
    } catch (error: any) {
      console.error('❌ DISTRIBUTION AUDIT LOG FAILED (Non-Critical):', {
        distributionEventId,
        distributionWithdrawalId,
        projectId,
        activityType,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      
      // TODO: Send to error monitoring service (Sentry, DataDog, etc.)
    }
  })();
}

/**
 * Get activity log for a specific distribution event
 */
export async function getDistributionEventActivity(
  distributionEventId: string,
  limit: number = 50
): Promise<{ success: true; activities: any[] } | { success: false; error: string }> {
  try {
    const activities = await db
      .select({
        id: distributionActivityLog.id,
        activityType: distributionActivityLog.activityType,
        performedBy: distributionActivityLog.performedBy,
        performedByName: distributionActivityLog.performedByName,
        previousStatus: distributionActivityLog.previousStatus,
        newStatus: distributionActivityLog.newStatus,
        changesSummary: distributionActivityLog.changesSummary,
        metadata: distributionActivityLog.metadata,
        auditMetadata: distributionActivityLog.auditMetadata,
        createdAt: distributionActivityLog.createdAt,
      })
      .from(distributionActivityLog)
      .where(eq(distributionActivityLog.distributionEventId, distributionEventId))
      .orderBy(desc(distributionActivityLog.createdAt))
      .limit(limit);

    return { success: true, activities };
  } catch (error: any) {
    console.error('Error fetching distribution event activity:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get activity log for a specific project (all distributions)
 */
export async function getProjectDistributionActivity(
  projectId: string,
  limit: number = 100
): Promise<{ success: true; activities: any[] } | { success: false; error: string }> {
  try {
    const activities = await db
      .select({
        id: distributionActivityLog.id,
        distributionEventId: distributionActivityLog.distributionEventId,
        distributionTitle: distributionEvents.title,
        distributionWithdrawalId: distributionActivityLog.distributionWithdrawalId,
        activityType: distributionActivityLog.activityType,
        performedBy: distributionActivityLog.performedBy,
        performedByName: distributionActivityLog.performedByName,
        previousStatus: distributionActivityLog.previousStatus,
        newStatus: distributionActivityLog.newStatus,
        changesSummary: distributionActivityLog.changesSummary,
        metadata: distributionActivityLog.metadata,
        createdAt: distributionActivityLog.createdAt,
      })
      .from(distributionActivityLog)
      .leftJoin(distributionEvents, eq(distributionActivityLog.distributionEventId, distributionEvents.id))
      .where(eq(distributionActivityLog.projectId, projectId))
      .orderBy(desc(distributionActivityLog.createdAt))
      .limit(limit);

    return { success: true, activities };
  } catch (error: any) {
    console.error('Error fetching project distribution activity:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get recent distribution activity across all projects (Admin dashboard)
 */
export async function getRecentDistributionActivity(
  limit: number = 50
): Promise<{ success: true; activities: any[] } | { success: false; error: string }> {
  try {
    const activities = await db
      .select({
        id: distributionActivityLog.id,
        projectId: distributionActivityLog.projectId,
        distributionEventId: distributionActivityLog.distributionEventId,
        distributionTitle: distributionEvents.title,
        distributionWithdrawalId: distributionActivityLog.distributionWithdrawalId,
        activityType: distributionActivityLog.activityType,
        performedBy: distributionActivityLog.performedBy,
        performedByName: distributionActivityLog.performedByName,
        previousStatus: distributionActivityLog.previousStatus,
        newStatus: distributionActivityLog.newStatus,
        createdAt: distributionActivityLog.createdAt,
      })
      .from(distributionActivityLog)
      .leftJoin(distributionEvents, eq(distributionActivityLog.distributionEventId, distributionEvents.id))
      .orderBy(desc(distributionActivityLog.createdAt))
      .limit(limit);

    return { success: true, activities };
  } catch (error: any) {
    console.error('Error fetching recent distribution activity:', error);
    return { success: false, error: error.message };
  }
}
