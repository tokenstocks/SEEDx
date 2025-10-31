import type { Express } from "express";
import { createServer, type Server } from "http";
import authRoutes from "./routes/auth";
import kycRoutes from "./routes/kyc";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register auth routes
  app.use("/api/auth", authRoutes);
  
  // Register user/KYC routes
  app.use("/api/users", kycRoutes);

  const httpServer = createServer(app);

  return httpServer;
}
