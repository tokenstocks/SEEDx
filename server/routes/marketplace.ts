import { Router } from "express";
import { db } from "../db";
import { tokenOrders, projects, projectTokenBalances, users, projectNavHistory } from "@shared/schema";
import { createTokenOrderSchema } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Apply auth middleware to all marketplace routes
router.use(authMiddleware);

// Create a new token order (buy or sell)
router.post("/orders", async (req, res) => {
  try {
    // @ts-ignore - userId is added by auth middleware
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate request body
    const validation = createTokenOrderSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: validation.error.errors,
      });
    }

    const { projectId, orderType, tokenAmount, pricePerToken } = validation.data;

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // For sell orders, verify user has sufficient tokens
    if (orderType === "sell") {
      const balance = await db.query.projectTokenBalances.findFirst({
        where: and(
          eq(projectTokenBalances.userId, userId),
          eq(projectTokenBalances.projectId, projectId)
        ),
      });

      const availableTokens = parseFloat(balance?.liquidTokens || "0");
      const requestedTokens = parseFloat(tokenAmount);

      if (availableTokens < requestedTokens) {
        return res.status(400).json({
          error: "Insufficient liquid tokens",
          available: availableTokens,
          requested: requestedTokens,
        });
      }
    }

    // Create the order
    const [newOrder] = await db
      .insert(tokenOrders)
      .values({
        userId,
        projectId,
        orderType,
        tokenAmount,
        pricePerToken,
        status: "open",
      })
      .returning();

    return res.status(201).json({
      message: "Order created successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return res.status(500).json({
      error: "Failed to create order",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// List token orders for a project
router.get("/orders/list", async (req, res) => {
  try {
    const { projectId, status, orderType } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    // Build query conditions
    const conditions = [eq(tokenOrders.projectId, projectId as string)];

    if (status && typeof status === "string") {
      conditions.push(eq(tokenOrders.status, status as any));
    }

    if (orderType && typeof orderType === "string") {
      conditions.push(eq(tokenOrders.orderType, orderType as any));
    }

    // Fetch orders with user information
    const orders = await db
      .select({
        id: tokenOrders.id,
        userId: tokenOrders.userId,
        projectId: tokenOrders.projectId,
        orderType: tokenOrders.orderType,
        tokenAmount: tokenOrders.tokenAmount,
        pricePerToken: tokenOrders.pricePerToken,
        status: tokenOrders.status,
        createdAt: tokenOrders.createdAt,
        updatedAt: tokenOrders.updatedAt,
        userName: users.firstName,
      })
      .from(tokenOrders)
      .leftJoin(users, eq(tokenOrders.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(tokenOrders.createdAt));

    return res.status(200).json({ orders });
  } catch (error) {
    console.error("Error listing orders:", error);
    return res.status(500).json({
      error: "Failed to fetch orders",
    });
  }
});

// Get user's own orders
router.get("/orders/my", async (req, res) => {
  try {
    // @ts-ignore - userId is added by auth middleware
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { projectId } = req.query;

    const conditions = [eq(tokenOrders.userId, userId)];
    if (projectId) {
      conditions.push(eq(tokenOrders.projectId, projectId as string));
    }

    const orders = await db
      .select({
        id: tokenOrders.id,
        projectId: tokenOrders.projectId,
        orderType: tokenOrders.orderType,
        tokenAmount: tokenOrders.tokenAmount,
        pricePerToken: tokenOrders.pricePerToken,
        status: tokenOrders.status,
        createdAt: tokenOrders.createdAt,
        updatedAt: tokenOrders.updatedAt,
        projectName: projects.name,
        tokenSymbol: projects.tokenSymbol,
      })
      .from(tokenOrders)
      .leftJoin(projects, eq(tokenOrders.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(desc(tokenOrders.createdAt));

    return res.status(200).json({ orders });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return res.status(500).json({
      error: "Failed to fetch orders",
    });
  }
});

// Cancel an order
router.delete("/orders/:id", async (req, res) => {
  try {
    // @ts-ignore - userId is added by auth middleware
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const orderId = req.params.id;

    if (!orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }

    // Verify order exists and belongs to user
    const order = await db.query.tokenOrders.findFirst({
      where: eq(tokenOrders.id, orderId),
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.userId !== userId) {
      return res.status(403).json({ error: "Forbidden: Not your order" });
    }

    if (order.status !== "open") {
      return res.status(400).json({
        error: "Cannot cancel order",
        reason: `Order is already ${order.status}`,
      });
    }

    // Update order status to cancelled
    const [updatedOrder] = await db
      .update(tokenOrders)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(tokenOrders.id, orderId))
      .returning();

    return res.status(200).json({
      message: "Order cancelled successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return res.status(500).json({
      error: "Failed to cancel order",
    });
  }
});

// Match opposing orders (buy/sell) at NAV price
router.post("/orders/match", async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    // Get latest NAV for the project
    const latestNav = await db.query.projectNavHistory.findFirst({
      where: eq(projectNavHistory.projectId, projectId),
      orderBy: (navHistory, { desc }) => [desc(navHistory.effectiveAt)],
    });

    if (!latestNav) {
      return res.status(400).json({
        error: "No NAV found for project",
      });
    }

    const navPrice = parseFloat(latestNav.navPerToken);

    // Get open buy orders
    const buyOrders = await db
      .select()
      .from(tokenOrders)
      .where(
        and(
          eq(tokenOrders.projectId, projectId),
          eq(tokenOrders.status, "open"),
          eq(tokenOrders.orderType, "buy")
        )
      )
      .orderBy(desc(tokenOrders.createdAt));

    // Get open sell orders
    const sellOrders = await db
      .select()
      .from(tokenOrders)
      .where(
        and(
          eq(tokenOrders.projectId, projectId),
          eq(tokenOrders.status, "open"),
          eq(tokenOrders.orderType, "sell")
        )
      )
      .orderBy(desc(tokenOrders.createdAt));

    const matches: any[] = [];

    // Match orders at NAV price
    for (const buyOrder of buyOrders) {
      for (const sellOrder of sellOrders) {
        const buyPrice = parseFloat(buyOrder.pricePerToken);
        const sellPrice = parseFloat(sellOrder.pricePerToken);

        // Orders match if buy price >= NAV and sell price <= NAV
        if (buyPrice >= navPrice && sellPrice <= navPrice) {
          const buyAmount = parseFloat(buyOrder.tokenAmount);
          const sellAmount = parseFloat(sellOrder.tokenAmount);
          const matchAmount = Math.min(buyAmount, sellAmount);

          // Execute the match atomically with transaction wrapping
          try {
            await db.transaction(async (tx) => {
              // Transfer tokens from seller to buyer
              const sellerBalance = await tx.query.projectTokenBalances.findFirst({
                where: and(
                  eq(projectTokenBalances.userId, sellOrder.userId),
                  eq(projectTokenBalances.projectId, projectId)
                ),
              });

              const buyerBalance = await tx.query.projectTokenBalances.findFirst({
                where: and(
                  eq(projectTokenBalances.userId, buyOrder.userId),
                  eq(projectTokenBalances.projectId, projectId)
                ),
              });

              if (!sellerBalance || parseFloat(sellerBalance.liquidTokens) < matchAmount) {
                // Seller doesn't have enough liquid tokens - rollback and skip
                throw new Error("Insufficient seller balance");
              }

              // Update seller's balance (reduce liquid tokens)
              const newSellerLiquid = parseFloat(sellerBalance.liquidTokens) - matchAmount;
              const newSellerTotal = parseFloat(sellerBalance.tokenAmount) - matchAmount;

              await tx
                .update(projectTokenBalances)
                .set({
                  liquidTokens: newSellerLiquid.toFixed(2),
                  tokenAmount: newSellerTotal.toFixed(2),
                  updatedAt: new Date(),
                })
                .where(eq(projectTokenBalances.id, sellerBalance.id));

              // Update buyer's balance (add liquid tokens)
              if (buyerBalance) {
                const newBuyerLiquid = parseFloat(buyerBalance.liquidTokens) + matchAmount;
                const newBuyerTotal = parseFloat(buyerBalance.tokenAmount) + matchAmount;

                await tx
                  .update(projectTokenBalances)
                  .set({
                    liquidTokens: newBuyerLiquid.toFixed(2),
                    tokenAmount: newBuyerTotal.toFixed(2),
                    updatedAt: new Date(),
                  })
                  .where(eq(projectTokenBalances.id, buyerBalance.id));
              } else {
                // Create new balance for buyer
                await tx.insert(projectTokenBalances).values({
                  userId: buyOrder.userId,
                  projectId,
                  tokenAmount: matchAmount.toFixed(2),
                  liquidTokens: matchAmount.toFixed(2),
                  lockedTokens: "0.00",
                  lockType: "none",
                });
              }

              // Update buy order
              const remainingBuy = buyAmount - matchAmount;
              if (remainingBuy <= 0) {
                await tx
                  .update(tokenOrders)
                  .set({ status: "filled", updatedAt: new Date() })
                  .where(eq(tokenOrders.id, buyOrder.id));
              } else {
                await tx
                  .update(tokenOrders)
                  .set({
                    tokenAmount: remainingBuy.toFixed(6),
                    updatedAt: new Date(),
                  })
                  .where(eq(tokenOrders.id, buyOrder.id));
              }

              // Update sell order
              const remainingSell = sellAmount - matchAmount;
              if (remainingSell <= 0) {
                await tx
                  .update(tokenOrders)
                  .set({ status: "filled", updatedAt: new Date() })
                  .where(eq(tokenOrders.id, sellOrder.id));
              } else {
                await tx
                  .update(tokenOrders)
                  .set({
                    tokenAmount: remainingSell.toFixed(6),
                    updatedAt: new Date(),
                  })
                  .where(eq(tokenOrders.id, sellOrder.id));
              }
            });

            // Only record match if transaction succeeded
            matches.push({
              buyOrderId: buyOrder.id,
              sellOrderId: sellOrder.id,
              matchedAmount: matchAmount,
              matchedPrice: navPrice,
            });
          } catch (error) {
            console.error("Error executing match:", error);
            // Transaction rolled back - continue to next order pair
          }
        }
      }
    }

    return res.status(200).json({
      message: `Matched ${matches.length} orders`,
      matches,
      navPrice,
    });
  } catch (error) {
    console.error("Error matching orders:", error);
    return res.status(500).json({
      error: "Failed to match orders",
    });
  }
});

export default router;
