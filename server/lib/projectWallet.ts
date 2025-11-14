import { Keypair, Asset, TransactionBuilder, BASE_FEE, Operation } from "stellar-sdk";
import { encrypt, decrypt } from "./encryption";
import { createAndFundAccount } from "./stellarAccount";
import { getAssetBalance } from "./stellarOps";
import { horizonServer, NETWORK_PASSPHRASE } from "./stellarConfig";
import { db } from "../db";
import { projects, platformWallets, systemErrors } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Establish trustline for a project wallet (using secret key directly)
 * This is needed because project wallets are NOT stored in the wallets table
 * 
 * @param publicKey - Project wallet public key
 * @param secretKey - Decrypted project wallet secret key
 * @param assetCode - Asset code (e.g., "NGNTS")
 * @param issuerPublicKey - Issuer public key
 * @returns Transaction hash or "EXISTING_TRUSTLINE"
 */
async function ensureProjectWalletTrustline(
  publicKey: string,
  secretKey: string,
  assetCode: string,
  issuerPublicKey: string
): Promise<string> {
  try {
    // Load account from Stellar
    const account = await horizonServer.loadAccount(publicKey);
    
    // Check if trustline already exists
    const asset = new Asset(assetCode, issuerPublicKey);
    const existingTrustline = account.balances.find(
      (balance: any) =>
        balance.asset_type !== "native" &&
        balance.asset_code === assetCode &&
        balance.asset_issuer === issuerPublicKey
    );
    
    if (existingTrustline) {
      return "EXISTING_TRUSTLINE";
    }
    
    // Build and sign trustline transaction
    const keypair = Keypair.fromSecret(secretKey);
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(Operation.changeTrust({ asset }))
      .setTimeout(30)
      .build();
    
    transaction.sign(keypair);
    
    // Submit to network
    const result = await horizonServer.submitTransaction(transaction);
    return result.hash;
    
  } catch (error: any) {
    throw new Error(`Failed to establish project wallet trustline: ${error.message}`);
  }
}

/**
 * Creates a new Stellar wallet for a project
 * Called during first LP capital allocation
 * 
 * Phase 2: Project Operational Wallet Creation - Two-Phase Commit
 * Phase 1: Check if staging wallet exists, generate if not
 * Phase 2: Fund → Trustline → Persist (idempotent retry-safe)
 * 
 * @param projectId - UUID of the project
 * @returns Public key of the created wallet
 */
