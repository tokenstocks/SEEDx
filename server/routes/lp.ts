import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { authMiddleware } from "../middleware/auth";
import { projectTokenBalances, projects, users, investments, projectCashflows, projectNavHistory } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

/**
 * GET /api/lp/portfolio
 * Get LP investor's complete portfolio with liquid/locked token breakdown
 * Protected route - requires authentication and LP investor status
 */
router.get("/portfolio", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Check if user is an LP investor
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user?.isLpInvestor) {
      res.status(403).json({ error: "Access denied. LP investor status required." });
      return;
    }

    // Fetch portfolio with liquid/locked breakdown
    const portfolio = await db
      .select({
        id: projectTokenBalances.id,
        projectId: projectTokenBalances.projectId,
        projectName: projects.name,
        tokenSymbol: projects.tokenSymbol,
        tokenAmount: projectTokenBalances.tokenAmount,
        liquidTokens: projectTokenBalances.liquidTokens,
        lockedTokens: projectTokenBalances.lockedTokens,
        lockType: projectTokenBalances.lockType,
        lockReason: projectTokenBalances.lockReason,
        unlockDate: projectTokenBalances.unlockDate,
        pricePerToken: projects.pricePerToken,
        stellarAssetCode: projects.stellarAssetCode,
        stellarIssuerPublicKey: projects.stellarIssuerPublicKey,
        updatedAt: projectTokenBalances.updatedAt,
      })
      .from(projectTokenBalances)
      .leftJoin(projects, eq(projectTokenBalances.projectId, projects.id))
      .where(eq(projectTokenBalances.userId, userId))
      .orderBy(desc(projectTokenBalances.updatedAt));

    // Get current NAV for each project
    const portfolioWithNav = await Promise.all(
      portfolio.map(async (holding) => {
        const currentNav = await db.query.projectNavHistory.findFirst({
          where: and(
            eq(projectNavHistory.projectId, holding.projectId),
            eq(projectNavHistory.isSuperseded, false)
          ),
          orderBy: desc(projectNavHistory.effectiveAt),
        });

        const navPerToken = currentNav ? parseFloat(currentNav.navPerToken) : parseFloat(holding.pricePerToken || "0");
        const liquidValue = parseFloat(holding.liquidTokens) * navPerToken;
        const lockedValue = parseFloat(holding.lockedTokens) * navPerToken;
        const totalValue = liquidValue + lockedValue;

        return {
          ...holding,
          navPerToken: navPerToken.toFixed(2),
          liquidValue: liquidValue.toFixed(2),
          lockedValue: lockedValue.toFixed(2),
          totalValue: totalValue.toFixed(2),
        };
      })
    );

    // Calculate portfolio totals
    const totalLiquidValue = portfolioWithNav.reduce((sum, h) => sum + parseFloat(h.liquidValue), 0);
    const totalLockedValue = portfolioWithNav.reduce((sum, h) => sum + parseFloat(h.lockedValue), 0);
    const totalPortfolioValue = totalLiquidValue + totalLockedValue;

    res.json({
      holdings: portfolioWithNav,
      summary: {
        totalLiquidValue: totalLiquidValue.toFixed(2),
        totalLockedValue: totalLockedValue.toFixed(2),
        totalPortfolioValue: totalPortfolioValue.toFixed(2),
        currency: "NGN",
      },
    });
  } catch (error: any) {
    console.error("Error fetching LP portfolio:", error);
    res.status(500).json({ error: "Failed to fetch LP portfolio" });
  }
});

/**
 * GET /api/lp/nav-history
 * Get historical NAV data for LP portfolio growth charts
 * Protected route - requires authentication and LP investor status
 * Query params: projectId (optional) - filter by specific project
 */
