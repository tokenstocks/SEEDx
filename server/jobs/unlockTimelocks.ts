import { db } from "../db";
import { projectTokenBalances, auditAdminActions } from "@shared/schema";
import { and, eq, lte, sql } from "drizzle-orm";

interface UnlockResult {
  success: boolean;
  unlockedCount: number;
  errors: string[];
}

export async function unlockExpiredTimelocks(adminId?: string): Promise<UnlockResult> {
  const result: UnlockResult = {
    success: false,
    unlockedCount: 0,
    errors: [],
  };

  try {
    const now = new Date();

    // Find all time-locked tokens where unlock date has passed
    const expiredTimelocks = await db
      .select()
      .from(projectTokenBalances)
      .where(
        and(
          eq(projectTokenBalances.lockType, "time_locked"),
          lte(projectTokenBalances.unlockDate, now)
        )
      );

    if (expiredTimelocks.length === 0) {
      result.success = true;
      return result;
    }

    // Process each expired timelock
    for (const balance of expiredTimelocks) {
      try {
        const lockedAmount = parseFloat(balance.lockedTokens);
        const liquidAmount = parseFloat(balance.liquidTokens);

        // Move locked tokens to liquid
        const newLiquidAmount = liquidAmount + lockedAmount;

        await db
          .update(projectTokenBalances)
          .set({
            liquidTokens: newLiquidAmount.toFixed(2),
            lockedTokens: "0.00",
            lockType: "none",
            lockReason: null,
            unlockDate: null,
            updatedAt: new Date(),
          })
          .where(eq(projectTokenBalances.id, balance.id));

        result.unlockedCount++;
      } catch (error) {
        result.errors.push(
          `Failed to unlock balance ${balance.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    result.success = result.errors.length === 0;

    // Create audit log if admin triggered this
    if (adminId) {
      await db.insert(auditAdminActions).values({
        adminId,
        action: "timelock_auto_unlock",
        target: {
          type: "timelock_unlock",
          count: result.unlockedCount,
        },
        details: {
          unlockedCount: result.unlockedCount,
          errors: result.errors,
        },
      });
    }

    return result;
  } catch (error) {
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

// Get count of tokens that will unlock soon (within next 30 days)
export async function getUpcomingUnlocks(): Promise<{
  count: number;
  totalTokens: string;
}> {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingUnlocks = await db
      .select({
        count: sql<number>`COUNT(*)`,
        totalTokens: sql<string>`COALESCE(SUM(CAST(${projectTokenBalances.lockedTokens} AS NUMERIC)), 0)`,
      })
      .from(projectTokenBalances)
      .where(
        and(
          eq(projectTokenBalances.lockType, "time_locked"),
          lte(projectTokenBalances.unlockDate, thirtyDaysFromNow)
        )
      );

    return {
      count: upcomingUnlocks[0]?.count || 0,
      totalTokens: upcomingUnlocks[0]?.totalTokens || "0",
    };
  } catch (error) {
    console.error("Error fetching upcoming unlocks:", error);
    return { count: 0, totalTokens: "0" };
  }
}
