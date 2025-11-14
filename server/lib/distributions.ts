import { db } from '../db';
import {
  distributionEvents,
  distributionAllocations,
  distributionWithdrawals,
  lpProjectAllocations,
  projects,
  users,
  type DistributionEvent,
  type DistributionAllocation,
} from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  logDistributionActivityAsync,
  logDistributionActivityInTransaction,
} from './distributionAuditLib';
import type { Request } from 'express';
import Decimal from 'decimal.js';

type SelectDistributionEvent = typeof distributionEvents.$inferSelect;
type SelectDistributionAllocation = typeof distributionAllocations.$inferSelect;

/**
 * Create a new distribution event
 * Status: draft
 */
export async function createDistributionEvent(
  projectId: string,
  eventType: string,
  title: string,
  totalAmount: string,
  distributionDate: Date,
  createdBy: string,
  description?: string,
  req?: Request
): Promise<{ success: true; event: SelectDistributionEvent } | { success: false; error: string }> {
  try {
    // Validate project exists
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    // Validate total amount
    const amount = new Decimal(totalAmount);
    if (amount.lte(0)) {
      return { success: false, error: 'Total amount must be greater than zero' };
    }

    // Create distribution event
    const [event] = await db
      .insert(distributionEvents)
      .values({
        projectId,
        eventType,
        title,
        description: description || null,
        totalAmount,
        distributionDate,
        status: 'draft',
        createdBy,
      })
      .returning();

    // 📝 ASYNC LOGGING (Non-Critical)
    logDistributionActivityAsync(
      event.id,
      null,
      projectId,
      'event_created',
      createdBy,
      undefined,
      'draft',
      {
        title,
        eventType,
        totalAmount,
        distributionDate: distributionDate.toISOString(),
      },
      undefined,
      req
    );

    return { success: true, event };
  } catch (error: any) {
    console.error('❌ Error creating distribution event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate allocations for a distribution event
 * Snapshots LP token holdings and calculates pro-rata allocations
 * Transition: draft → calculated
 */
export async function calculateAllocations(
  distributionEventId: string,
  calculatedBy: string,
  req?: Request
): Promise<
  { success: true; allocations: SelectDistributionAllocation[]; totalAllocated: string } | { success: false; error: string }
> {
  try {
    return await db.transaction(async (tx) => {
      // Get distribution event with FOR UPDATE lock
      const [event] = await tx
        .select()
        .from(distributionEvents)
        .where(eq(distributionEvents.id, distributionEventId))
        .for('update')
        .limit(1);

      if (!event) {
        throw new Error('Distribution event not found');
      }

      if (event.status !== 'draft') {
        throw new Error(`Cannot calculate allocations for event in status: ${event.status}`);
      }

      // Snapshot current LP token holdings for this project
      const lpHoldings = await tx
        .select({
          userId: lpProjectAllocations.userId,
          lpTokensHeld: lpProjectAllocations.lpTokensAllocated,
        })
        .from(lpProjectAllocations)
        .where(eq(lpProjectAllocations.projectId, event.projectId));

      if (lpHoldings.length === 0) {
        throw new Error('No LP token holders found for this project');
      }

      // Calculate total LP tokens outstanding
      const totalLpTokens = lpHoldings.reduce(
        (sum, holding) => sum.plus(new Decimal(holding.lpTokensHeld || '0')),
        new Decimal(0)
      );

      if (totalLpTokens.lte(0)) {
        throw new Error('Total LP tokens must be greater than zero');
      }

      // Get current NAV from project
      const [project] = await tx
        .select({ nav: projects.nav })
        .from(projects)
        .where(eq(projects.id, event.projectId))
        .limit(1);

      const snapshotNav = project?.nav || '0';
      const totalDistributionAmount = new Decimal(event.totalAmount);

      // Calculate pro-rata allocations
      const allocationRecords = lpHoldings.map((holding) => {
        const lpTokens = new Decimal(holding.lpTokensHeld || '0');
        const ownershipPercentage = lpTokens.div(totalLpTokens);
        const allocatedAmount = totalDistributionAmount.times(ownershipPercentage);

        return {
          distributionEventId: distributionEventId,
          projectId: event.projectId,
          lpTokenHolderId: holding.userId,
          lpTokensHeld: lpTokens.toFixed(7),
          ownershipPercentage: ownershipPercentage.toFixed(7),
          allocatedAmount: allocatedAmount.toFixed(2),
          availableAmount: allocatedAmount.toFixed(2),
        };
      });

      // Insert all allocations
      const createdAllocations = await tx
        .insert(distributionAllocations)
        .values(allocationRecords)
        .returning();

      // Calculate total allocated
      const totalAllocated = allocationRecords.reduce(
        (sum, record) => sum.plus(new Decimal(record.allocatedAmount)),
        new Decimal(0)
      );

      // Update distribution event with snapshot data
      await tx
        .update(distributionEvents)
        .set({
          status: 'calculated',
          snapshotDate: new Date(),
          snapshotTotalLpTokens: totalLpTokens.toFixed(7),
          snapshotNav: snapshotNav,
          snapshotMetadata: {
            sourceTable: 'lp_project_allocations',
            roundingPolicy: 'banker',
            holdersCount: lpHoldings.length,
          },
          totalAllocated: totalAllocated.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(distributionEvents.id, distributionEventId));

      // ✅ TRANSACTIONAL LOGGING (Critical)
      await logDistributionActivityInTransaction(
        distributionEventId,
        null,
        event.projectId,
        'allocations_calculated',
        calculatedBy,
        tx,
        'draft',
        'calculated',
        {
          totalLpTokens: totalLpTokens.toFixed(7),
          holdersCount: lpHoldings.length,
          totalAllocated: totalAllocated.toFixed(2),
        },
        {
          snapshotNav,
          distributionAmount: event.totalAmount,
        },
        req
      );

      return {
        success: true,
        allocations: createdAllocations,
        totalAllocated: totalAllocated.toFixed(2),
      };
    });
  } catch (error: any) {
    console.error('❌ Error calculating allocations:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get distribution event by ID
 */
export async function getDistributionEvent(
  distributionEventId: string
): Promise<{ success: true; event: SelectDistributionEvent } | { success: false; error: string }> {
  try {
    const [event] = await db
      .select()
      .from(distributionEvents)
      .where(eq(distributionEvents.id, distributionEventId))
      .limit(1);

    if (!event) {
      return { success: false, error: 'Distribution event not found' };
    }

    return { success: true, event };
  } catch (error: any) {
    console.error('❌ Error fetching distribution event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all distribution events for a project
 */
export async function getProjectDistributions(
  projectId: string
): Promise<{ success: true; distributions: SelectDistributionEvent[] } | { success: false; error: string }> {
  try {
    const distributions = await db
      .select()
      .from(distributionEvents)
      .where(eq(distributionEvents.projectId, projectId))
      .orderBy(desc(distributionEvents.distributionDate));

    return { success: true, distributions };
  } catch (error: any) {
    console.error('❌ Error fetching project distributions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all allocations for a distribution event
 */
export async function getDistributionAllocations(
  distributionEventId: string
): Promise<
  { success: true; allocations: Array<SelectDistributionAllocation & { lpHolderName: string; lpHolderEmail: string }> } | { success: false; error: string }
> {
  try {
    const allocations = await db
      .select({
        allocation: distributionAllocations,
        lpHolderName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        lpHolderEmail: users.email,
      })
      .from(distributionAllocations)
      .innerJoin(users, eq(distributionAllocations.lpTokenHolderId, users.id))
      .where(eq(distributionAllocations.distributionEventId, distributionEventId))
      .orderBy(desc(distributionAllocations.lpTokensHeld));

    const result = allocations.map((row) => ({
      ...row.allocation,
      lpHolderName: row.lpHolderName,
      lpHolderEmail: row.lpHolderEmail,
    }));

    return { success: true, allocations: result };
  } catch (error: any) {
    console.error('❌ Error fetching distribution allocations:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all allocations for an LP token holder across all distributions
 */
export async function getLPAllocations(
  lpTokenHolderId: string,
  projectId?: string
): Promise<
  {
    success: true;
    allocations: Array<
      SelectDistributionAllocation & {
        eventTitle: string;
        eventType: string;
        distributionDate: Date;
        eventStatus: string;
      }
    >;
  }
  | { success: false; error: string }
> {
  try {
    let query = db
      .select({
        allocation: distributionAllocations,
        eventTitle: distributionEvents.title,
        eventType: distributionEvents.eventType,
        distributionDate: distributionEvents.distributionDate,
        eventStatus: distributionEvents.status,
      })
      .from(distributionAllocations)
      .innerJoin(distributionEvents, eq(distributionAllocations.distributionEventId, distributionEvents.id))
      .where(eq(distributionAllocations.lpTokenHolderId, lpTokenHolderId))
      .orderBy(desc(distributionEvents.distributionDate))
      .$dynamic();

    if (projectId) {
      query = query.where(eq(distributionAllocations.projectId, projectId));
    }

    const allocations = await query;

    const result = allocations.map((row) => ({
      ...row.allocation,
      eventTitle: row.eventTitle,
      eventType: row.eventType,
      distributionDate: row.distributionDate,
      eventStatus: row.eventStatus,
    }));

    return { success: true, allocations: result };
  } catch (error: any) {
    console.error('❌ Error fetching LP allocations:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel a distribution event
 * Transition: draft/calculated → cancelled
 */
export async function cancelDistributionEvent(
  distributionEventId: string,
  cancelledBy: string,
  cancellationReason: string,
  req?: Request
): Promise<{ success: true; event: SelectDistributionEvent } | { success: false; error: string }> {
  try {
    return await db.transaction(async (tx) => {
      // Get distribution event with FOR UPDATE lock
      const [event] = await tx
        .select()
        .from(distributionEvents)
        .where(eq(distributionEvents.id, distributionEventId))
        .for('update')
        .limit(1);

      if (!event) {
        throw new Error('Distribution event not found');
      }

      if (!['draft', 'calculated'].includes(event.status)) {
        throw new Error(`Cannot cancel event in status: ${event.status}`);
      }

      // Update event to cancelled
      const [cancelledEvent] = await tx
        .update(distributionEvents)
        .set({
          status: 'cancelled',
          cancelledBy,
          cancelledAt: new Date(),
          cancellationReason,
          updatedAt: new Date(),
        })
        .where(eq(distributionEvents.id, distributionEventId))
        .returning();

      // If allocations exist, cancel them too
      if (event.status === 'calculated') {
        await tx
          .update(distributionAllocations)
          .set({
            status: 'cancelled',
            updatedAt: new Date(),
          })
          .where(eq(distributionAllocations.distributionEventId, distributionEventId));
      }

      // ✅ TRANSACTIONAL LOGGING (Critical)
      await logDistributionActivityInTransaction(
        distributionEventId,
        null,
        event.projectId,
        'event_cancelled',
        cancelledBy,
        tx,
        event.status,
        'cancelled',
        {
          reason: cancellationReason,
        },
        undefined,
        req
      );

      return { success: true, event: cancelledEvent };
    });
  } catch (error: any) {
    console.error('❌ Error cancelling distribution event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get distribution statistics
 */
export async function getDistributionStats(
  projectId?: string
): Promise<{ success: true; stats: any } | { success: false; error: string }> {
  try {
    let query = db
      .select({
        totalEvents: sql<number>`COUNT(*)`,
        draftCount: sql<number>`COUNT(*) FILTER (WHERE ${distributionEvents.status} = 'draft')`,
        calculatedCount: sql<number>`COUNT(*) FILTER (WHERE ${distributionEvents.status} = 'calculated')`,
        activeCount: sql<number>`COUNT(*) FILTER (WHERE ${distributionEvents.status} = 'active')`,
        completedCount: sql<number>`COUNT(*) FILTER (WHERE ${distributionEvents.status} = 'completed')`,
        cancelledCount: sql<number>`COUNT(*) FILTER (WHERE ${distributionEvents.status} = 'cancelled')`,
        totalDistributed: sql<string>`COALESCE(SUM(${distributionEvents.totalAmount}) FILTER (WHERE ${distributionEvents.status} = 'completed'), 0)`,
        totalAllocated: sql<string>`COALESCE(SUM(${distributionEvents.totalAllocated}), 0)`,
        totalWithdrawn: sql<string>`COALESCE(SUM(${distributionEvents.totalWithdrawn}), 0)`,
      })
      .from(distributionEvents)
      .$dynamic();

    if (projectId) {
      query = query.where(eq(distributionEvents.projectId, projectId));
    }

    const [stats] = await query;

    return { success: true, stats };
  } catch (error: any) {
    console.error('❌ Error fetching distribution stats:', error);
    return { success: false, error: error.message };
  }
}