router.get("/nav-history", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { projectId } = req.query;

    // Check if user is an LP investor
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user?.isLpInvestor) {
      res.status(403).json({ error: "Access denied. LP investor status required." });
      return;
    }

    // Get user's holdings to filter NAV history
    let holdings;
    if (projectId && typeof projectId === 'string') {
      holdings = await db.query.projectTokenBalances.findMany({
        where: and(
          eq(projectTokenBalances.userId, userId),
          eq(projectTokenBalances.projectId, projectId)
        ),
      });
    } else {
      holdings = await db.query.projectTokenBalances.findMany({
        where: eq(projectTokenBalances.userId, userId),
      });
    }

    if (holdings.length === 0) {
      res.json({ navHistory: [] });
      return;
    }

    const projectIds = holdings.map(h => h.projectId);

    // Fetch NAV history for user's projects
    const navHistory = await db
      .select({
        id: projectNavHistory.id,
        projectId: projectNavHistory.projectId,
        projectName: projects.name,
        tokenSymbol: projects.tokenSymbol,
        navPerToken: projectNavHistory.navPerToken,
        effectiveAt: projectNavHistory.effectiveAt,
        source: projectNavHistory.source,
        isSuperseded: projectNavHistory.isSuperseded,
      })
      .from(projectNavHistory)
      .leftJoin(projects, eq(projectNavHistory.projectId, projects.id))
      .where(
        projectId && typeof projectId === 'string'
          ? eq(projectNavHistory.projectId, projectId)
          : sql`${projectNavHistory.projectId} = ANY(${projectIds})`
      )
      .orderBy(desc(projectNavHistory.effectiveAt));

    // Calculate portfolio value at each NAV point
    const navHistoryWithValues = navHistory.map((nav) => {
      const holding = holdings.find(h => h.projectId === nav.projectId);
      if (!holding) return nav;

      const navPerToken = parseFloat(nav.navPerToken);
      const liquidValue = parseFloat(holding.liquidTokens) * navPerToken;
      const lockedValue = parseFloat(holding.lockedTokens) * navPerToken;
      const totalValue = liquidValue + lockedValue;

      return {
        ...nav,
        liquidTokens: holding.liquidTokens,
        lockedTokens: holding.lockedTokens,
        liquidValue: liquidValue.toFixed(2),
        lockedValue: lockedValue.toFixed(2),
        totalValue: totalValue.toFixed(2),
      };
    });

    res.json({ navHistory: navHistoryWithValues });
  } catch (error: any) {
    console.error("Error fetching NAV history:", error);
    res.status(500).json({ error: "Failed to fetch NAV history" });
  }
});

/**
 * GET /api/lp/cashflow-earnings
 * Get LP's share of project revenue cashflows
 * Protected route - requires authentication and LP investor status
 */
router.get("/cashflow-earnings", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Check if user is an LP investor
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user?.isLpInvestor) {
      res.status(403).json({ error: "Access denied. LP investor status required." });
      return;
    }

    // Get user's project holdings to determine LP allocation
    const holdings = await db.query.projectTokenBalances.findMany({
      where: eq(projectTokenBalances.userId, userId),
    });

    if (holdings.length === 0) {
      res.json({ cashflowEarnings: [], totalEarnings: "0.00" });
      return;
    }

    const projectIds = holdings.map(h => h.projectId);

    // Fetch project cashflows (LP typically gets 20% allocation based on platform settings)
    const cashflows = await db
      .select({
        id: projectCashflows.id,
        projectId: projectCashflows.projectId,
        projectName: projects.name,
        amountNgnts: projectCashflows.amountNgnts,
        source: projectCashflows.source,
        status: projectCashflows.status,
        verifiedBy: projectCashflows.verifiedBy,
        verifiedAt: projectCashflows.verifiedAt,
        createdAt: projectCashflows.createdAt,
      })
      .from(projectCashflows)
      .leftJoin(projects, eq(projectCashflows.projectId, projects.id))
      .where(sql`${projectCashflows.projectId} = ANY(${projectIds})`)
      .orderBy(desc(projectCashflows.createdAt));

    // Calculate LP allocation (20% of each cashflow as per platform settings default)
    const LP_ALLOCATION_PERCENTAGE = 0.20;
    
    const cashflowEarnings = cashflows.map((cashflow) => {
      const holding = holdings.find(h => h.projectId === cashflow.projectId);
      const lpPortion = parseFloat(cashflow.amountNgnts) * LP_ALLOCATION_PERCENTAGE;
      
      return {
        ...cashflow,
        lpAllocation: LP_ALLOCATION_PERCENTAGE,
        lpPortionAmount: lpPortion.toFixed(2),
        userLiquidTokens: holding?.liquidTokens || "0.00",
        userLockedTokens: holding?.lockedTokens || "0.00",
        isRedeemable: holding && parseFloat(holding.liquidTokens) > 0,
      };
    });

    // Calculate total earnings
    const totalEarnings = cashflowEarnings.reduce(
      (sum, cf) => sum + parseFloat(cf.lpPortionAmount),
      0
    );

    res.json({
      cashflowEarnings,
      totalEarnings: totalEarnings.toFixed(2),
      currency: "NGN",
    });
  } catch (error: any) {
    console.error("Error fetching cashflow earnings:", error);
    res.status(500).json({ error: "Failed to fetch cashflow earnings" });
  }
});

