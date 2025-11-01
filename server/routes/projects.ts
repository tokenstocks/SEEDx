import { Router, Request, Response } from "express";
import multer from "multer";
import { db } from "../db";
import { projects } from "@shared/schema";
import { authMiddleware, requireAdmin } from "../middleware/auth";
import { uploadFile } from "../lib/supabase";
import { eq } from "drizzle-orm";

const router = Router();

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for PDFs
  },
  fileFilter: (req, file, cb) => {
    // Accept PDFs only
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files are allowed"));
      return;
    }
    cb(null, true);
  },
});

/**
 * GET /api/projects
 * List all active projects
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const allProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.status, "active"));

    res.json(allProjects);
  } catch (error: any) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

/**
 * GET /api/projects/:id
 * Get project details by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json(project);
  } catch (error: any) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

/**
 * POST /api/projects/:id/documents
 * Upload project teaser document (PDF)
 * Requires admin authentication
 */
router.post(
  "/:id/documents",
  authMiddleware,
  requireAdmin,
  upload.single("document"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      // Check if project exists
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      // Upload file to Supabase Storage
      const fileName = `${id}-teaser-${Date.now()}.pdf`;
      const path = `projects/${fileName}`;
      const documentUrl = await uploadFile("project-documents", path, file.buffer, file.mimetype);

      // Add document URL to project's documents array
      const existingDocuments = project.documents || [];
      const updatedDocuments = [...existingDocuments, documentUrl];

      // Update project
      const [updatedProject] = await db
        .update(projects)
        .set({
          documents: updatedDocuments,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, id))
        .returning();

      res.json({
        message: "Document uploaded successfully",
        documentUrl,
        project: updatedProject,
      });
    } catch (error: any) {
      console.error("Error uploading project document:", error);
      res.status(500).json({ error: error.message || "Failed to upload document" });
    }
  }
);

export default router;
