import { Request, Response, NextFunction } from "express";
import { verifyToken, JWTPayload } from "../lib/jwt";

// Extend Express Request type to include user and userId
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      userId?: string;
    }
  }
}

/**
 * Middleware to authenticate requests using JWT
 * Expects Authorization header: Bearer <token>
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyToken(token);

    if (!payload) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    req.user = payload;
    req.userId = payload.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: "Authentication failed" });
  }
}

// Export alias for consistency
export const authenticate = authMiddleware;

/**
 * Middleware to require admin role
 * Must be used after authMiddleware
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
}
