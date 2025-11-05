import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth";
import { runRegenerativeLoop, getTreasuryBalance } from "../jobs/regenerativeLoop";
import { unlockExpiredTimelocks, getUpcomingUnlocks } from "../jobs/unlockTimelocks";

const router = Router();

// Run regenerative loop (admin only)
router.get("/run-regeneration", requireAdmin, async (req, res) => {
  try {
    // @ts-ignore - userId is added by auth middleware
    const adminId = req.userId;

    // Execute regenerative loop
    const result = await runRegenerativeLoop(adminId);

    if (!result.success) {
      return res.status(400).json({
        message: "Regeneration completed with errors",
        processedCashflows: result.processedCashflows,
        totalAmount: result.totalAmount,
        allocations: result.allocations,
        errors: result.errors,
      });
    }

    return res.status(200).json({
      message: `Successfully processed ${result.processedCashflows} cashflows`,
      processedCashflows: result.processedCashflows,
      totalAmount: result.totalAmount,
      allocations: result.allocations,
    });
  } catch (error) {
    console.error("Error running regeneration:", error);
    return res.status(500).json({
      error: "Failed to run regeneration cycle",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Get treasury pool balance (admin only)
router.get("/treasury-balance", requireAdmin, async (req, res) => {
  try {
    const balance = await getTreasuryBalance();
    
    return res.status(200).json({
      balance,
      currency: "NGNTS",
    });
  } catch (error) {
    console.error("Error fetching treasury balance:", error);
    return res.status(500).json({
      error: "Failed to fetch treasury balance",
    });
  }
});

// Unlock expired time-locked tokens (admin only)
router.post("/unlock-timelocks", requireAdmin, async (req, res) => {
  try {
    // @ts-ignore - userId is added by auth middleware
    const adminId = req.userId;

    const result = await unlockExpiredTimelocks(adminId);

    if (!result.success) {
      return res.status(400).json({
        message: "Unlock completed with errors",
        unlockedCount: result.unlockedCount,
        errors: result.errors,
      });
    }

    return res.status(200).json({
      message: `Successfully unlocked ${result.unlockedCount} time-locked balances`,
      unlockedCount: result.unlockedCount,
    });
  } catch (error) {
    console.error("Error unlocking timelocks:", error);
    return res.status(500).json({
      error: "Failed to unlock timelocks",
    });
  }
});

// Get upcoming unlocks (admin only)
router.get("/upcoming-unlocks", requireAdmin, async (req, res) => {
  try {
    const upcoming = await getUpcomingUnlocks();
    
    return res.status(200).json(upcoming);
  } catch (error) {
    console.error("Error fetching upcoming unlocks:", error);
    return res.status(500).json({
      error: "Failed to fetch upcoming unlocks",
    });
  }
});

export default router;
