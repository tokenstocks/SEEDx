import { db } from "../db";
import { 
  projectCashflows, 
  treasuryPoolTransactions, 
  lpCashflowAllocations,
  lpPoolTransactions,
  users,
  projectNavHistory,
  auditAdminActions,
  platformWallets,
  primerContributions,
  pendingRegeneratorAllocations
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

interface RegenerationResult {
  success: boolean;
  processedCashflows: number;
  totalAmount: string;
  allocations: {
    regenerators: string;
    lpPool: string;
    treasury: string;
    projectReinvest: string;
  };
  errors: string[];
}

export async function runRegenerativeLoop(adminId: string): Promise<RegenerationResult> {
  const result: RegenerationResult = {
    success: false,
    processedCashflows: 0,
    totalAmount: "0.00",
    allocations: {
      regenerators: "0.00",
      lpPool: "0.00",
      treasury: "0.00",
      projectReinvest: "0.00",
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

    // Get all LP investors (Primers) for distribution
    const lpInvestors = await db
      .select()
      .from(users)
      .where(eq(users.isPrimer, true));

    // Cache LP investor contributions ONCE (performance optimization - avoids O(N×M) queries)
    // Calculate each investor's contribution and total LP Pool capital before processing cashflows
    const lpContributionsMap = new Map<string, number>();
    let totalLpPoolCapital = 0;

    for (const lpInvestor of lpInvestors) {
      const [contributions] = await db
        .select({
          total: sql<string>`COALESCE(SUM(${primerContributions.amountNgnts}), 0)`,
        })
        .from(primerContributions)
        .where(
          and(
            eq(primerContributions.primerId, lpInvestor.id),
            eq(primerContributions.status, "approved")
          )
        );
      
      const amount = parseFloat(contributions?.total || "0");
      if (amount > 0) {
        lpContributionsMap.set(lpInvestor.id, amount);
        totalLpPoolCapital += amount;
      }
    }

    // Validate LP Pool capital exists before processing cashflows
    if (totalLpPoolCapital === 0) {
      result.errors.push("Cannot process cashflows: No approved LP Pool capital available for 30% allocation. Cashflows will remain unprocessed until LP investors contribute capital.");
      result.success = false;
      return result;
    }

    let totalProcessed = 0;
    let totalRegenerators = 0;
    let totalLpPool = 0;
    let totalTreasury = 0;
    let totalProjectReinvest = 0;

    // Process each cashflow
    for (const cashflow of unprocessedCashflows) {
      try {
        // Calculate amounts for revenue cashflows (40/30/20/10 split)
        // Note: All cashflows in current schema are treated as revenue
        const amount = parseFloat(cashflow.amountNgnts);
        const regeneratorAmount = amount * 0.40;  // 40% to token holders (distributed proportionally)
        const lpPoolAmount = amount * 0.30;       // 30% to LP Pool (REGENERATION!)
        const treasuryAmount = amount * 0.20;     // 20% to treasury
        const projectReinvestAmount = amount * 0.10; // 10% to project reinvestment

        // Wrap all operations for this cashflow in a transaction for atomicity
        await db.transaction(async (tx) => {

          // 1. Track 40% regenerator allocation in dedicated holding table (Phase 4 will distribute)
          // Keeps regenerator reserves separate from treasury ledger
          await tx.insert(pendingRegeneratorAllocations).values({
            cashflowId: cashflow.id,
            projectId: cashflow.projectId,
            amountNgnts: regeneratorAmount.toFixed(2),
            status: "pending", // Phase 4 will update to "distributed"
          });

          // 2. Allocate 30% to LP Pool (REGENERATIVE CAPITAL FLOW!)
          
          // 2a. Record pool-level inflow in LP Pool transactions ledger
          await tx.insert(lpPoolTransactions).values({
            type: "inflow",
            amountNgnts: lpPoolAmount.toFixed(2),
            sourceProjectId: cashflow.projectId,
            sourceCashflowId: cashflow.id,
            metadata: {
              notes: "30% of verified project cashflow to LP Pool",
              cashflowSource: cashflow.source || "Project revenue",
              regenerationCycle: true,
              distributedToInvestors: lpContributionsMap.size,
            },
          });

          // 2b. Record individual allocations to LP investors
          if (totalLpPoolCapital > 0 && lpContributionsMap.size > 0) {
            for (const lpInvestor of lpInvestors) {
              const investorContribution = lpContributionsMap.get(lpInvestor.id) || 0;
              
              // Skip investors with zero contribution (already filtered in map)
              if (investorContribution <= 0) continue;
              
              const investorPoolShare = investorContribution / totalLpPoolCapital;
              const investorCashflowShare = lpPoolAmount * investorPoolShare;
              const investorSharePercentage = investorPoolShare * 30; // Their % of the 30% pool
              
              await tx.insert(lpCashflowAllocations).values({
                cashflowId: cashflow.id,
                lpUserId: lpInvestor.id,
                shareAmount: investorCashflowShare.toFixed(2),
                sharePercentage: investorSharePercentage.toFixed(2),
              });
            }
          }

          // 3. Allocate 20% to treasury pool
          await tx.insert(treasuryPoolTransactions).values({
            type: "inflow",
            amountNgnts: treasuryAmount.toFixed(2),
            sourceProjectId: cashflow.projectId,
            sourceCashflowId: cashflow.id,
            metadata: {
              notes: "20% of verified project cashflow to treasury",
              cashflowSource: cashflow.source || "Project revenue",
              regenerationCycle: true,
            },
          });

          // 4. Allocate 10% to project reinvestment
          await tx.insert(treasuryPoolTransactions).values({
            type: "allocation",
            amountNgnts: projectReinvestAmount.toFixed(2),
            sourceProjectId: cashflow.projectId,
            sourceCashflowId: cashflow.id,
            metadata: {
              notes: "10% reinvestment allocation for project growth",
              allocationType: "project_reinvestment",
              regenerationCycle: true,
            },
          });

          // 5. Mark cashflow as processed
          await tx
            .update(projectCashflows)
            .set({ processed: true })
            .where(eq(projectCashflows.id, cashflow.id));
        });

        // Update totals
        totalProcessed += amount;
        totalRegenerators += regeneratorAmount;
        totalLpPool += lpPoolAmount;
        totalTreasury += treasuryAmount;
        totalProjectReinvest += projectReinvestAmount;

        result.processedCashflows++;
      } catch (error) {
        result.errors.push(`Failed to process cashflow ${cashflow.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Update result
    result.totalAmount = totalProcessed.toFixed(2);
    result.allocations.regenerators = totalRegenerators.toFixed(2);
    result.allocations.lpPool = totalLpPool.toFixed(2);
    result.allocations.treasury = totalTreasury.toFixed(2);
    result.allocations.projectReinvest = totalProjectReinvest.toFixed(2);
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
