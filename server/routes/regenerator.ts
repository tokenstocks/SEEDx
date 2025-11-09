import { Router, Request, Response } from "express";
import { db } from "../db";
import {
  users,
  transactions,
  projectTokenBalances,
  projects,
  secondaryMarketOrders,
} from "@shared/schema";
import { authMiddleware } from "../middleware/auth";
import { eq, and, sql, desc, or } from "drizzle-orm";

const router = Router();

/**
 * Middleware to check if user is a Regenerator (server-side validation)
 */
const regeneratorMiddleware = async (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // Server-side validation: Query database for user's Regenerator status
    const [user] = await db
      .select({ isPrimer: users.isPrimer })
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    // Regenerators are users who are NOT Primers
    if (!user || user.isPrimer) {
      res.status(403).json({ error: "Forbidden: Not a Regenerator user" });
      return;
    }

    next();
  } catch (error) {
    console.error("Regenerator verification error:", error);
    res.status(500).json({ error: "Failed to verify Regenerator status" });
  }
};

/**
 * GET /api/regenerator/stats
 * Get Regenerator portfolio statistics
 */
router.get("/stats", authMiddleware, regeneratorMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = req.user.userId;

    // Get total invested (sum of investment transactions)
    const [investmentStats] = await db
      .select({
        totalInvested: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "investment")
        )
      );

    // Get total cashflow received (sum of return transactions)
    const [cashflowStats] = await db
      .select({
        totalCashflow: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "return")
        )
      );

    // Get token balances across all projects
    const tokenBalances = await db
      .select({
        projectId: projectTokenBalances.projectId,
        tokenAmount: projectTokenBalances.tokenAmount,
      })
      .from(projectTokenBalances)
      .where(
        and(
          eq(projectTokenBalances.userId, userId),
          sql`${projectTokenBalances.tokenAmount} > 0`
        )
      );

    const totalTokensOwned = tokenBalances.reduce((sum, balance) => {
      return sum + parseFloat(balance.tokenAmount || "0");
    }, 0);

    const activeProjectsCount = tokenBalances.filter(b => parseFloat(b.tokenAmount || "0") > 0).length;

    res.json({
      totalInvested: parseFloat(investmentStats?.totalInvested || "0"),
      totalCashflowReceived: parseFloat(cashflowStats?.totalCashflow || "0"),
      totalTokensOwned: totalTokensOwned,
      activeProjects: activeProjectsCount,
    });
  } catch (error) {
    console.error("Get Regenerator stats error:", error);
    res.status(500).json({ error: "Failed to get statistics" });
  }
});

/**
 * GET /api/regenerator/portfolio
 * Get Regenerator token holdings with project details
 */
router.get("/portfolio", authMiddleware, regeneratorMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = req.user.userId;

    // Get all token holdings with project details
    const holdings = await db
      .select({
        tokenAmount: projectTokenBalances.tokenAmount,
        liquidTokens: projectTokenBalances.liquidTokens,
        lockedTokens: projectTokenBalances.lockedTokens,
        projectId: projects.id,
        projectName: projects.name,
        projectLocation: projects.location,
        projectStatus: projects.projectStatus,
        tokenSymbol: projects.tokenSymbol,
        tokenIssuer: projects.tokenIssuer,
        currentNav: projects.navPerToken,
      })
      .from(projectTokenBalances)
      .leftJoin(projects, eq(projectTokenBalances.projectId, projects.id))
      .where(
        and(
          eq(projectTokenBalances.userId, userId),
          sql`${projectTokenBalances.tokenAmount} > 0`
        )
      )
      .orderBy(desc(projectTokenBalances.tokenAmount));

    res.json(holdings);
  } catch (error) {
    console.error("Get Regenerator portfolio error:", error);
    res.status(500).json({ error: "Failed to get portfolio" });
  }
});

/**
 * GET /api/regenerator/timeline
 * Get chronological activity feed for this Regenerator
 */
