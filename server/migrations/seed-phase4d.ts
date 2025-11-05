import { db } from "../db";
import {
  projectCashflows,
  tokenOrders,
  projectTokenBalances,
  lpCashflowAllocations,
  treasuryPoolTransactions,
  users,
  projects,
} from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Seed data for Phase 4-D:
 * - Demo cashflows for regenerative loop testing
 * - Token orders for marketplace testing
 * - LP holdings with different lock types
 */
export async function seedPhase4D() {
  console.log("🌱 Starting Phase 4-D seed data migration...");

  try {
    // Get test users
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@tokenstocks.local"))
      .limit(1);

    const [lpInvestor] = await db
      .select()
      .from(users)
      .where(eq(users.email, "lp.investor@tokenstocks.local"))
      .limit(1);

    const [regularInvestor] = await db
      .select()
      .from(users)
      .where(eq(users.email, "investor@tokenstocks.local"))
      .limit(1);

    if (!adminUser || !lpInvestor || !regularInvestor) {
      console.log("⚠️  Required users not found, skipping seed data");
      return;
    }

    // Get test project
    const [testProject] = await db
      .select()
      .from(projects)
      .limit(1);

    if (!testProject) {
      console.log("⚠️  No projects found, skipping seed data");
      return;
    }

    // 1. Create demo cashflows for regenerative loop
    console.log("📊 Creating demo cashflows...");
    
    const cashflowsToCreate = [
      {
        projectId: testProject.id,
        cashflowType: "revenue" as const,
        amountNgnts: "500000.00",
        description: "Q1 2025 Agricultural Yield Revenue",
        verificationStatus: "verified" as const,
        verifiedBy: adminUser.id,
        verifiedAt: new Date(),
        processed: false,
      },
      {
        projectId: testProject.id,
        cashflowType: "revenue" as const,
        amountNgnts: "350000.00",
        description: "Q2 2025 Export Sales",
        verificationStatus: "verified" as const,
        verifiedBy: adminUser.id,
        verifiedAt: new Date(),
        processed: false,
      },
      {
        projectId: testProject.id,
        cashflowType: "expense" as const,
        amountNgnts: "120000.00",
        description: "Q1 Operational Expenses",
        verificationStatus: "verified" as const,
        verifiedBy: adminUser.id,
        verifiedAt: new Date(),
        processed: false,
      },
    ];

    for (const cashflow of cashflowsToCreate) {
      await db.insert(projectCashflows).values(cashflow);
    }
    console.log(`✅ Created ${cashflowsToCreate.length} demo cashflows`);

    // 2. Create LP holdings with different lock types
    console.log("🔒 Creating LP holdings with lock policies...");

    // Check if LP investor already has holdings
    const existingBalance = await db
      .select()
      .from(projectTokenBalances)
      .where(eq(projectTokenBalances.userId, lpInvestor.id))
      .limit(1);

    if (existingBalance.length === 0) {
      // No lock (liquid tokens)
      await db.insert(projectTokenBalances).values({
        userId: lpInvestor.id,
        projectId: testProject.id,
        tokenAmount: "5000.00",
        liquidTokens: "5000.00",
        lockedTokens: "0.00",
        lockType: "none",
        lockReason: null,
        unlockDate: null,
      });

      console.log("✅ Created liquid LP holdings (5000 tokens)");
    }

    // Time-locked tokens (unlocks in 30 days)
    const unlockDate30Days = new Date();
    unlockDate30Days.setDate(unlockDate30Days.getDate() + 30);

    await db.insert(projectTokenBalances).values({
      userId: lpInvestor.id,
      projectId: testProject.id,
      tokenAmount: "3000.00",
      liquidTokens: "0.00",
      lockedTokens: "3000.00",
      lockType: "time_locked",
      lockReason: "Q1 2025 LP Allocation - 30 day lock",
      unlockDate: unlockDate30Days,
    });

    console.log("✅ Created time-locked LP holdings (3000 tokens, unlocks in 30 days)");

    // Time-locked tokens (unlocks in 90 days)
    const unlockDate90Days = new Date();
    unlockDate90Days.setDate(unlockDate90Days.getDate() + 90);

    await db.insert(projectTokenBalances).values({
      userId: lpInvestor.id,
      projectId: testProject.id,
      tokenAmount: "2000.00",
      liquidTokens: "0.00",
      lockedTokens: "2000.00",
      lockType: "time_locked",
      lockReason: "Q2 2025 LP Allocation - 90 day lock",
      unlockDate: unlockDate90Days,
    });

    console.log("✅ Created time-locked LP holdings (2000 tokens, unlocks in 90 days)");

    // Permanent lock
    await db.insert(projectTokenBalances).values({
      userId: lpInvestor.id,
      projectId: testProject.id,
      tokenAmount: "1000.00",
      liquidTokens: "0.00",
      lockedTokens: "1000.00",
      lockType: "permanent",
      lockReason: "Founder Grant - Permanent Lock",
      unlockDate: null,
    });

    console.log("✅ Created permanently locked LP holdings (1000 tokens)");

    // 3. Create token orders for marketplace
    console.log("📈 Creating marketplace token orders...");

    const ordersToCreate = [
      // Buy orders
      {
        userId: regularInvestor.id,
        projectId: testProject.id,
        orderType: "buy" as const,
        tokenAmount: "100.000000",
        pricePerToken: "105.00",
        status: "open" as const,
      },
      {
        userId: regularInvestor.id,
        projectId: testProject.id,
        orderType: "buy" as const,
        tokenAmount: "250.000000",
        pricePerToken: "102.00",
        status: "open" as const,
      },
      // Sell orders
      {
        userId: lpInvestor.id,
        projectId: testProject.id,
        orderType: "sell" as const,
        tokenAmount: "150.000000",
        pricePerToken: "98.00",
        status: "open" as const,
      },
      {
        userId: lpInvestor.id,
        projectId: testProject.id,
        orderType: "sell" as const,
        tokenAmount: "200.000000",
        pricePerToken: "100.00",
        status: "open" as const,
      },
    ];

    for (const order of ordersToCreate) {
      await db.insert(tokenOrders).values(order);
    }
    console.log(`✅ Created ${ordersToCreate.length} marketplace orders`);

    console.log("✅ Phase 4-D seed data migration completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding Phase 4-D data:", error);
    throw error;
  }
}

// Run if executed directly
seedPhase4D()
  .then(() => {
    console.log("✅ Seed completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  });
