import { Router } from "express";
import { db } from "../../db";
import { 
  projectMilestones,
  projects,
  insertProjectMilestoneSchema
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { 
  createMilestone, 
  getProjectMilestones, 
  getMilestoneById, 
  updateMilestone, 
  deleteMilestone, 
  submitMilestone 
} from "../../lib/milestones";
import { authenticate } from "../../middleware/auth";
import { requireAdmin } from "../../middleware/adminAuth";
import { z } from "zod";

const router = Router();

// Apply authentication middleware to ALL routes in this router
router.use(authenticate);

/**
 * POST /api/admin/milestones/projects/:projectId
 * Create a new milestone for a project (Admin only)
 */
router.post("/projects/:projectId", requireAdmin, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, targetAmount } = req.body;

    // Validation
    if (!title || !targetAmount) {
      return res.status(400).json({ error: "Title and target amount are required" });
    }

    if (parseFloat(targetAmount) <= 0) {
      return res.status(400).json({ error: "Target amount must be greater than zero" });
    }

    // Verify project exists
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Create milestone
    const result = await createMilestone(projectId, { title, description, targetAmount: targetAmount.toString() });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json({
      success: true,
      milestone: result.milestone
    });
  } catch (error: any) {
    console.error("❌ Error creating milestone:", error);
    return res.status(500).json({ error: "Failed to create milestone" });
  }
});

/**
 * GET /api/admin/milestones/projects/:projectId
 * Get all milestones for a project
 */
router.get("/projects/:projectId", requireAdmin, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify project exists
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const result = await getProjectMilestones(projectId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      milestones: result.milestones,
      project: {
        id: project.id,
        name: project.name,
        totalMilestones: project.totalMilestones,
        completedMilestones: project.completedMilestones
      }
    });
  } catch (error: any) {
    console.error("❌ Error fetching project milestones:", error);
    return res.status(500).json({ error: "Failed to fetch milestones" });
  }
});

/**
 * GET /api/admin/milestones/:milestoneId
 * Get a specific milestone by ID
 */
router.get("/:milestoneId", requireAdmin, async (req, res) => {
  try {
    const { milestoneId } = req.params;

    const result = await getMilestoneById(milestoneId);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    return res.json({
      success: true,
      milestone: result.milestone
    });
  } catch (error: any) {
    console.error("❌ Error fetching milestone:", error);
    return res.status(500).json({ error: "Failed to fetch milestone" });
  }
});

/**
 * PUT /api/admin/milestones/:milestoneId
 * Update a milestone (draft status only)
 */
router.put("/:milestoneId", requireAdmin, async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const { title, description, targetAmount } = req.body;

    // Validate targetAmount if provided
    if (targetAmount !== undefined && parseFloat(targetAmount) <= 0) {
      return res.status(400).json({ error: "Target amount must be greater than zero" });
    }

    const result = await updateMilestone(milestoneId, {
      title,
      description,
      targetAmount: targetAmount?.toString()
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      milestone: result.milestone
    });
  } catch (error: any) {
    console.error("❌ Error updating milestone:", error);
    return res.status(500).json({ error: "Failed to update milestone" });
  }
});

/**
 * DELETE /api/admin/milestones/:milestoneId
 * Delete a milestone (draft status only)
 */
router.delete("/:milestoneId", requireAdmin, async (req, res) => {
  try {
    const { milestoneId } = req.params;

    const result = await deleteMilestone(milestoneId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    console.error("❌ Error deleting milestone:", error);
    return res.status(500).json({ error: "Failed to delete milestone" });
  }
});

/**
 * POST /api/admin/milestones/:milestoneId/submit
 * Submit milestone for approval
 */
router.post("/:milestoneId/submit", requireAdmin, async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const adminId = req.userId!;

    const result = await submitMilestone(milestoneId, adminId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      milestone: result.milestone,
      message: "Milestone submitted for approval"
    });
  } catch (error: any) {
    console.error("❌ Error submitting milestone:", error);
    return res.status(500).json({ error: "Failed to submit milestone" });
  }
});

export default router;
