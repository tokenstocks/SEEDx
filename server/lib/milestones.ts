import { db } from "../db";
import { projectMilestones, projects, type InsertProjectMilestone, type SelectProjectMilestone } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { auditLib } from "./auditLib";
import type { Request } from "express";

// Infer exact transaction type from db.transaction signature
type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer T) => any ? T : never;

/**
 * Phase 3.1: Milestone Foundation Library
 * Phase 3.3: Enhanced with comprehensive audit trail logging
 * Provides CRUD operations for project milestones with state management
 */

/**
 * Helper function to extract request metadata (IP, User-Agent)
 */
function extractRequestMetadata(req?: Request) {
  if (!req) return {};
  
  return {
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
  };
}

/**
 * Helper for NON-CRITICAL async logging (fire-and-forget with monitoring)
 */
function logMilestoneActivityAsync(
  milestoneId: string,
  projectId: string,
  activityType: string,
  performedBy: string,
  previousStatus?: string,
  newStatus?: string,
  changes?: Record<string, any>,
  metadata?: Record<string, any>,
  req?: Request
) {
  const requestMetadata = extractRequestMetadata(req);
  
  auditLib.logActivityAsync({
    milestoneId,
    projectId,
    activityType,
    performedBy,
    previousStatus,
    newStatus,
    changesSummary: changes,
    metadata,
    ...requestMetadata,
  });
}

/**
 * Helper for CRITICAL transactional logging
 */
async function logMilestoneActivityInTransaction(
  milestoneId: string,
  projectId: string,
  activityType: string,
  performedBy: string,
  tx: Tx,
  previousStatus?: string,
  newStatus?: string,
  changes?: Record<string, any>,
  metadata?: Record<string, any>,
  req?: Request
) {
  const requestMetadata = extractRequestMetadata(req);
  
  await auditLib.logActivityInTransaction({
    milestoneId,
    projectId,
    activityType,
    performedBy,
    previousStatus,
    newStatus,
    changesSummary: changes,
    metadata,
    ...requestMetadata,
  }, tx);
}

/**
 * Create a new milestone for a project
 * Uses transactional milestone number assignment with FOR UPDATE to prevent race conditions
 * NON-CRITICAL: Async audit logging
 */
