import { db } from "../db";
import { 
  projectCashflows, 
  treasuryPoolTransactions, 
  lpCashflowAllocations,
  users,
  projectNavHistory,
  auditAdminActions,
  platformWallets
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

interface RegenerationResult {
  success: boolean;
  processedCashflows: number;
  totalAmount: string;
  allocations: {
    treasury: string;
    lpShare: string;
    reinvest: string;
    fees: string;
  };
  errors: string[];
}

export async function runRegenerativeLoop(adminId: string): Promise<RegenerationResult> {
  const result: RegenerationResult = {
    success: false,
    processedCashflows: 0,
    totalAmount: "0.00",
    allocations: {
      treasury: "0.00",
      lpShare: "0.00",
      reinvest: "0.00",
      fees: "0.00",
    },
    errors: [],
  };

  try {
    // Fetch all verified, unprocessed cashflows
    const unprocessedCashflows = await db
      .select()
      .from(projectCashflows)
      .where(
        and(
          eq(projectCashflows.status, "verified"),
          eq(projectCashflows.processed, false)
        )
      );

    if (unprocessedCashflows.length === 0) {
      result.success = true;
      return result;
    }

    // Get all LP investors for distribution
    const lpInvestors = await db
      .select()
      .from(users)
      .where(eq(users.isLpInvestor, true));

    if (lpInvestors.length === 0) {
      result.errors.push("No LP investors found for distribution");
    }

    let totalProcessed = 0;
    let totalTreasury = 0;
    let totalLpShare = 0;
    let totalReinvest = 0;
    let totalFees = 0;

    // Process each cashflow
    for (const cashflow of unprocessedCashflows) {
      try {
        const amount = parseFloat(cashflow.amountNgnts);
        
        // Calculate allocations (60/20/10/10)
        const treasuryAmount = amount * 0.60;
        const lpShareAmount = amount * 0.20;
        const reinvestAmount = amount * 0.10;
        const feeAmount = amount * 0.10;

        // 1. Allocate 60% to treasury pool
        await db.insert(treasuryPoolTransactions).values({
          type: "inflow",
          amountNgnts: treasuryAmount.toFixed(2),
          sourceProjectId: cashflow.projectId,
          sourceCashflowId: cashflow.id,
          metadata: {
            notes: "60% of verified project cashflow",
            cashflowSource: cashflow.source || "Project revenue",
            regenerationCycle: true,
          },
        });

        // 2. Allocate 20% to LP investors (split equally among all LP investors)
        if (lpInvestors.length > 0) {
          const lpSharePerInvestor = lpShareAmount / lpInvestors.length;
          
          for (const lpInvestor of lpInvestors) {
            await db.insert(lpCashflowAllocations).values({
              cashflowId: cashflow.id,
              lpUserId: lpInvestor.id,
              shareAmount: lpSharePerInvestor.toFixed(2),
              sharePercentage: "20.00",
            });
          }
        }

        // 3. Allocate 10% to project reinvestment (tracked as treasury metadata)
        await db.insert(treasuryPoolTransactions).values({
          type: "allocation",
          amountNgnts: reinvestAmount.toFixed(2),
          sourceProjectId: cashflow.projectId,
          sourceCashflowId: cashflow.id,
          metadata: {
            notes: "10% reinvestment allocation for project growth",
            allocationType: "reinvestment",
            regenerationCycle: true,
          },
        });

        // 4. Allocate 10% to platform fees
        await db.insert(treasuryPoolTransactions).values({
          type: "fee",
          amountNgnts: feeAmount.toFixed(2),
          sourceProjectId: cashflow.projectId,
          sourceCashflowId: cashflow.id,
          metadata: {
            notes: "10% platform operational fee",
            regenerationCycle: true,
          },
        });

        // 5. Mark cashflow as processed
        await db
          .update(projectCashflows)
          .set({ processed: true })
          .where(eq(projectCashflows.id, cashflow.id));

        // Update totals
        totalProcessed += amount;
        totalTreasury += treasuryAmount;
        totalLpShare += lpShareAmount;
        totalReinvest += reinvestAmount;
        totalFees += feeAmount;

        result.processedCashflows++;
      } catch (error) {
        result.errors.push(`Failed to process cashflow ${cashflow.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Update result
    result.totalAmount = totalProcessed.toFixed(2);
    result.allocations.treasury = totalTreasury.toFixed(2);
    result.allocations.lpShare = totalLpShare.toFixed(2);
    result.allocations.reinvest = totalReinvest.toFixed(2);
    result.allocations.fees = totalFees.toFixed(2);
    result.success = result.errors.length === 0;

    // Create audit log
    await db.insert(auditAdminActions).values({
      adminId,
      action: "regeneration_cycle_executed",
      target: {
        type: "regenerative_loop",
        cashflowsProcessed: result.processedCashflows,
      },
      details: {
        totalAmount: result.totalAmount,
        allocations: result.allocations,
        errors: result.errors,
      },
    });

    return result;
  } catch (error) {
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

export async function getTreasuryBalance(): Promise<string> {
  try {
    // Sum all inflows minus all outflows
    const inflowResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${treasuryPoolTransactions.amountNgnts} AS NUMERIC)), 0)`,
      })
      .from(treasuryPoolTransactions)
      .where(eq(treasuryPoolTransactions.type, "inflow"));

    const allocationResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${treasuryPoolTransactions.amountNgnts} AS NUMERIC)), 0)`,
      })
      .from(treasuryPoolTransactions)
      .where(eq(treasuryPoolTransactions.type, "allocation"));

    const buybackResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${treasuryPoolTransactions.amountNgnts} AS NUMERIC)), 0)`,
      })
      .from(treasuryPoolTransactions)
      .where(eq(treasuryPoolTransactions.type, "buyback"));

    const inflow = parseFloat(inflowResult[0]?.total || "0");
    const allocation = parseFloat(allocationResult[0]?.total || "0");
    const buyback = parseFloat(buybackResult[0]?.total || "0");

    const balance = inflow - allocation - buyback;
    return balance.toFixed(2);
  } catch (error) {
    console.error("Error calculating treasury balance:", error);
    return "0.00";
  }
}
