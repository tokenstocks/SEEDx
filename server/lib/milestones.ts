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
