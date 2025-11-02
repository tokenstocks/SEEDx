import type { Express } from "express";
import { createServer, type Server } from "http";
import authRoutes from "./routes/auth";
import kycRoutes from "./routes/kyc";
import walletRoutes from "./routes/wallets";
import adminRoutes from "./routes/admin";
import projectRoutes from "./routes/projects";
import investmentRoutes from "./routes/investments";
import setupRoutes from "./routes/setup";
import exchangeRatesRoutes from "./routes/exchangeRates";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register auth routes
  app.use("/api/auth", authRoutes);
  
  // Register user/KYC routes
  app.use("/api/users", kycRoutes);
  
  // Register wallet routes
  app.use("/api/wallets", walletRoutes);
  
  // Register project routes
  app.use("/api/projects", projectRoutes);
  
  // Register investment routes
  app.use("/api/investments", investmentRoutes);
  
  // Register admin routes
  app.use("/api/admin", adminRoutes);
  
  // Register setup/verification routes
  app.use("/api/setup", setupRoutes);
  
  // Register exchange rates routes (public)
  app.use("/api/exchange-rates", exchangeRatesRoutes);

  const httpServer = createServer(app);

  return httpServer;
}
