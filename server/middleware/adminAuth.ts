import type { Request, Response, NextFunction } from "express";

/**
 * Middleware to check if the authenticated user has admin role
 * Must be used after the auth middleware
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // @ts-ignore - userId is added by auth middleware
  if (!req.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // @ts-ignore - user is added by auth middleware
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }

  next();
}
