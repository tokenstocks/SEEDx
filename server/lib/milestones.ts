import { db } from "../db";
import { projectMilestones, projects, type InsertProjectMilestone, type SelectProjectMilestone } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

/**
 * Phase 3.1: Milestone Foundation Library
 * Provides CRUD operations for project milestones with state management
 */

/**
 * Create a new milestone for a project
 * Uses transactional milestone number assignment with FOR UPDATE to prevent race conditions
 */
export async function createMilestone(
  projectId: string,
  milestoneData: {
    title: string;
    description?: string;
    targetAmount: string;
  }
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
 */
export async function updateMilestone(
  milestoneId: string,
  updates: {
    title?: string;
    description?: string;
    targetAmount?: string;
  }
): Promise<{ success: true; milestone: SelectProjectMilestone } | { success: false; error: string }> {
  try {
    const result = await db.transaction(async (tx) => {
      // Check if milestone exists and is in draft status
      const [existingMilestone] = await tx
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.id, milestoneId))
        .limit(1);

      if (!existingMilestone) {
        throw new Error("Milestone not found");
      }

      if (existingMilestone.status !== "draft") {
        throw new Error("Only draft milestones can be edited");
      }

      // Update milestone
      const [updatedMilestone] = await tx
        .update(projectMilestones)
        .set({
          title: updates.title ?? existingMilestone.title,
          description: updates.description ?? existingMilestone.description,
          targetAmount: updates.targetAmount ?? existingMilestone.targetAmount,
          updatedAt: new Date(),
        })
        .where(eq(projectMilestones.id, milestoneId))
        .returning();

      return updatedMilestone;
    });

    return { success: true, milestone: result };
  } catch (error: any) {
    console.error("❌ Error updating milestone:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a milestone (only allowed for draft status)
 * Updates project's totalMilestones count
 */
export async function deleteMilestone(
  milestoneId: string
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const result = await db.transaction(async (tx) => {
      // Check if milestone exists and is in draft status
      const [existingMilestone] = await tx
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.id, milestoneId))
        .limit(1);

      if (!existingMilestone) {
        throw new Error("Milestone not found");
      }

      if (existingMilestone.status !== "draft") {
        throw new Error("Only draft milestones can be deleted");
      }

      // Delete milestone
      await tx.delete(projectMilestones).where(eq(projectMilestones.id, milestoneId));

      // Update project's totalMilestones count
      await tx
        .update(projects)
        .set({
          totalMilestones: sql`${projects.totalMilestones} - 1`,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, existingMilestone.projectId));

      return "Milestone deleted successfully";
    });

    return { success: true, message: result };
  } catch (error: any) {
    console.error("❌ Error deleting milestone:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit milestone for approval
 * Transition: draft → submitted
 */
export async function submitMilestone(
  milestoneId: string,
  submittedBy: string
): Promise<{ success: true; milestone: SelectProjectMilestone } | { success: false; error: string }> {
  try {
    const result = await db.transaction(async (tx) => {
      // Check if milestone exists and is in draft status
      const [existingMilestone] = await tx
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.id, milestoneId))
        .limit(1);

      if (!existingMilestone) {
        throw new Error("Milestone not found");
      }

      if (existingMilestone.status !== "draft") {
        throw new Error("Only draft milestones can be submitted");
      }

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
 */
export async function approveMilestone(
  milestoneId: string,
  approvedBy: string
): Promise<{ success: true; milestone: SelectProjectMilestone } | { success: false; error: string }> {
  try {
    const result = await db.transaction(async (tx) => {
      // Check if milestone exists and is in submitted status
      const [existingMilestone] = await tx
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.id, milestoneId))
        .limit(1);

      if (!existingMilestone) {
        throw new Error("Milestone not found");
      }

      if (existingMilestone.status !== "submitted") {
        throw new Error("Only submitted milestones can be approved");
      }

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

    return { success: true, milestone: result };
  } catch (error: any) {
    console.error("❌ Error approving milestone:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject a milestone
 * Transition: submitted → rejected
 */
export async function rejectMilestone(
  milestoneId: string,
  approvedBy: string,
  notes?: string
): Promise<{ success: true; milestone: SelectProjectMilestone } | { success: false; error: string }> {
  try {
    const result = await db.transaction(async (tx) => {
      // Check if milestone exists and is in submitted status
      const [existingMilestone] = await tx
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.id, milestoneId))
        .limit(1);

      if (!existingMilestone) {
        throw new Error("Milestone not found");
      }

      if (existingMilestone.status !== "submitted") {
        throw new Error("Only submitted milestones can be rejected");
      }

      // Update status to rejected
      const [updatedMilestone] = await tx
        .update(projectMilestones)
        .set({
          status: "rejected",
          approvedBy, // Track who rejected it
          notes: notes ?? existingMilestone.notes,
          updatedAt: new Date(),
        })
        .where(eq(projectMilestones.id, milestoneId))
        .returning();

      return updatedMilestone;
    });

    return { success: true, milestone: result };
  } catch (error: any) {
    console.error("❌ Error rejecting milestone:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Record bank transfer details for approved milestone
 */
export async function recordBankTransfer(
  milestoneId: string,
  transferData: {
    bankTransferReference: string;
    bankTransferAmount: string;
    bankTransferDate: Date;
    notes?: string;
  }
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
 * IMPORTANT: Burn happens AFTER DB commit to maintain blockchain/DB consistency
 */
export async function disburseMilestone(
  milestoneId: string,
  disbursedBy: string,
  ngntsBurned: string
): Promise<{ success: true; milestone: SelectProjectMilestone; burnTxHash: string; newNAV: string } | { success: false; error: string }> {
  try {
    // Import dependencies dynamically to avoid circular dependencies
    const { burnNGNTS } = await import("./stellarLib");
    const { recalculateLPTokenPrice } = await import("./lpAllocationLib");

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

      if (!milestone.milestone.bankTransferReference) {
        throw new Error("Bank transfer must be recorded before disbursement");
      }

      if (!milestone.project.stellarWalletSecret) {
        throw new Error("Project wallet secret not found");
      }

      // Validate NAV bounds - can't burn more than current NAV
      const currentNAV = parseFloat(milestone.project.nav || "0");
      const burnedAmount = parseFloat(ngntsBurned);

      if (burnedAmount > currentNAV) {
        throw new Error(
          `Cannot burn ${ngntsBurned} NGNTS - exceeds current NAV of ${currentNAV.toFixed(7)}`
        );
      }

      if (burnedAmount <= 0) {
        throw new Error("Burn amount must be positive");
      }

      const newNAV = currentNAV - burnedAmount;

      return {
        walletSecret: milestone.project.stellarWalletSecret,
        projectId: milestone.milestone.projectId,
        currentNAV,
        newNAV: newNAV.toFixed(7),
      };
    });

    // Execute Stellar burn AFTER DB validation (outside transaction)
    // This ensures we don't burn if validation fails
    const burnResult = await burnNGNTS(prepResult.walletSecret, ngntsBurned);

    if (!burnResult.success) {
      throw new Error(`Failed to burn NGNTS: ${burnResult.error}`);
    }

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

      // Update milestone status
      const [updatedMilestone] = await tx
        .update(projectMilestones)
        .set({
          status: "disbursed",
          disbursedAt: new Date(),
          disbursedBy,
          ngntsBurned,
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

      return updatedMilestone;
    });

    // Recalculate LP token price after NAV change (outside transaction)
    await recalculateLPTokenPrice(prepResult.projectId);

    return {
      success: true,
      milestone: finalResult,
      burnTxHash: burnResult.txHash!,
      newNAV: prepResult.newNAV,
    };
  } catch (error: any) {
    console.error("❌ Error disbursing milestone:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get milestone statistics for a project
 */
export async function getMilestoneStats(
  projectId: string
): Promise<{ success: true; stats: any } | { success: false; error: string }> {
  try {
    const [stats] = await db
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
      .from(projectMilestones)
      .where(eq(projectMilestones.projectId, projectId));

    return { success: true, stats };
  } catch (error: any) {
    console.error("❌ Error fetching milestone stats:", error);
    return { success: false, error: error.message };
  }
}
