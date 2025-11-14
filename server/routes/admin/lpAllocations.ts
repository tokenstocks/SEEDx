import { Router } from "express";
import { db } from "../../db";
import { 
  projects, 
  lpProjectAllocations, 
  lpPoolTransactions, 
  platformWallets,
  systemErrors,
  auditAdminActions
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { transferAsset, getAssetBalance } from "../../lib/stellarOps";
import { createProjectWallet, getProjectWalletBalance, getProjectWalletDetails } from "../../lib/projectWallet";
import { requireAdmin } from "../../middleware/auth";

const router = Router();

/**
 * POST /api/admin/lp-allocations/allocate
 * Allocates LP Pool capital to a project
 * 
 * Phase 2: Transaction safety pattern
 * - Validates sufficient LP Pool balance
 * - Creates project wallet if first allocation
 * - Executes on-chain transfer (point of no return)
 * - Records in database with transaction safety
 * - Logs critical errors for manual reconciliation if DB fails after on-chain success
 */
router.post("/allocate", requireAdmin, async (req, res) => {
  try {
    const { projectId, amountNgnts } = req.body;
    const adminId = req.userId!;
    
    // Validation
    if (!projectId || !amountNgnts || amountNgnts <= 0) {
      return res.status(400).json({ error: "Invalid project or amount" });
    }
    
    // Get LP Pool wallet
    const [lpPoolWallet] = await db.select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "liquidity_pool"))
      .limit(1);
    
    if (!lpPoolWallet) {
      return res.status(500).json({ error: "LP Pool wallet not configured" });
    }
    
    // Get Treasury wallet (NGNTS issuer)
    const [treasuryWallet] = await db.select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "treasury_pool"))
      .limit(1);
    
    if (!treasuryWallet) {
      return res.status(500).json({ error: "Treasury wallet not configured" });
    }
    
    // Check LP Pool balance
    const lpPoolNgntsBalance = await getAssetBalance(
      lpPoolWallet.publicKey,
      "NGNTS",
      treasuryWallet.publicKey
    );
    const lpPoolBalance = parseFloat(lpPoolNgntsBalance || "0");
    
    if (lpPoolBalance < amountNgnts) {
      return res.status(400).json({ 
        error: "Insufficient LP Pool capital",
        available: lpPoolBalance,
        requested: amountNgnts
      });
    }
    
    // Get project
    const [project] = await db.select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Calculate allocation percentage for warning
    const allocationPercentage = (amountNgnts / lpPoolBalance) * 100;
    
    let projectWalletPublicKey = project.stellarProjectWalletPublicKey;
    let txHash: string | null = null;
    
    try {
      // Step 1: Create project wallet if this is first allocation (can fail safely)
      if (!projectWalletPublicKey) {
        console.log("🆕 First allocation - creating project wallet...");
        projectWalletPublicKey = await createProjectWallet(projectId);
      }
      
      // Step 2: Execute on-chain transfer (POINT OF NO RETURN)
      console.log(`🔄 Executing on-chain transfer of ${amountNgnts} NGNTS to project wallet...`);
      txHash = await transferAsset(
        lpPoolWallet.publicKey,
        projectWalletPublicKey,
        "NGNTS",
        treasuryWallet.publicKey,
        amountNgnts.toFixed(7)
      );
      console.log(`✅ On-chain transfer successful: ${txHash}`);
      
      // Step 3: Record in database (CRITICAL - must not fail)
      try {
        await db.transaction(async (tx) => {
          // Record LP Project Allocation
          await tx.insert(lpProjectAllocations).values({
            projectId,
            totalAmountNgnts: amountNgnts.toString(),
            allocatedBy: adminId,
            txHash,
            status: "confirmed",
          });
          
          // Update project capital tracking
          await tx.update(projects)
            .set({
              lpCapitalAllocated: sql`CAST(${projects.lpCapitalAllocated} AS NUMERIC) + ${amountNgnts}`
            })
            .where(eq(projects.id, projectId));
          
          // Record LP Pool outflow (pool-level transaction)
          await tx.insert(lpPoolTransactions).values({
            type: "outflow",
            amountNgnts: amountNgnts.toString(),
            sourceProjectId: projectId,
            metadata: {
              notes: `Allocated to ${project.name}`,
              allocatedBy: adminId,
              allocationPercentage: allocationPercentage.toFixed(2)
            },
          });
          
          // Audit log
          await tx.insert(auditAdminActions).values({
            adminId,
            action: "lp_capital_allocation",
            target: {
              type: "project",
              id: projectId,
              name: project.name
            },
            details: {
              amountNgnts,
              projectWallet: projectWalletPublicKey,
              lpPoolRemainingBalance: lpPoolBalance - amountNgnts,
              allocationPercentage: allocationPercentage.toFixed(2),
              txHash
            }
          });
        });
        
        console.log(`✅ Database records updated successfully`);
        
      } catch (dbError: any) {
        // 🚨 CRITICAL: On-chain succeeded but DB failed
        console.error(`🚨 CRITICAL ERROR: On-chain transfer succeeded but database update failed!`);
        console.error(`Transaction Hash: ${txHash}`);
        console.error(`Project: ${projectId} (${project.name})`);
        console.error(`Amount: ${amountNgnts} NGNTS`);
        console.error(`DB Error:`, dbError);
        
        // Log to error tracking table for manual reconciliation
        try {
          await db.insert(systemErrors).values({
            errorType: "allocation_db_failure",
            severity: "critical",
            txHash,
            projectId,
            amountNgnts: amountNgnts.toString(),
            errorMessage: `On-chain transfer succeeded (${txHash}) but database update failed: ${dbError.message}`,
          });
        } catch (logError) {
          console.error(`🚨 Failed to log critical error:`, logError);
        }
        
        // Return partial success (money moved, but needs manual reconciliation)
        return res.status(207).json({
          partialSuccess: true,
          txHash,
          projectWallet: projectWalletPublicKey,
          error: "On-chain transfer succeeded but database update failed. Transaction logged for manual reconciliation.",
          requiresManualReconciliation: true
        });
      }
      
      // Step 4: Success response
      const newBalance = await getProjectWalletBalance(projectId);
      
      return res.json({
        success: true,
        txHash,
        projectWallet: projectWalletPublicKey,
        newBalance,
        lpPoolRemainingBalance: lpPoolBalance - amountNgnts,
        warning: allocationPercentage > 50 
          ? `This allocation represents ${allocationPercentage.toFixed(1)}% of total LP Pool` 
          : null
      });
      
    } catch (error: any) {
      // On-chain transfer failed (safe - nothing happened)
      if (!txHash) {
        console.error("❌ Allocation failed before on-chain transfer:", error);
        return res.status(500).json({ 
          error: "Failed to allocate capital",
          details: error.message 
        });
      }
      
      // Unexpected error after on-chain transfer
      console.error("🚨 Unexpected error after on-chain transfer:", error);
      
      // Try to log the error
      try {
        await db.insert(systemErrors).values({
          errorType: "allocation_unexpected_error",
          severity: "critical",
          txHash,
          projectId,
          amountNgnts: amountNgnts.toString(),
          errorMessage: `Unexpected error after on-chain transfer: ${error.message}`,
        });
      } catch (logError) {
        console.error(`Failed to log error:`, logError);
      }
      
      return res.status(500).json({
        error: "Unexpected error after transfer",
        txHash,
        requiresManualReconciliation: true
      });
    }
    
  } catch (error: any) {
    console.error("❌ LP allocation error:", error);
    return res.status(500).json({ 
      error: "Failed to allocate capital",
      details: error.message 
    });
  }
});

