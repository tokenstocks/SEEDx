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
import lpRoutes from "./routes/lp";
import systemRoutes from "./routes/system";
import marketplaceRoutes from "./routes/marketplace";
import primerRoutes from "./routes/primer";
import regeneratorRoutes from "./routes/regenerator";
import settingsRoutes from "./routes/settings";
import lpAllocationsRoutes from "./routes/admin/lpAllocations";
import distributionRoutes from "./routes/admin/distributions";

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
  
  // Register LP investor routes
  app.use("/api/lp", lpRoutes);
  
  // Register Primer routes
  app.use("/api/primer", primerRoutes);
  
  // Register Regenerator routes
  app.use("/api/regenerator", regeneratorRoutes);
  
  // Register marketplace routes
  app.use("/api/marketplace", marketplaceRoutes);
  
  // Register admin routes
  app.use("/api/admin", adminRoutes);
  
  // Register admin LP allocations routes (Phase 2)
  app.use("/api/admin/lp-allocations", lpAllocationsRoutes);
  
  // Register admin distribution routes (Phase 4)
  app.use("/api/admin/distributions", distributionRoutes);
  
  // Register system routes (admin only)
  app.use("/api/system", systemRoutes);
  
  // Register platform settings routes (authenticated users)
  app.use("/api/settings", settingsRoutes);
  
  // Register setup/verification routes
  app.use("/api/setup", setupRoutes);
  
  // Register exchange rates routes (public)
  app.use("/api/exchange-rates", exchangeRatesRoutes);

  const httpServer = createServer(app);

  return httpServer;
}