export async function createProjectWallet(projectId: string): Promise<string> {
  console.log(`🔨 Creating project wallet for ${projectId}...`);
  
  // TRANSACTION 1: Stage wallet with row lock (commits immediately)
  const { publicKey, shouldFund } = await db.transaction(async (tx) => {
    // SELECT FOR UPDATE locks the row to prevent concurrent staging
    const [project] = await tx
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .for("update")
      .limit(1);
    
    if (!project) {
      throw new Error("Project not found");
    }
    
    // Check if wallet already staged or completed
    if (project.stellarProjectWalletPublicKey && project.stellarProjectWalletSecretEncrypted) {
      if (project.projectWalletFundedAt) {
        // Wallet fully initialized - return immediately
        console.log(`   ✓ Wallet already exists and funded: ${project.stellarProjectWalletPublicKey.substring(0, 8)}...`);
        return {
          publicKey: project.stellarProjectWalletPublicKey,
          shouldFund: false
        };
      }
      
      // Wallet staged but not funded - resume funding
      console.log(`   ℹ️  Resuming wallet creation for staged wallet: ${project.stellarProjectWalletPublicKey.substring(0, 8)}...`);
      return {
        publicKey: project.stellarProjectWalletPublicKey,
        shouldFund: true
      };
    }
    
    // Generate new keypair
    const keypair = Keypair.random();
    const newPublicKey = keypair.publicKey();
    const secretKey = keypair.secret();
    const encryptedSecret = encrypt(secretKey);
    
    console.log(`   ✓ Keypair generated: ${newPublicKey.substring(0, 8)}...`);
    
    // Stage the wallet in database (COMMITS on transaction end)
    await tx.update(projects)
      .set({
        stellarProjectWalletPublicKey: newPublicKey,
        stellarProjectWalletSecretEncrypted: encryptedSecret,
        projectWalletCreatedAt: new Date(),
        // projectWalletFundedAt remains null until completion
      })
      .where(eq(projects.id, projectId));
    
    console.log(`   ✓ Wallet staged in database (committed)`);
    
    return {
      publicKey: newPublicKey,
      shouldFund: true
    };
  });
  
  // Return immediately if wallet already funded
  if (!shouldFund) {
    return publicKey;
  }
  
  // ON-CHAIN OPERATIONS (outside transaction - no rollback risk)
  try {
    // Step 1: Fund wallet with 3.0 XLM
    console.log(`   💰 Funding wallet with 3.0 XLM...`);
    const fundingResult = await createAndFundAccount(publicKey, "3.0");
    
    if (!fundingResult.success && !fundingResult.alreadyExists) {
      throw new Error(`Failed to fund project wallet: ${fundingResult.error}`);
    }
    
    // Step 2: Load project wallet secret for trustline operation
    // This is needed for retry scenarios where wallet was staged but trustline failed
    const [projectRecord] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    
    if (!projectRecord?.stellarProjectWalletSecretEncrypted) {
      throw new Error("Project wallet secret not found - database inconsistency");
    }
    
    const secretKey = decrypt(projectRecord.stellarProjectWalletSecretEncrypted);
    
    // Step 3: Get Treasury wallet (NGNTS issuer)
    const [treasuryWallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "treasury_pool"))
      .limit(1);
    
    if (!treasuryWallet) {
      throw new Error("Treasury wallet not configured");
    }
    
    // Step 4: Establish NGNTS trustline using secret key directly
    console.log(`   🔗 Establishing NGNTS trustline...`);
    const trustlineResult = await ensureProjectWalletTrustline(
      publicKey,
      secretKey,
      "NGNTS",
      treasuryWallet.publicKey
    );
    
    console.log(`   ✓ Trustline established: ${trustlineResult === "EXISTING_TRUSTLINE" ? "already exists" : trustlineResult.substring(0, 8) + "..."}`);
    
  } catch (error: any) {
    // On-chain operations failed - wallet is staged but not funded
    console.error(`   ❌ Failed to complete on-chain setup: ${error.message}`);
    console.error(`   Wallet ${publicKey.substring(0, 8)}... is staged in database but not funded`);
    console.error(`   Next allocation will retry funding for this wallet (idempotent)`);
    throw error;
  }
  
  // TRANSACTION 2: Mark as funded with compare-and-swap (separate transaction)
  try {
    await db.transaction(async (tx) => {
      // Compare-and-swap: only mark funded if wallet key matches
      const [updated] = await tx.update(projects)
        .set({ projectWalletFundedAt: new Date() })
        .where(sql`${projects.id} = ${projectId} AND ${projects.stellarProjectWalletPublicKey} = ${publicKey}`)
        .returning({ updatedPublicKey: projects.stellarProjectWalletPublicKey });
      
      if (!updated || updated.updatedPublicKey !== publicKey) {
        throw new Error("Wallet public key mismatch - concurrent modification detected");
      }
    });
    
    console.log(`   ✅ Project wallet ready: ${publicKey.substring(0, 8)}...`);
    return publicKey;
    
  } catch (error: any) {
    // Transaction 2 failed - wallet is funded on-chain but not marked in database
    // Log to systemErrors for manual reconciliation
    console.error(`   ❌ Failed to mark wallet as funded: ${error.message}`);
    console.error(`   CRITICAL: Wallet ${publicKey.substring(0, 8)}... is FUNDED on-chain but NOT marked in database`);
    console.error(`   Manual reconciliation required - logging to systemErrors table`);
    
    await db.insert(systemErrors).values({
      errorType: "project_wallet_funding_mismatch",
      errorMessage: `Project ${projectId} wallet ${publicKey} funded on-chain but DB update failed: ${error.message}. Wallet is operational on Stellar but projectWalletFundedAt not set.`,
      projectId,
      severity: "critical",
      resolved: false
    });
    
    throw new Error(`Wallet funded on-chain but database update failed. Logged to systemErrors table. ${error.message}`);
  }
}

/**
 * Gets the current NGNTS balance of a project wallet
 * 
 * @param projectId - UUID of the project
 * @returns NGNTS balance as number
 */
export async function getProjectWalletBalance(projectId: string): Promise<number> {
  const [project] = await db.select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  
  if (!project?.stellarProjectWalletPublicKey) {
    throw new Error("Project wallet not created");
  }
  
  // Get Treasury wallet (NGNTS issuer)
  const [treasuryWallet] = await db
    .select()
    .from(platformWallets)
    .where(eq(platformWallets.walletType, "treasury_pool"))
    .limit(1);
  
  if (!treasuryWallet) {
    throw new Error("Treasury wallet not configured");
  }
  
  const balance = await getAssetBalance(
    project.stellarProjectWalletPublicKey,
    "NGNTS",
    treasuryWallet.publicKey
  );
  
  return parseFloat(balance || "0");
}

/**
 * Gets full wallet details (NGNTS + XLM balances)
 * 
 * @param projectId - UUID of the project
 * @returns Wallet details or null if wallet doesn't exist
 */
export async function getProjectWalletDetails(projectId: string) {
  const [project] = await db.select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  
  if (!project?.stellarProjectWalletPublicKey) {
    return null;
  }
  
  // Get Treasury wallet (NGNTS issuer)
  const [treasuryWallet] = await db
    .select()
    .from(platformWallets)
    .where(eq(platformWallets.walletType, "treasury_pool"))
    .limit(1);
  
  if (!treasuryWallet) {
    throw new Error("Treasury wallet not configured");
  }
  
  const ngntsBalance = await getAssetBalance(
    project.stellarProjectWalletPublicKey,
    "NGNTS",
    treasuryWallet.publicKey
  );
  
  const xlmBalance = await getAssetBalance(
    project.stellarProjectWalletPublicKey,
    "XLM"
  );
  
  return {
    publicKey: project.stellarProjectWalletPublicKey,
    ngntsBalance: parseFloat(ngntsBalance || "0"),
    xlmBalance: parseFloat(xlmBalance || "0"),
    createdAt: project.projectWalletCreatedAt,
    fundedAt: project.projectWalletFundedAt
  };
}