export async function createMilestone(
  projectId: string,
  milestoneData: {
    title: string;
    description?: string;
    targetAmount: string;
  },
  createdBy: string,
  req?: Request
): Promise<{ success: true; milestone: SelectProjectMilestone } | { success: false; error: string }> {
  try {
    const result = await db.transaction(async (tx) => {
      // Lock the project row to prevent concurrent milestone number assignment
      const [project] = await tx
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .for("update")
        .limit(1);

      if (!project) {
        throw new Error("Project not found");
      }

      // Get next milestone number (COALESCE(MAX+1, 1))
      const maxMilestoneResult = await tx
        .select({ maxNumber: sql<number>`COALESCE(MAX(${projectMilestones.milestoneNumber}), 0)` })
        .from(projectMilestones)
        .where(eq(projectMilestones.projectId, projectId))
        .limit(1);

      const nextMilestoneNumber = (maxMilestoneResult[0]?.maxNumber || 0) + 1;

      // Insert milestone
      const [milestone] = await tx
        .insert(projectMilestones)
        .values({
          projectId,
          milestoneNumber: nextMilestoneNumber,
          title: milestoneData.title,
          description: milestoneData.description,
          targetAmount: milestoneData.targetAmount,
          status: "draft",
        })
        .returning();

      // Update project's totalMilestones count
      await tx
        .update(projects)
        .set({
          totalMilestones: sql`${projects.totalMilestones} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));

      return milestone;
    });

    // 📝 ASYNC LOGGING (Non-Critical)
    logMilestoneActivityAsync(
      result.id,
      projectId,
      'created',
      createdBy,
      undefined,
      'draft',
      {
        title: result.title,
        targetAmount: result.targetAmount,
        milestoneNumber: result.milestoneNumber,
      },
      undefined,
      req
    );

    return { success: true, milestone: result };
  } catch (error: any) {
    console.error("❌ Error creating milestone:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all milestones for a project
 * Ordered by milestone number ascending
 */
export async function getProjectMilestones(
  projectId: string
): Promise<{ success: true; milestones: SelectProjectMilestone[] } | { success: false; error: string }> {
  try {
    const milestones = await db
      .select()
      .from(projectMilestones)
      .where(eq(projectMilestones.projectId, projectId))
      .orderBy(projectMilestones.milestoneNumber);

    return { success: true, milestones };
  } catch (error: any) {
    console.error("❌ Error fetching project milestones:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a specific milestone by ID
 */
export async function getMilestoneById(
  milestoneId: string
): Promise<{ success: true; milestone: SelectProjectMilestone } | { success: false; error: string }> {
  try {
    const [milestone] = await db
      .select()
      .from(projectMilestones)
      .where(eq(projectMilestones.id, milestoneId))
      .limit(1);

    if (!milestone) {
      return { success: false, error: "Milestone not found" };
    }

    return { success: true, milestone };
  } catch (error: any) {
    console.error("❌ Error fetching milestone:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update milestone details (only allowed for draft status)
 * NON-CRITICAL: Async audit logging
 */
export async function updateMilestone(
  milestoneId: string,
  updates: {
    title?: string;
    description?: string;
    targetAmount?: string;
  },
  updatedBy: string,
  req?: Request
): Promise<{ success: true; milestone: SelectProjectMilestone } | { success: false; error: string }> {
  try {
    let existingMilestone: SelectProjectMilestone;
    const result = await db.transaction(async (tx) => {
      // Check if milestone exists and is in draft status
      const [existing] = await tx
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.id, milestoneId))
        .limit(1);

      if (!existing) {
        throw new Error("Milestone not found");
      }

      if (existing.status !== "draft") {
        throw new Error("Only draft milestones can be edited");
      }

      existingMilestone = existing;

      // Update milestone
      const [updatedMilestone] = await tx
        .update(projectMilestones)
        .set({
          title: updates.title ?? existing.title,
          description: updates.description ?? existing.description,
          targetAmount: updates.targetAmount ?? existing.targetAmount,
          updatedAt: new Date(),
        })
        .where(eq(projectMilestones.id, milestoneId))
        .returning();

      return updatedMilestone;
    });

    // 📝 ASYNC LOGGING (Non-Critical) - Track what changed
    const changes: Record<string, any> = {};
    if (updates.title && updates.title !== existingMilestone.title) {
      changes.title = { from: existingMilestone.title, to: updates.title };
    }
    if (updates.description !== undefined && updates.description !== existingMilestone.description) {
      changes.description = { from: existingMilestone.description, to: updates.description };
    }
    if (updates.targetAmount && updates.targetAmount !== existingMilestone.targetAmount) {
      changes.targetAmount = { from: existingMilestone.targetAmount, to: updates.targetAmount };
    }

    if (Object.keys(changes).length > 0) {
      logMilestoneActivityAsync(
        milestoneId,
        existingMilestone.projectId,
        'updated',
        updatedBy,
        'draft',
        'draft',
        changes,
        undefined,
        req
      );
    }

    return { success: true, milestone: result };
  } catch (error: any) {
    console.error("❌ Error updating milestone:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a milestone (only allowed for draft status)
 * Updates project's totalMilestones count
 * NON-CRITICAL: Async audit logging
 */
export async function deleteMilestone(
  milestoneId: string,
  deletedBy: string,
  req?: Request
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    let existingMilestone: SelectProjectMilestone;
    const result = await db.transaction(async (tx) => {
      // Check if milestone exists and is in draft status
      const [existing] = await tx
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.id, milestoneId))
        .limit(1);

      if (!existing) {
        throw new Error("Milestone not found");
      }

      if (existing.status !== "draft") {
        throw new Error("Only draft milestones can be deleted");
      }

      existingMilestone = existing;

      // Delete milestone
      await tx.delete(projectMilestones).where(eq(projectMilestones.id, milestoneId));

      // Update project's totalMilestones count
      await tx
        .update(projects)
        .set({
          totalMilestones: sql`${projects.totalMilestones} - 1`,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, existing.projectId));

      return "Milestone deleted successfully";
    });

    // 📝 ASYNC LOGGING (Non-Critical)
    logMilestoneActivityAsync(
      milestoneId,
      existingMilestone.projectId,
      'deleted',
      deletedBy,
      'draft',
      undefined,
      {
        title: existingMilestone.title,
        milestoneNumber: existingMilestone.milestoneNumber,
        targetAmount: existingMilestone.targetAmount,
      },
      undefined,
      req
    );

    return { success: true, message: result };
  } catch (error: any) {
    console.error("❌ Error deleting milestone:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit milestone for approval
 * Transition: draft → submitted
 * NON-CRITICAL: Async audit logging
 */
export async function submitMilestone(
  milestoneId: string,
  submittedBy: string,
  req?: Request
): Promise<{ success: true; milestone: SelectProjectMilestone } | { success: false; error: string }> {
  try {
    let existingMilestone: SelectProjectMilestone;
    const result = await db.transaction(async (tx) => {
      // Check if milestone exists and is in draft status
      const [existing] = await tx
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.id, milestoneId))
        .limit(1);

      if (!existing) {
        throw new Error("Milestone not found");
      }

      if (existing.status !== "draft") {
        throw new Error("Only draft milestones can be submitted");
      }

      existingMilestone = existing;

      // Update status to submitted
      const [updatedMilestone] = await tx
        .update(projectMilestones)
        .set({
          status: "submitted",
          submittedAt: new Date(),
          submittedBy,
          updatedAt: new Date(),
        })
        .where(eq(projectMilestones.id, milestoneId))
        .returning();

      return updatedMilestone;
    });

    // 📝 ASYNC LOGGING (Non-Critical)
    logMilestoneActivityAsync(
      milestoneId,
      existingMilestone.projectId,
      'submitted',
      submittedBy,
      'draft',
      'submitted',
      undefined,
      undefined,
      req
    );

    return { success: true, milestone: result };
  } catch (error: any) {
    console.error("❌ Error submitting milestone:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Phase 3.2: Approval & Disbursement Workflow
 */

/**
 * Approve a milestone
 * Transition: submitted → approved
 * NON-CRITICAL: Async audit logging
 */
export async function approveMilestone(
  milestoneId: string,
  approvedBy: string,
  req?: Request
): Promise<{ success: true; milestone: SelectProjectMilestone } | { success: false; error: string }> {
  try {
    let existingMilestone: SelectProjectMilestone;
    const result = await db.transaction(async (tx) => {
      // Check if milestone exists and is in submitted status
      const [existing] = await tx
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.id, milestoneId))
        .limit(1);

      if (!existing) {
        throw new Error("Milestone not found");
      }

      if (existing.status !== "submitted") {
        throw new Error("Only submitted milestones can be approved");
      }

      existingMilestone = existing;

      // Update status to approved
      const [updatedMilestone] = await tx
        .update(projectMilestones)
        .set({
          status: "approved",
          approvedAt: new Date(),
          approvedBy,
          updatedAt: new Date(),
        })
        .where(eq(projectMilestones.id, milestoneId))
        .returning();

      return updatedMilestone;
    });

    // 📝 ASYNC LOGGING (Non-Critical)
    logMilestoneActivityAsync(
      milestoneId,
      existingMilestone.projectId,
      'approved',
      approvedBy,
      'submitted',
      'approved',
      undefined,
      undefined,
      req
    );

    return { success: true, milestone: result };
  } catch (error: any) {
    console.error("❌ Error approving milestone:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject a milestone
 * Transition: submitted → rejected
 * NON-CRITICAL: Async audit logging
 */
export async function rejectMilestone(
  milestoneId: string,
  rejectedBy: string,
  rejectionReason?: string,
  req?: Request
): Promise<{ success: true; milestone: SelectProjectMilestone } | { success: false; error: string }> {
  try {
    let existingMilestone: SelectProjectMilestone;
    const result = await db.transaction(async (tx) => {
      // Check if milestone exists and is in submitted status
      const [existing] = await tx
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.id, milestoneId))
        .limit(1);

      if (!existing) {
        throw new Error("Milestone not found");
      }

      if (existing.status !== "submitted") {
        throw new Error("Only submitted milestones can be rejected");
      }

      existingMilestone = existing;

      // Update status to rejected
      const [updatedMilestone] = await tx
        .update(projectMilestones)
        .set({
          status: "rejected",
          rejectedBy,
          rejectedAt: new Date(),
          rejectionReason: rejectionReason ?? existing.rejectionReason,
          updatedAt: new Date(),
        })
        .where(eq(projectMilestones.id, milestoneId))
        .returning();

      return updatedMilestone;
    });

    // 📝 ASYNC LOGGING (Non-Critical)
    logMilestoneActivityAsync(
      milestoneId,
      existingMilestone.projectId,
      'rejected',
      rejectedBy,
      'submitted',
      'rejected',
      undefined,
      { rejectionReason },
      req
    );

    return { success: true, milestone: result };
  } catch (error: any) {
    console.error("❌ Error rejecting milestone:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Record bank transfer details for approved milestone
 * CRITICAL: Transactional audit logging
 */
export async function recordBankTransfer(
  milestoneId: string,
  transferData: {
    bankTransferReference: string;
    bankTransferAmount: string;
    bankTransferDate: Date;
    notes?: string;
  },
  recordedBy: string,
  req?: Request
): Promise<{ success: true; milestone: SelectProjectMilestone } | { success: false; error: string }> {
  try {
    const result = await db.transaction(async (tx) => {
      // Check if milestone exists and is approved
      const [existingMilestone] = await tx
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.id, milestoneId))
        .limit(1);

      if (!existingMilestone) {
        throw new Error("Milestone not found");
      }

      if (existingMilestone.status !== "approved") {
        throw new Error("Only approved milestones can have bank transfers recorded");
      }

      // Update bank transfer details
      const [updatedMilestone] = await tx
        .update(projectMilestones)
        .set({
          bankTransferReference: transferData.bankTransferReference,
          bankTransferAmount: transferData.bankTransferAmount,
          bankTransferDate: transferData.bankTransferDate,
          notes: transferData.notes ?? existingMilestone.notes,
          updatedAt: new Date(),
        })
        .where(eq(projectMilestones.id, milestoneId))
        .returning();

      // ✅ TRANSACTIONAL LOGGING (Critical)
      await logMilestoneActivityInTransaction(
        milestoneId,
        existingMilestone.projectId,
        'bank_transfer_recorded',
        recordedBy,
        tx,
        'approved',
        'approved',
        {
          bankTransferReference: transferData.bankTransferReference,
          bankTransferAmount: transferData.bankTransferAmount,
          bankTransferDate: transferData.bankTransferDate,
        },
        undefined,
        req
      );

      return updatedMilestone;
    });

    return { success: true, milestone: result };
  } catch (error: any) {
    console.error("❌ Error recording bank transfer:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Disburse milestone - Burns NGNTS and updates project NAV
 * Transition: approved → disbursed
 * CRITICAL: Transactional audit logging
 * IMPORTANT: Burn happens AFTER DB commit to maintain blockchain/DB consistency
 */
export async function disburseMilestone(
  milestoneId: string,
  disbursedBy: string,
  ngntsBurned: string,
  req?: Request
): Promise<{ success: true; milestone: SelectProjectMilestone; burnTxHash: string; newNAV: string } | { success: false; error: string }> {
  try {
    // Import dependencies dynamically to avoid circular dependencies
    const { burnNGNTS } = await import("./ngntsOps");
    const { recalculateLPTokenPrice } = await import("./lpAllocationLib");
    const { platformWallets } = await import("@shared/schema");

    // First, prepare and validate in a DB transaction
    const prepResult = await db.transaction(async (tx) => {
      // Get milestone with project details
      const [milestone] = await tx
        .select({
          milestone: projectMilestones,
          project: projects,
        })
        .from(projectMilestones)
        .leftJoin(projects, eq(projectMilestones.projectId, projects.id))
        .where(eq(projectMilestones.id, milestoneId))
        .for("update")
        .limit(1);

      if (!milestone || !milestone.project) {
        throw new Error("Milestone or project not found");
      }

      if (milestone.milestone.status !== "approved") {
        throw new Error("Only approved milestones can be disbursed");
      }

      // SECURITY: Idempotency check - prevent double-burn if Phase 3 previously failed
      if (milestone.milestone.stellarBurnTxHash) {
        throw new Error(
          `Milestone already has burn transaction ${milestone.milestone.stellarBurnTxHash}. Cannot disburse again.`
        );
      }

      if (!milestone.milestone.bankTransferReference) {
        throw new Error("Bank transfer must be recorded before disbursement");
      }

      if (!milestone.project.stellarProjectWalletSecretEncrypted) {
        throw new Error("Project wallet secret not found");
      }

      // Validate NAV bounds - can't burn more than current NAV
      const currentNAV = parseFloat(milestone.project.nav || "0");
      const burnedAmount = parseFloat(ngntsBurned);
      const lpTokensOutstanding = parseFloat(milestone.project.lpTokensOutstanding || "0");

      // SECURITY: Prevent NAV drain when no LP tokens outstanding
      if (lpTokensOutstanding <= 0) {
        throw new Error(
          "Cannot disburse milestone: no LP tokens outstanding. This would create invalid NAV state."
        );
      }

      if (burnedAmount > currentNAV) {
        throw new Error(
          `Cannot burn ${ngntsBurned} NGNTS - exceeds current NAV of ${currentNAV.toFixed(7)}`
        );
      }

      if (burnedAmount <= 0) {
        throw new Error("Burn amount must be positive");
      }

      const newNAV = currentNAV - burnedAmount;

      // Get Treasury wallet for NGNTS issuer public key
      const [treasury] = await tx
        .select()
        .from(platformWallets)
        .where(eq(platformWallets.walletType, "treasury"))
        .limit(1);

      if (!treasury) {
        throw new Error("Treasury wallet not found");
      }

      // Decrypt project wallet secret
      const { decrypt } = await import("./encryption");
      const walletSecret = decrypt(milestone.project.stellarProjectWalletSecretEncrypted);

      return {
        walletSecret,
        treasuryPublicKey: treasury.publicKey,
        projectId: milestone.milestone.projectId,
        milestoneId: milestone.milestone.id,
        currentNAV,
        newNAV: newNAV.toFixed(7),
      };
    });

    // Execute Stellar burn AFTER DB validation (outside transaction)
    // This ensures we don't burn if validation fails
    // Generate memo for audit trail (MSD = Milestone Disbursement)
    const memoId = prepResult.milestoneId.substring(0, 8);
    const burnTxHash = await burnNGNTS(
      prepResult.walletSecret,
      prepResult.treasuryPublicKey,
      ngntsBurned,
      `MSD-${memoId}`
    );

    // Now update database with burn confirmation
    const finalResult = await db.transaction(async (tx) => {
      // Re-check milestone status (ensure no concurrent changes)
      const [currentMilestone] = await tx
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.id, milestoneId))
        .for("update")
        .limit(1);

      if (!currentMilestone) {
        throw new Error("Milestone not found");
      }

      if (currentMilestone.status !== "approved") {
        throw new Error(
          `Milestone status changed during disbursement (now ${currentMilestone.status}). Burn succeeded but database not updated.`
        );
      }

      // Update milestone status with burn transaction hash
      const [updatedMilestone] = await tx
        .update(projectMilestones)
        .set({
          status: "disbursed",
          disbursedAt: new Date(),
          disbursedBy,
          ngntsBurned,
          stellarBurnTxHash: burnTxHash,
          updatedAt: new Date(),
        })
        .where(eq(projectMilestones.id, milestoneId))
        .returning();

      // Update project counters and NAV
      await tx
        .update(projects)
        .set({
          completedMilestones: sql`${projects.completedMilestones} + 1`,
          lastMilestoneDate: new Date(),
          nav: prepResult.newNAV,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, prepResult.projectId));

      // Recalculate LP token price after NAV change (inside transaction for atomicity)
      await recalculateLPTokenPrice(tx, prepResult.projectId);

      // ✅ TRANSACTIONAL LOGGING (Critical)
      await logMilestoneActivityInTransaction(
        milestoneId,
        prepResult.projectId,
        'disbursed',
        disbursedBy,
        tx,
        'approved',
        'disbursed',
        {
          ngntsBurned,
          burnTxHash,
          newNAV: prepResult.newNAV,
        },
        undefined,
        req
      );

      return updatedMilestone;
    });

    return {
      success: true,
      milestone: finalResult,
      burnTxHash,
      newNAV: prepResult.newNAV,
    };
  } catch (error: any) {
    console.error("❌ Error disbursing milestone:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get milestone statistics across all projects or for a specific project
 */
export async function getMilestoneStats(
  projectId?: string
): Promise<{ success: true; stats: any } | { success: false; error: string }> {
  try {
    const query = db
      .select({
        totalMilestones: sql<number>`COUNT(*)`,
        draftCount: sql<number>`COUNT(*) FILTER (WHERE ${projectMilestones.status} = 'draft')`,
        submittedCount: sql<number>`COUNT(*) FILTER (WHERE ${projectMilestones.status} = 'submitted')`,
        approvedCount: sql<number>`COUNT(*) FILTER (WHERE ${projectMilestones.status} = 'approved')`,
        disbursedCount: sql<number>`COUNT(*) FILTER (WHERE ${projectMilestones.status} = 'disbursed')`,
        rejectedCount: sql<number>`COUNT(*) FILTER (WHERE ${projectMilestones.status} = 'rejected')`,
        totalDisbursed: sql<string>`COALESCE(SUM(${projectMilestones.targetAmount}) FILTER (WHERE ${projectMilestones.status} = 'disbursed'), 0)`,
        totalNgntsBurned: sql<string>`COALESCE(SUM(${projectMilestones.ngntsBurned}), 0)`,
      })
      .from(projectMilestones);

    // Add WHERE clause only if projectId is provided
    const [stats] = projectId
      ? await query.where(eq(projectMilestones.projectId, projectId))
      : await query;

    return { success: true, stats };
  } catch (error: any) {
    console.error("❌ Error fetching milestone stats:", error);
    return { success: false, error: error.message };
  }
}