/**
 * GET /api/admin/lp-allocations/project/:projectId
 * Gets allocation history and wallet details for a project
 */
router.get("/project/:projectId", requireAdmin, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Get project
    const [project] = await db.select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Get wallet details
    const walletDetails = await getProjectWalletDetails(projectId);
    
    // Get allocation history
    const allocations = await db.select()
      .from(lpProjectAllocations)
      .where(eq(lpProjectAllocations.projectId, projectId))
      .orderBy(sql`${lpProjectAllocations.allocationDate} DESC`);
    
    return res.json({
      project: {
        id: project.id,
        name: project.name,
        lpCapitalAllocated: project.lpCapitalAllocated,
        lpCapitalDeployed: project.lpCapitalDeployed
      },
      wallet: walletDetails,
      allocations
    });
    
  } catch (error: any) {
    console.error("❌ Error fetching project allocations:", error);
    return res.status(500).json({ error: "Failed to fetch allocations" });
  }
});

/**
 * GET /api/admin/lp-allocations/overview
 * Gets LP Pool overview and all project allocations
 */
router.get("/overview", requireAdmin, async (req, res) => {
  try {
    // Get LP Pool wallet
    const [lpPoolWallet] = await db.select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "liquidity_pool"))
      .limit(1);
    
    if (!lpPoolWallet) {
      return res.status(500).json({ error: "LP Pool wallet not configured" });
    }
    
    // Get Treasury wallet (NGNTS issuer)
    const [treasuryWallet] = await db.select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "treasury_pool"))
      .limit(1);
    
    if (!treasuryWallet) {
      return res.status(500).json({ error: "Treasury wallet not configured" });
    }
    
    // Get LP Pool NGNTS balance
    const lpPoolNgntsBalance = await getAssetBalance(
      lpPoolWallet.publicKey,
      "NGNTS",
      treasuryWallet.publicKey
    );
    const lpPoolNgnts = parseFloat(lpPoolNgntsBalance || "0");
    
    // Get total allocated across all projects
    const [totalAllocated] = await db.select({
      total: sql<number>`COALESCE(SUM(CAST(${projects.lpCapitalAllocated} AS NUMERIC)), 0)`
    })
    .from(projects);
    
    // Get all projects with allocations
    const projectsWithAllocations = await db.select({
      id: projects.id,
      name: projects.name,
      lpCapitalAllocated: projects.lpCapitalAllocated,
      lpCapitalDeployed: projects.lpCapitalDeployed,
      walletPublicKey: projects.stellarProjectWalletPublicKey,
      walletCreatedAt: projects.projectWalletCreatedAt
    })
    .from(projects)
    .where(sql`CAST(${projects.lpCapitalAllocated} AS NUMERIC) > 0`)
    .orderBy(sql`${projects.projectWalletCreatedAt} DESC NULLS LAST`);
    
    // Get current balances for each project
    const projectsWithBalances = await Promise.all(
      projectsWithAllocations.map(async (project) => {
        let currentBalance = 0;
        if (project.walletPublicKey) {
          try {
            currentBalance = await getProjectWalletBalance(project.id);
          } catch (error) {
            console.error(`Error getting balance for ${project.id}:`, error);
          }
        }
        return {
          ...project,
          currentBalance
        };
      })
    );
    
    return res.json({
      lpPool: {
        totalNgnts: lpPoolNgnts,
        totalAllocated: parseFloat(totalAllocated.total.toString()),
        unallocated: lpPoolNgnts,
        criticalAlert: lpPoolNgnts < 250000
      },
      projects: projectsWithBalances
    });
    
  } catch (error: any) {
    console.error("❌ Error fetching LP overview:", error);
    return res.status(500).json({ error: "Failed to fetch overview" });
  }
});

