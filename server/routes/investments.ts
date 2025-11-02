import { Router, Request, Response } from "express";
import { db } from "../db";
import { 
  investments, 
  projects, 
  wallets, 
  projectTokenBalances,
  projectTokenLedger,
  users,
  trustlines,
  insertInvestmentSchema 
} from "@shared/schema";
import { authMiddleware } from "../middleware/auth";
import { eq, and, desc, sql } from "drizzle-orm";
import { ensureTrustline, transferAsset, recordTransaction } from "../lib/stellarOps";
import { decrypt } from "../lib/encryption";

const router = Router();

/**
 * POST /api/investments/create
 * Create a new investment (user purchases project tokens with NGN)
 * Protected route - requires authentication
 */
router.post("/create", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { projectId, amount } = req.body;

    // Validate input
    if (!projectId || !amount) {
      res.status(400).json({ error: "Project ID and amount are required" });
      return;
    }

    const investmentAmount = parseFloat(amount);
    if (isNaN(investmentAmount) || investmentAmount < 100) {
      res.status(400).json({ error: "Minimum investment is ₦100" });
      return;
    }

    // Get project details
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Check project status
    if (project.status !== "active") {
      res.status(400).json({ error: "Project is not accepting investments" });
      return;
    }

    // Check if project is on-chain synced
    if (!project.onChainSynced) {
      res.status(400).json({ 
        error: "Project tokens have not been minted on blockchain yet. Please contact admin." 
      });
      return;
    }

    // Calculate tokens to receive
    const pricePerToken = parseFloat(project.pricePerToken);
    const tokensToReceive = investmentAmount / pricePerToken;

    // Check if enough tokens available
    const tokensSold = parseFloat(project.tokensSold);
    const tokensIssued = parseFloat(project.tokensIssued);
    const tokensAvailable = tokensIssued - tokensSold;

    if (tokensToReceive > tokensAvailable) {
      res.status(400).json({ 
        error: `Only ${tokensAvailable.toFixed(2)} tokens available` 
      });
      return;
    }

    // Get user wallet and KYC info
    const [userData] = await db
      .select({
        wallet: wallets,
        kycStatus: users.kycStatus,
        totalInvestedNGN: users.totalInvestedNGN,
      })
      .from(wallets)
      .innerJoin(users, eq(wallets.userId, users.id))
      .where(eq(wallets.userId, userId))
      .limit(1);

    if (!userData || !userData.wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }

    const userWallet = userData.wallet;

    // Check KYC threshold for NGN investments (5M NGN limit without KYC approval)
    if (project.currency === "NGN") {
      const currentTotalInvested = parseFloat(userData.totalInvestedNGN);
      const newTotalInvested = currentTotalInvested + investmentAmount;
      const KYC_THRESHOLD = 5000000; // 5 million NGN

      if (newTotalInvested > KYC_THRESHOLD && userData.kycStatus !== "approved") {
        res.status(403).json({ 
          error: `NGN investment limit reached. You can invest up to ₦${KYC_THRESHOLD.toLocaleString()} without KYC approval. Current total: ₦${currentTotalInvested.toFixed(2)}. Please complete KYC verification to invest more.`,
          kycRequired: true,
          currentTotal: currentTotalInvested,
          limit: KYC_THRESHOLD
        });
        return;
      }
    }

    // Check balance based on project currency
    const projectCurrency = project.currency;
    let userBalance: number;
    let currencySymbol: string;

    if (projectCurrency === "NGN") {
      userBalance = parseFloat(userWallet.fiatBalance);
      currencySymbol = "₦";
    } else {
      // USDC or XLM - check cryptoBalances
      const cryptoBalances = userWallet.cryptoBalances as { USDC?: string; XLM?: string; [key: string]: string | undefined } || {};
      userBalance = parseFloat(cryptoBalances[projectCurrency] || "0");
      currencySymbol = projectCurrency === "USDC" ? "$" : "XLM";
    }

    if (userBalance < investmentAmount) {
      res.status(400).json({ 
        error: `Insufficient ${projectCurrency} balance. Available: ${currencySymbol}${userBalance.toFixed(2)}` 
      });
      return;
    }

    // Validate Stellar accounts exist
    if (!userWallet.cryptoWalletPublicKey) {
      res.status(400).json({ error: "User Stellar wallet not initialized" });
      return;
    }

    if (!project.stellarDistributionPublicKey || !project.stellarDistributionSecretKeyEncrypted) {
      res.status(400).json({ error: "Project distribution account not configured" });
      return;
    }

    if (!project.stellarAssetCode || !project.stellarIssuerPublicKey) {
      res.status(400).json({ error: "Project token not configured" });
      return;
    }

    console.log(`💰 Processing investment: ${userId.substring(0, 8)}... investing ₦${investmentAmount} in ${project.name}`);

    let trustlineTxHash: string | undefined;
    let transferTxHash: string;

    // Step 1: Ensure user has trustline for project token
    try {
      const trustlineResult = await ensureTrustline(
        userWallet.cryptoWalletPublicKey,
        project.stellarAssetCode,
        project.stellarIssuerPublicKey
      );

      if (trustlineResult !== "EXISTING_TRUSTLINE") {
        trustlineTxHash = trustlineResult;
        console.log(`   ✓ Trustline created: ${trustlineTxHash}`);
      } else {
        console.log(`   ✓ Trustline already exists`);
      }
    } catch (error: any) {
      console.error("❌ Trustline setup failed:", error);
      res.status(500).json({ 
        error: `Failed to setup trustline: ${error.message}` 
      });
      return;
    }

    // Step 2: Transfer tokens from distribution account to user
    try {
      transferTxHash = await transferAsset(
        project.stellarDistributionPublicKey,
        userWallet.cryptoWalletPublicKey,
        project.stellarAssetCode,
        project.stellarIssuerPublicKey,
        tokensToReceive.toFixed(7) // Stellar uses 7 decimal places
      );

      console.log(`   ✓ Tokens transferred: ${transferTxHash}`);
    } catch (error: any) {
      console.error("❌ Token transfer failed:", error);
      res.status(500).json({ 
        error: `Failed to transfer tokens: ${error.message}` 
      });
      return;
    }

    // Step 3: Update database in a transaction
    try {
      await db.transaction(async (tx) => {
        // Record trustline in database if new trustline was created (check for existing first to avoid duplicates)
        if (trustlineTxHash && trustlineTxHash !== "EXISTING_TRUSTLINE") {
          const [existingTrustline] = await tx
            .select()
            .from(trustlines)
            .where(
              and(
                eq(trustlines.userId, userId),
                eq(trustlines.projectId, projectId)
              )
            )
            .limit(1);

          if (!existingTrustline) {
            await tx.insert(trustlines).values({
              userId,
              projectId,
              assetCode: project.stellarAssetCode!,
              issuerPublicKey: project.stellarIssuerPublicKey!,
              status: "active",
              txHash: trustlineTxHash,
            });
          }
        }

        // Clone crypto balances to avoid reference issues
        const updatedCryptoBalances = JSON.parse(JSON.stringify(
          userWallet.cryptoBalances || {}
        )) as { USDC?: string; XLM?: string; [key: string]: string | undefined };
        
        // Deduct from user wallet based on project currency
        if (projectCurrency === "NGN") {
          // Deduct from fiat balance only
          const newFiatBalance = (userBalance - investmentAmount).toFixed(2);
          await tx
            .update(wallets)
            .set({ 
              fiatBalance: newFiatBalance,
              updatedAt: new Date() 
            })
            .where(eq(wallets.userId, userId));
          
          // Update user's total invested NGN atomically using SQL to prevent race conditions
          await tx
            .update(users)
            .set({
              totalInvestedNGN: sql`COALESCE(${users.totalInvestedNGN}, 0) + ${investmentAmount}`,
              updatedAt: new Date()
            })
            .where(eq(users.id, userId));
        } else {
          // Deduct from crypto balance (USDC or XLM)
          const newCryptoBalance = (userBalance - investmentAmount).toFixed(7);
          updatedCryptoBalances[projectCurrency] = newCryptoBalance;
        }

        // Add project tokens to crypto balances (for all currencies)
        const tokenKey = project.tokenSymbol;
        const currentTokenBalance = parseFloat(updatedCryptoBalances[tokenKey] || "0");
        const newTokenBalance = (currentTokenBalance + tokensToReceive).toFixed(7);
        updatedCryptoBalances[tokenKey] = newTokenBalance;

        // Always update crypto balances with new token holdings
        await tx
          .update(wallets)
          .set({
            cryptoBalances: updatedCryptoBalances,
            updatedAt: new Date()
          })
          .where(eq(wallets.userId, userId));

        // Update project raised amount and tokens sold
        const newRaisedAmount = (parseFloat(project.raisedAmount) + investmentAmount).toFixed(2);
        const newTokensSold = (tokensSold + tokensToReceive).toFixed(2);
        
        await tx
          .update(projects)
          .set({ 
            raisedAmount: newRaisedAmount,
            tokensSold: newTokensSold,
            updatedAt: new Date()
          })
          .where(eq(projects.id, projectId));

        // Create investment record
        const [investment] = await tx
          .insert(investments)
          .values({
            userId,
            projectId,
            amount: investmentAmount.toFixed(2),
            tokensReceived: tokensToReceive.toFixed(7),
            currency: projectCurrency,
          })
          .returning();

        // Update or create project token balance
        const [existingBalance] = await tx
          .select()
          .from(projectTokenBalances)
          .where(
            and(
              eq(projectTokenBalances.userId, userId),
              eq(projectTokenBalances.projectId, projectId)
            )
          )
          .limit(1);

        if (existingBalance) {
          const newBalance = (parseFloat(existingBalance.tokenAmount) + tokensToReceive).toFixed(7);
          await tx
            .update(projectTokenBalances)
            .set({ 
              tokenAmount: newBalance,
              updatedAt: new Date()
            })
            .where(eq(projectTokenBalances.id, existingBalance.id));
        } else {
          await tx
            .insert(projectTokenBalances)
            .values({
              userId,
              projectId,
              tokenAmount: tokensToReceive.toFixed(7),
            });
        }

        // Record transaction in ledger using the transaction context
        await tx.insert(projectTokenLedger).values({
          projectId,
          userId,
          action: "transfer",
          tokenAmount: tokensToReceive.toFixed(7),
          stellarTransactionHash: transferTxHash,
          notes: `Investment of ${currencySymbol}${investmentAmount.toFixed(2)} in ${project.name}`,
        });

        // Store investment ID for response (accessible after transaction commits)
        return investment;
      });

      console.log(`   ✅ Investment completed successfully!`);

      // Return success response
      res.json({
        success: true,
        investment: {
          amount: investmentAmount,
          tokensReceived: tokensToReceive,
          trustlineTxHash,
          transferTxHash,
        },
        message: `Successfully invested ${currencySymbol}${investmentAmount.toFixed(2)} and received ${tokensToReceive.toFixed(2)} ${project.tokenSymbol} tokens`,
      });
    } catch (error: any) {
      console.error("❌ Database transaction failed after successful Stellar transfer:", error);
      console.error(`   ⚠️  CRITICAL: Tokens transferred on-chain (TX: ${transferTxHash}) but database not updated`);
      console.error(`   ⚠️  Manual reconciliation required for user ${userId}, project ${projectId}`);
      
      res.status(500).json({ 
        error: "Investment recorded on blockchain but database update failed. Your tokens are safe on Stellar. Please contact support with this transaction hash for reconciliation.",
        txHash: transferTxHash,
        criticalError: true
      });
      return;
    }
  } catch (error: any) {
    console.error("Error creating investment:", error);
    res.status(500).json({ error: "Failed to process investment" });
  }
});

