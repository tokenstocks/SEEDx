import { Router } from "express";
import { db } from "../db";
import { users, wallets, depositRequests, withdrawalRequests, transactions, projects, investments } from "@shared/schema";
import { sql, count, eq } from "drizzle-orm";
import stellarConfig from "../lib/stellarConfig";
import { authMiddleware, requireAdmin } from "../middleware/auth";
import { accountExists, getAccountBalances } from "../lib/stellarAccount";
import { verifyTokenExists, getTokenBalance } from "../lib/stellarToken";

const router = Router();

// All setup routes require admin authentication
router.use(authMiddleware);
router.use(requireAdmin);

/**
 * GET /api/setup/verify-database
 * Validates that all required database tables exist and are accessible
 */
router.get("/verify-database", async (req, res) => {
  try {
    const tableChecks = {
      users: false,
      wallets: false,
      depositRequests: false,
      withdrawalRequests: false,
      transactions: false,
      projects: false,
      investments: false,
    };

    const errors: string[] = [];

    // Check each table by attempting to count rows
    try {
      await db.select({ count: count() }).from(users);
      tableChecks.users = true;
    } catch (error: any) {
      errors.push(`users table: ${error.message}`);
    }

    try {
      await db.select({ count: count() }).from(wallets);
      tableChecks.wallets = true;
    } catch (error: any) {
      errors.push(`wallets table: ${error.message}`);
    }

    try {
      await db.select({ count: count() }).from(depositRequests);
      tableChecks.depositRequests = true;
    } catch (error: any) {
      errors.push(`depositRequests table: ${error.message}`);
    }

    try {
      await db.select({ count: count() }).from(withdrawalRequests);
      tableChecks.withdrawalRequests = true;
    } catch (error: any) {
      errors.push(`withdrawalRequests table: ${error.message}`);
    }

    try {
      await db.select({ count: count() }).from(transactions);
      tableChecks.transactions = true;
    } catch (error: any) {
      errors.push(`transactions table: ${error.message}`);
    }

    try {
      await db.select({ count: count() }).from(projects);
      tableChecks.projects = true;
    } catch (error: any) {
      errors.push(`projects table: ${error.message}`);
    }

    try {
      await db.select({ count: count() }).from(investments);
      tableChecks.investments = true;
    } catch (error: any) {
      errors.push(`investments table: ${error.message}`);
    }

    const allTablesExist = Object.values(tableChecks).every(exists => exists);

    res.json({
      status: allTablesExist ? "success" : "error",
      message: allTablesExist 
        ? "All required database tables exist and are accessible" 
        : "Some database tables are missing or inaccessible",
      tables: tableChecks,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Database verification error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to verify database",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/setup/verify-wallets
 * Validates that each user has exactly one hybrid wallet with correct structure
 */
router.get("/verify-wallets", async (req, res) => {
  try {
    // Get all users and their wallets
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
    }).from(users);

    const allWallets = await db.select().from(wallets);

    // Create a map of userId -> wallet count
    const walletCountByUser = new Map<string, number>();
    const walletsByUser = new Map<string, typeof allWallets[0]>();

    for (const wallet of allWallets) {
      const currentCount = walletCountByUser.get(wallet.userId) || 0;
      walletCountByUser.set(wallet.userId, currentCount + 1);
      
      if (currentCount === 0) {
        walletsByUser.set(wallet.userId, wallet);
      }
    }

    // Validate each user (minimal data exposure for admin diagnostics)
    const userValidations = allUsers.map(user => {
      const walletCount = walletCountByUser.get(user.id) || 0;
      const wallet = walletsByUser.get(user.id);
      
      const hasOneWallet = walletCount === 1;
      const hasCorrectStructure = wallet ? (
        wallet.fiatBalance !== null &&
        wallet.cryptoBalances !== null &&
        wallet.cryptoWalletPublicKey !== null &&
        wallet.cryptoWalletSecretEncrypted !== null
      ) : false;

      return {
        userId: user.id,
        role: user.role,
        walletCount,
        hasOneWallet,
        hasCorrectStructure,
        walletId: wallet?.id,
        hasFiatBalance: !!wallet?.fiatBalance,
        hasCryptoWallet: !!wallet?.cryptoWalletPublicKey,
        status: (hasOneWallet && hasCorrectStructure) ? "valid" : "invalid",
        issues: [
          ...(!hasOneWallet ? [`Expected 1 wallet, found ${walletCount}`] : []),
          ...(!hasCorrectStructure && wallet ? ["Wallet missing required fields"] : []),
          ...(!wallet ? ["No wallet found"] : []),
        ],
      };
    });

    const allValid = userValidations.every(v => v.status === "valid");
    const invalidUsers = userValidations.filter(v => v.status === "invalid");

    res.json({
      status: allValid ? "success" : "warning",
      message: allValid 
        ? "All users have exactly one valid hybrid wallet"
        : `${invalidUsers.length} user(s) have wallet issues`,
      summary: {
        totalUsers: allUsers.length,
        totalWallets: allWallets.length,
        validUsers: userValidations.filter(v => v.status === "valid").length,
        invalidUsers: invalidUsers.length,
      },
      users: userValidations,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Wallet verification error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to verify wallets",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/setup/verify-platform-wallets
 * Validates that LP and Admin platform wallets exist with Stellar keypairs
 */
router.get("/verify-platform-wallets", async (req, res) => {
  try {
    // Find LP user and wallet
    const lpUser = await db.select()
      .from(users)
      .where(eq(users.email, "lp@tokenstocks.platform"))
      .limit(1);

    const lpWallet = lpUser.length > 0 
      ? await db.select().from(wallets).where(eq(wallets.userId, lpUser[0].id)).limit(1)
      : [];

    // Find Admin user and wallet
    const adminUser = await db.select()
      .from(users)
      .where(eq(users.email, "admin@tokenstocks.platform"))
      .limit(1);

    const adminWallet = adminUser.length > 0
      ? await db.select().from(wallets).where(eq(wallets.userId, adminUser[0].id)).limit(1)
      : [];

    // Validate LP wallet (minimal data exposure)
    const lpStatus = {
      exists: lpUser.length > 0 && lpWallet.length > 0,
      walletId: lpWallet[0]?.id,
      hasFiatBalance: !!lpWallet[0]?.fiatBalance,
      hasStellarKeypair: !!(lpWallet[0]?.cryptoWalletPublicKey && lpWallet[0]?.cryptoWalletSecretEncrypted),
      status: (lpUser.length > 0 && lpWallet.length > 0 && lpWallet[0]?.cryptoWalletPublicKey) ? "valid" : "invalid",
      issues: [
        ...(lpUser.length === 0 ? ["LP user not found"] : []),
        ...(lpWallet.length === 0 ? ["LP wallet not found"] : []),
        ...(lpWallet.length > 0 && !lpWallet[0]?.cryptoWalletPublicKey ? ["LP wallet missing Stellar keypair"] : []),
      ],
    };

    // Validate Admin wallet (minimal data exposure)
    const adminStatus = {
      exists: adminUser.length > 0 && adminWallet.length > 0,
      walletId: adminWallet[0]?.id,
      hasFiatBalance: !!adminWallet[0]?.fiatBalance,
      hasStellarKeypair: !!(adminWallet[0]?.cryptoWalletPublicKey && adminWallet[0]?.cryptoWalletSecretEncrypted),
      status: (adminUser.length > 0 && adminWallet.length > 0 && adminWallet[0]?.cryptoWalletPublicKey) ? "valid" : "invalid",
      issues: [
        ...(adminUser.length === 0 ? ["Admin user not found"] : []),
        ...(adminWallet.length === 0 ? ["Admin wallet not found"] : []),
        ...(adminWallet.length > 0 && !adminWallet[0]?.cryptoWalletPublicKey ? ["Admin wallet missing Stellar keypair"] : []),
      ],
    };

    const allValid = lpStatus.status === "valid" && adminStatus.status === "valid";

    res.json({
      status: allValid ? "success" : "error",
      message: allValid 
        ? "LP and Admin platform wallets are properly configured"
        : "Platform wallet configuration issues detected",
      platformWallets: {
        lp: lpStatus,
        admin: adminStatus,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Platform wallet verification error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to verify platform wallets",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/setup/verify-network
 * Validates Stellar network configuration
 */
router.get("/verify-network", async (req, res) => {
  try {
    const networkEnv = process.env.STELLAR_NETWORK || "testnet";
    
    const validNetworks = ["testnet", "mainnet"];
    const isValidNetwork = validNetworks.includes(networkEnv.toLowerCase());

    res.json({
      status: isValidNetwork ? "success" : "warning",
      message: isValidNetwork 
        ? `Stellar network configuration is valid (${networkEnv})`
        : `Invalid STELLAR_NETWORK value: ${networkEnv}`,
      configuration: {
        network: networkEnv,
        isTestnet: stellarConfig.isTestnet(),
        isMainnet: stellarConfig.isMainnet(),
        horizonUrl: stellarConfig.horizonUrl,
        networkPassphrase: stellarConfig.passphrase,
        validConfiguration: isValidNetwork,
      },
      warnings: [
        ...(networkEnv === "mainnet" ? ["Using MAINNET - real funds at risk!"] : []),
        ...(!isValidNetwork ? [`STELLAR_NETWORK should be 'testnet' or 'mainnet', got '${networkEnv}'`] : []),
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Network verification error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to verify Stellar network configuration",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/setup/verify-all
 * Combined verification report for all Phase 1 setup checks
 */
router.get("/verify-all", async (req, res) => {
  try {
    // Run all verification checks
    const [databaseResult, walletsResult, platformResult, networkResult] = await Promise.all([
      // Database verification
      (async () => {
        try {
          const tableChecks = {
            users: false,
            wallets: false,
            depositRequests: false,
            withdrawalRequests: false,
            transactions: false,
            projects: false,
            investments: false,
          };

          await db.select({ count: count() }).from(users);
          tableChecks.users = true;
          await db.select({ count: count() }).from(wallets);
          tableChecks.wallets = true;
          await db.select({ count: count() }).from(depositRequests);
          tableChecks.depositRequests = true;
          await db.select({ count: count() }).from(withdrawalRequests);
          tableChecks.withdrawalRequests = true;
          await db.select({ count: count() }).from(transactions);
          tableChecks.transactions = true;
          await db.select({ count: count() }).from(projects);
          tableChecks.projects = true;
          await db.select({ count: count() }).from(investments);
          tableChecks.investments = true;

          const allTablesExist = Object.values(tableChecks).every(exists => exists);
          
          return {
            status: allTablesExist ? "success" : "error",
            tables: tableChecks,
            allTablesExist,
          };
        } catch (error: any) {
          return {
            status: "error",
            error: error.message,
            allTablesExist: false,
          };
        }
      })(),

      // Wallets verification
      (async () => {
        try {
          const allUsers = await db.select({
            id: users.id,
            email: users.email,
          }).from(users);

          const allWallets = await db.select().from(wallets);

          const walletCountByUser = new Map<string, number>();
          const walletsByUser = new Map<string, typeof allWallets[0]>();

          for (const wallet of allWallets) {
            const currentCount = walletCountByUser.get(wallet.userId) || 0;
            walletCountByUser.set(wallet.userId, currentCount + 1);
            if (currentCount === 0) {
              walletsByUser.set(wallet.userId, wallet);
            }
          }

          const userValidations = allUsers.map(user => {
            const walletCount = walletCountByUser.get(user.id) || 0;
            const wallet = walletsByUser.get(user.id);
            const hasOneWallet = walletCount === 1;
            const hasCorrectStructure = wallet ? (
              wallet.fiatBalance !== null &&
              wallet.cryptoBalances !== null &&
              wallet.cryptoWalletPublicKey !== null &&
              wallet.cryptoWalletSecretEncrypted !== null
            ) : false;

            return {
              valid: hasOneWallet && hasCorrectStructure,
            };
          });

          const allValid = userValidations.every(v => v.valid);

          return {
            status: allValid ? "success" : "warning",
            totalUsers: allUsers.length,
            totalWallets: allWallets.length,
            validUsers: userValidations.filter(v => v.valid).length,
            allValid,
          };
        } catch (error: any) {
          return {
            status: "error",
            error: error.message,
            allValid: false,
          };
        }
      })(),

      // Platform wallets verification
      (async () => {
        try {
          const lpUser = await db.select()
            .from(users)
            .where(eq(users.email, "lp@tokenstocks.platform"))
            .limit(1);

          const lpWallet = lpUser.length > 0 
            ? await db.select().from(wallets).where(eq(wallets.userId, lpUser[0].id)).limit(1)
            : [];

          const adminUser = await db.select()
            .from(users)
            .where(eq(users.email, "admin@tokenstocks.platform"))
            .limit(1);

          const adminWallet = adminUser.length > 0
            ? await db.select().from(wallets).where(eq(wallets.userId, adminUser[0].id)).limit(1)
            : [];

          const lpValid = lpUser.length > 0 && lpWallet.length > 0 && !!lpWallet[0]?.cryptoWalletPublicKey;
          const adminValid = adminUser.length > 0 && adminWallet.length > 0 && !!adminWallet[0]?.cryptoWalletPublicKey;

          return {
            status: (lpValid && adminValid) ? "success" : "error",
            lpExists: lpValid,
            adminExists: adminValid,
            allValid: lpValid && adminValid,
          };
        } catch (error: any) {
          return {
            status: "error",
            error: error.message,
            allValid: false,
          };
        }
      })(),

      // Network verification
      (async () => {
        try {
          const networkEnv = process.env.STELLAR_NETWORK || "testnet";
          const validNetworks = ["testnet", "mainnet"];
          const isValidNetwork = validNetworks.includes(networkEnv.toLowerCase());

          return {
            status: isValidNetwork ? "success" : "warning",
            network: networkEnv,
            isTestnet: stellarConfig.isTestnet(),
            horizonUrl: stellarConfig.horizonUrl,
            validConfiguration: isValidNetwork,
          };
        } catch (error: any) {
          return {
            status: "error",
            error: error.message,
            validConfiguration: false,
          };
        }
      })(),
    ]);

    // Calculate overall status
    const overallStatus = 
      databaseResult.status === "error" || 
      walletsResult.status === "error" || 
      platformResult.status === "error"
        ? "error"
        : networkResult.status === "warning" || walletsResult.status === "warning"
        ? "warning"
        : "success";

    const allChecksPass = 
      databaseResult.allTablesExist &&
      walletsResult.allValid &&
      platformResult.allValid &&
      networkResult.validConfiguration;

    res.json({
      status: overallStatus,
      message: allChecksPass 
        ? "All Phase 1 verification checks passed - hybrid wallet system ready"
        : "Phase 1 verification detected issues - review detailed results",
      summary: {
        allChecksPass,
        databaseValid: databaseResult.allTablesExist,
        walletsValid: walletsResult.allValid,
        platformWalletsValid: platformResult.allValid,
        networkValid: networkResult.validConfiguration,
      },
      details: {
        database: databaseResult,
        wallets: walletsResult,
        platformWallets: platformResult,
        network: networkResult,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Combined verification error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to run verification checks",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/setup/verify-onchain
 * Verify on-chain status of all projects - checks accounts and tokens on Stellar testnet
 * Requires admin authentication
 */
router.get("/verify-onchain", async (req, res) => {
  try {
    // Get all projects from database
    const allProjects = await db.select().from(projects);

    if (allProjects.length === 0) {
      return res.json({
        status: "success",
        message: "No projects found - nothing to verify on-chain",
        summary: {
          totalProjects: 0,
          syncedProjects: 0,
          unsyncedProjects: 0,
        },
        projects: [],
        timestamp: new Date().toISOString(),
      });
    }

    // Verify each project's on-chain status
    const projectStatuses = await Promise.all(
      allProjects.map(async (project) => {
        const status: any = {
          projectId: project.id,
          projectName: project.name,
          tokenSymbol: project.tokenSymbol,
          dbSyncStatus: project.onChainSynced,
          issuerPublicKey: project.stellarIssuerPublicKey,
          distributionPublicKey: project.stellarDistributionPublicKey,
          onChainStatus: {
            issuerAccountExists: false,
            distributionAccountExists: false,
            trustlineEstablished: false,
            tokenMinted: false,
            tokenBalance: null,
          },
          transactionHashes: {
            issuerTx: project.stellarIssuerTx,
            distributionTx: project.stellarDistributionTx,
            trustlineTx: project.stellarTrustlineTx,
            mintTx: project.stellarMintTx,
          },
          issues: [] as string[],
        };

        // Check if issuer account exists on Stellar
        if (project.stellarIssuerPublicKey) {
          try {
            status.onChainStatus.issuerAccountExists = await accountExists(
              project.stellarIssuerPublicKey
            );
          } catch (error: any) {
            status.issues.push(`Failed to check issuer account: ${error.message}`);
          }
        } else {
          status.issues.push("No issuer public key configured");
        }

        // Check if distribution account exists on Stellar
        if (project.stellarDistributionPublicKey) {
          try {
            status.onChainStatus.distributionAccountExists = await accountExists(
              project.stellarDistributionPublicKey
            );
          } catch (error: any) {
            status.issues.push(`Failed to check distribution account: ${error.message}`);
          }
        } else {
          status.issues.push("No distribution public key configured");
        }

        // Check trustline and token balance if distribution account exists
        if (
          status.onChainStatus.distributionAccountExists &&
          project.stellarIssuerPublicKey &&
          project.stellarDistributionPublicKey &&
          project.stellarAssetCode
        ) {
          try {
            const tokenExists = await verifyTokenExists(
              project.stellarDistributionPublicKey,
              project.stellarAssetCode,
              project.stellarIssuerPublicKey
            );
            status.onChainStatus.trustlineEstablished = tokenExists;

            if (tokenExists) {
              const balance = await getTokenBalance(
                project.stellarDistributionPublicKey,
                project.stellarAssetCode,
                project.stellarIssuerPublicKey
              );
              status.onChainStatus.tokenBalance = balance;
              status.onChainStatus.tokenMinted = balance && parseFloat(balance) > 0;
            }
          } catch (error: any) {
            status.issues.push(`Failed to verify token: ${error.message}`);
          }
        }

        // Overall validation
        const fullyOnChain =
          status.onChainStatus.issuerAccountExists &&
          status.onChainStatus.distributionAccountExists &&
          status.onChainStatus.trustlineEstablished &&
          status.onChainStatus.tokenMinted;

        status.fullySynced = fullyOnChain;
        status.syncStatusMatch = project.onChainSynced === fullyOnChain;

        if (!status.syncStatusMatch) {
          status.issues.push(
            `Database sync status (${project.onChainSynced}) doesn't match on-chain reality (${fullyOnChain})`
          );
        }

        return status;
      })
    );

    // Calculate summary
    const syncedProjects = projectStatuses.filter((p) => p.fullySynced).length;
    const unsyncedProjects = projectStatuses.length - syncedProjects;
    const allSynced = syncedProjects === projectStatuses.length;

    res.json({
      status: allSynced ? "success" : "warning",
      message: allSynced
        ? `All ${projectStatuses.length} projects are fully synced on-chain`
        : `${unsyncedProjects}/${projectStatuses.length} projects have on-chain issues`,
      summary: {
        totalProjects: projectStatuses.length,
        syncedProjects,
        unsyncedProjects,
        allSynced,
      },
      projects: projectStatuses,
      network: stellarConfig.network,
      horizonUrl: stellarConfig.horizonUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("On-chain verification error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to verify on-chain status",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
