import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { auditAdminActions } from "@shared/schema";
import { JWTPayload } from "../lib/jwt";

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * Audit middleware - Automatically logs admin actions to audit_admin_actions table
 * Should be applied to sensitive admin endpoints (NAV updates, cashflow operations, etc.)
 */
export function auditAction(action: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const adminId = req.user?.userId;

    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Extract target information from request
    const target: any = {
      type: action.split(":")[0], // e.g., "nav" from "nav:update"
      id: req.params.id || req.params.projectId || req.body.projectId,
      path: req.path,
      method: req.method,
    };

    // Extract details (request body for logging)
    const details: any = {
      requestBody: req.body,
      timestamp: new Date().toISOString(),
    };

    try {
      // Log the audit action before proceeding
      await db.insert(auditAdminActions).values({
        adminId,
        action,
        target,
        details,
      });

      // Continue to the actual route handler
      next();
    } catch (error: any) {
      console.error("Audit logging failed:", error);
      // Don't block the request if audit logging fails, but log the error
      next();
    }
  };
}

/**
 * Enhanced audit middleware with before/after state capture
 * Useful for operations that modify data (NAV updates, cashflow verification)
 */
export function auditActionWithState(action: string, fetchStateBefore?: (req: AuthenticatedRequest) => Promise<any>) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const adminId = req.user?.userId;

    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Capture state before operation
    let stateBefore: any = null;
    if (fetchStateBefore) {
      try {
        stateBefore = await fetchStateBefore(req);
      } catch (error) {
        console.error("Failed to fetch state before operation:", error);
      }
    }

    // Store original send function
    const originalSend = res.json.bind(res);

    // Override res.json to capture response and log audit after operation
    res.json = function (body: any) {
      const target: any = {
        type: action.split(":")[0],
        id: req.params.id || req.params.projectId || req.body.projectId,
        path: req.path,
        method: req.method,
      };

      const details: any = {
        before: stateBefore,
        after: body,
        requestBody: req.body,
        timestamp: new Date().toISOString(),
      };

      // Log audit action asynchronously (don't block response)
      db.insert(auditAdminActions)
        .values({
          adminId,
          action,
          target,
          details,
        })
        .catch((error) => {
          console.error("Audit logging failed:", error);
        });

      // Send the original response
      return originalSend(body);
    } as any;

    next();
  };
}