/**
 * GET /api/investments
 * Get all investments for the authenticated user
 * Protected route - requires authentication
 */
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const userInvestments = await db
      .select({
        id: investments.id,
        projectId: investments.projectId,
        projectName: projects.name,
        projectTokenSymbol: projects.tokenSymbol,
        amount: investments.amount,
        tokensReceived: investments.tokensReceived,
        currency: investments.currency,
        createdAt: investments.createdAt,
      })
      .from(investments)
      .leftJoin(projects, eq(investments.projectId, projects.id))
      .where(eq(investments.userId, userId))
      .orderBy(desc(investments.createdAt));

    res.json(userInvestments);
  } catch (error: any) {
    console.error("Error fetching investments:", error);
    res.status(500).json({ error: "Failed to fetch investments" });
  }
});

/**
 * GET /api/investments/portfolio
 * Get user's complete portfolio with current token holdings
 * Protected route - requires authentication
 */
router.get("/portfolio", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const portfolio = await db
      .select({
        id: projectTokenBalances.id,
        projectId: projectTokenBalances.projectId,
        projectName: projects.name,
        tokenSymbol: projects.tokenSymbol,
        tokenAmount: projectTokenBalances.tokenAmount,
        pricePerToken: projects.pricePerToken,
        stellarAssetCode: projects.stellarAssetCode,
        stellarIssuerPublicKey: projects.stellarIssuerPublicKey,
        updatedAt: projectTokenBalances.updatedAt,
      })
      .from(projectTokenBalances)
      .leftJoin(projects, eq(projectTokenBalances.projectId, projects.id))
      .where(eq(projectTokenBalances.userId, userId))
      .orderBy(desc(projectTokenBalances.updatedAt));

    // Calculate total portfolio value
    const totalValue = portfolio.reduce((sum, holding) => {
      const tokens = parseFloat(holding.tokenAmount || "0");
      const price = parseFloat(holding.pricePerToken || "0");
      return sum + (tokens * price);
    }, 0);

    res.json({
      holdings: portfolio,
      totalValue: totalValue.toFixed(2),
      currency: "NGN",
    });
  } catch (error: any) {
    console.error("Error fetching portfolio:", error);
    res.status(500).json({ error: "Failed to fetch portfolio" });
  }
});

/**
 * GET /api/investments/stats
 * Get investment statistics for the authenticated user
 * Protected route - requires authentication
 */
router.get("/stats", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Get all user investments
    const userInvestments = await db
      .select()
      .from(investments)
      .where(eq(investments.userId, userId));

    // Calculate stats
    const totalInvested = userInvestments.reduce((sum, inv) => {
      return sum + parseFloat(inv.amount);
    }, 0);

    const totalTokens = userInvestments.reduce((sum, inv) => {
      return sum + parseFloat(inv.tokensReceived);
    }, 0);

    const projectsCount = new Set(userInvestments.map(inv => inv.projectId)).size;

    res.json({
      totalInvested: totalInvested.toFixed(2),
      totalTokensReceived: totalTokens.toFixed(2),
      projectsInvestedIn: projectsCount,
      investmentsCount: userInvestments.length,
    });
  } catch (error: any) {
    console.error("Error fetching investment stats:", error);
    res.status(500).json({ error: "Failed to fetch investment statistics" });
  }
});

export default router;