router.get("/timeline", authMiddleware, regeneratorMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = req.user.userId;

    // Fetch all relevant transactions
    const transactionsData = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          or(
            eq(transactions.type, "investment"),  // Token purchases
            eq(transactions.type, "return"),      // Cashflow distributions
            eq(transactions.type, "deposit"),     // Wallet deposits
            eq(transactions.type, "withdrawal")   // Wallet withdrawals
          )
        )
      )
      .orderBy(desc(transactions.createdAt))
      .limit(50);

    // Fetch marketplace orders (if any)
    const ordersData = await db
      .select({
        id: secondaryMarketOrders.id,
        orderType: secondaryMarketOrders.orderType,
        tokenSymbol: secondaryMarketOrders.tokenSymbol,
        amount: secondaryMarketOrders.amount,
        pricePerToken: secondaryMarketOrders.pricePerToken,
        status: secondaryMarketOrders.status,
        createdAt: secondaryMarketOrders.createdAt,
        completedAt: secondaryMarketOrders.filledAt,
        projectName: projects.name,
      })
      .from(secondaryMarketOrders)
      .leftJoin(projects, eq(secondaryMarketOrders.tokenSymbol, projects.tokenSymbol))
      .where(eq(secondaryMarketOrders.userId, userId))
      .orderBy(desc(secondaryMarketOrders.createdAt))
      .limit(20);

    // Build timeline events array
    const timelineEvents: any[] = [];

    // Add transaction events (flattened structure for frontend)
    transactionsData.forEach((tx) => {
      if (tx.type === "investment") {
        // Token purchase
        timelineEvents.push({
          type: "token_purchase",
          timestamp: tx.createdAt,
          amount: tx.amount,
          tokenSymbol: tx.tokenSymbol,
          projectName: tx.description,
          txHash: tx.stellarTxHash,
        });
      } else if (tx.type === "return") {
        // Cashflow distribution
        timelineEvents.push({
          type: "cashflow_received",
          timestamp: tx.createdAt,
          amount: tx.amount,
          tokenSymbol: tx.tokenSymbol,
          projectName: tx.description,
          txHash: tx.stellarTxHash,
        });
      } else if (tx.type === "deposit") {
        timelineEvents.push({
          type: "wallet_deposit",
          timestamp: tx.createdAt,
          amount: tx.amount,
          currency: tx.currency,
          txHash: tx.stellarTxHash,
        });
      } else if (tx.type === "withdrawal") {
        timelineEvents.push({
          type: "wallet_withdrawal",
          timestamp: tx.createdAt,
          amount: tx.amount,
          currency: tx.currency,
          txHash: tx.stellarTxHash,
        });
      }
    });

    // Add marketplace order events (flattened structure for frontend)
    ordersData.forEach((order) => {
      // Add order placed event
      timelineEvents.push({
        type: "market_order_placed",
        timestamp: order.createdAt,
        orderType: order.orderType,
        tokenSymbol: order.tokenSymbol,
        amount: order.amount,
        pricePerToken: order.pricePerToken,
        status: order.status,
      });

      // Add order filled event if completed
      if (order.status === "filled" && order.completedAt) {
        timelineEvents.push({
          type: "market_order_filled",
          timestamp: order.completedAt,
          orderType: order.orderType,
          tokenSymbol: order.tokenSymbol,
          amount: order.amount,
          pricePerToken: order.pricePerToken,
        });
      } else if (order.status === "cancelled" && order.completedAt) {
        timelineEvents.push({
          type: "market_order_cancelled",
          timestamp: order.completedAt,
          orderType: order.orderType,
          tokenSymbol: order.tokenSymbol,
          amount: order.amount,
        });
      }
    });

    // Sort all events by timestamp (newest first)
    timelineEvents.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

    res.json(timelineEvents);
  } catch (error) {
    console.error("Get Regenerator timeline error:", error);
    res.status(500).json({ error: "Failed to get timeline" });
  }
});

export default router;
