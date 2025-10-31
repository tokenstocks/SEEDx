import type { Express } from "express";
import { createServer, type Server } from "http";
import authRoutes from "./routes/auth";
import kycRoutes from "./routes/kyc";
import walletRoutes from "./routes/wallets";
import adminRoutes from "./routes/admin";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register auth routes
  app.use("/api/auth", authRoutes);
  
  // Register user/KYC routes
  app.use("/api/users", kycRoutes);
  
  // Register wallet routes
  app.use("/api/wallets", walletRoutes);
  
  // Register admin routes
  app.use("/api/admin", adminRoutes);

  const httpServer = createServer(app);

  return httpServer;
}