/**
 * GET /api/lp/profile
 * Get LP-specific metrics and profile information
 * Protected route - requires authentication and LP investor status
 */
router.get("/profile", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Get user details
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user?.isLpInvestor) {
      res.status(403).json({ error: "Access denied. LP investor status required." });
      return;
    }

    // Get all investments
    const userInvestments = await db.query.investments.findMany({
      where: eq(investments.userId, userId),
    });

    const totalInvested = userInvestments.reduce(
      (sum, inv) => sum + parseFloat(inv.amount),
      0
    );

    // Get portfolio with current values
    const holdings = await db
      .select({
        projectId: projectTokenBalances.projectId,
        tokenAmount: projectTokenBalances.tokenAmount,
        liquidTokens: projectTokenBalances.liquidTokens,
        lockedTokens: projectTokenBalances.lockedTokens,
        pricePerToken: projects.pricePerToken,
      })
      .from(projectTokenBalances)
      .leftJoin(projects, eq(projectTokenBalances.projectId, projects.id))
      .where(eq(projectTokenBalances.userId, userId));

    // Calculate current values with NAV
    let totalCurrentValue = 0;
    let totalRedeemableBalance = 0;
    let totalLockedGrantBalance = 0;

    for (const holding of holdings) {
      const currentNav = await db.query.projectNavHistory.findFirst({
        where: and(
          eq(projectNavHistory.projectId, holding.projectId),
          eq(projectNavHistory.isSuperseded, false)
        ),
        orderBy: desc(projectNavHistory.effectiveAt),
      });

      const navPerToken = currentNav
        ? parseFloat(currentNav.navPerToken)
        : parseFloat(holding.pricePerToken || "0");

      const liquidValue = parseFloat(holding.liquidTokens) * navPerToken;
      const lockedValue = parseFloat(holding.lockedTokens) * navPerToken;

      totalRedeemableBalance += liquidValue;
      totalLockedGrantBalance += lockedValue;
      totalCurrentValue += liquidValue + lockedValue;
    }

    // Calculate NAV growth
    const navGrowth = totalInvested > 0
      ? ((totalCurrentValue - totalInvested) / totalInvested) * 100
      : 0;

    res.json({
      profile: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        kycStatus: user.kycStatus,
        isLpInvestor: user.isLpInvestor,
      },
      metrics: {
        totalInvested: totalInvested.toFixed(2),
        totalCurrentValue: totalCurrentValue.toFixed(2),
        redeemableBalance: totalRedeemableBalance.toFixed(2),
        lockedGrantBalance: totalLockedGrantBalance.toFixed(2),
        overallNavGrowth: navGrowth.toFixed(2) + "%",
        projectsInvestedIn: holdings.length,
        totalInvestments: userInvestments.length,
      },
      currency: "NGN",
    });
  } catch (error: any) {
    console.error("Error fetching LP profile:", error);
    res.status(500).json({ error: "Failed to fetch LP profile" });
  }
});

export default router;