/**
 * GET /api/admin/lp-allocations/reconcile/:projectId
 * Compares on-chain balance vs database records
 * Phase 2: Balance reconciliation for detecting discrepancies
 */
router.get("/reconcile/:projectId", requireAdmin, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const [project] = await db.select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    if (!project.stellarProjectWalletPublicKey) {
      return res.status(404).json({ error: "Project wallet not found" });
    }
    
    // Get on-chain balance
    const onChainBalance = await getProjectWalletBalance(projectId);
    
    // Get database records
    const dbAllocated = parseFloat(project.lpCapitalAllocated || "0");
    const dbDeployed = parseFloat(project.lpCapitalDeployed || "0");
    const dbExpectedBalance = dbAllocated - dbDeployed;
    
    // Calculate discrepancy
    const discrepancy = onChainBalance - dbExpectedBalance;
    const discrepancyPercentage = dbExpectedBalance > 0 
      ? (discrepancy / dbExpectedBalance) * 100 
      : 0;
    
    // Flag if discrepancy > 1%
    const needsReconciliation = Math.abs(discrepancyPercentage) > 1;
    
    return res.json({
      projectId,
      projectName: project.name,
      onChainBalance,
      dbExpectedBalance,
      discrepancy,
      discrepancyPercentage: discrepancyPercentage.toFixed(2),
      needsReconciliation,
      status: needsReconciliation ? "⚠️ Discrepancy detected" : "✅ Balanced"
    });
    
  } catch (error: any) {
    console.error("❌ Reconciliation error:", error);
    return res.status(500).json({ error: "Reconciliation failed" });
  }
});

/**
 * GET /api/admin/lp-allocations/reconcile-all
 * Reconciles all projects with wallets
 * Phase 2: Bulk reconciliation for audit purposes
 */
router.get("/reconcile-all", requireAdmin, async (req, res) => {
  try {
    const projectsWithWallets = await db.select()
      .from(projects)
      .where(sql`${projects.stellarProjectWalletPublicKey} IS NOT NULL`);
    
    const reconciliationResults = await Promise.all(
      projectsWithWallets.map(async (project) => {
        try {
          const onChainBalance = await getProjectWalletBalance(project.id);
          const dbAllocated = parseFloat(project.lpCapitalAllocated || "0");
          const dbDeployed = parseFloat(project.lpCapitalDeployed || "0");
          const dbExpectedBalance = dbAllocated - dbDeployed;
          const discrepancy = onChainBalance - dbExpectedBalance;
          const discrepancyPercentage = dbExpectedBalance > 0 
            ? Math.abs(discrepancy / dbExpectedBalance) 
            : 0;
          
          return {
            projectId: project.id,
            projectName: project.name,
            onChainBalance,
            dbExpectedBalance,
            discrepancy,
            needsReconciliation: discrepancyPercentage > 0.01
          };
        } catch (error: any) {
          return {
            projectId: project.id,
            projectName: project.name,
            onChainBalance: 0,
            dbExpectedBalance: 0,
            discrepancy: 0,
            needsReconciliation: false,
            error: error.message
          };
        }
      })
    );
    
    const issuesFound = reconciliationResults.filter(r => r.needsReconciliation);
    
    return res.json({
      totalProjects: reconciliationResults.length,
      issuesFound: issuesFound.length,
      results: reconciliationResults,
      status: issuesFound.length === 0 
        ? "✅ All balanced" 
        : `⚠️ ${issuesFound.length} discrepancies found`
    });
    
  } catch (error: any) {
    console.error("❌ Bulk reconciliation error:", error);
    return res.status(500).json({ error: "Bulk reconciliation failed" });
  }
});

export default router;
