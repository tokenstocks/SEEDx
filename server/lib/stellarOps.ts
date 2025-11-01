import * as StellarSdk from "stellar-sdk";
import { horizonServer, NETWORK_PASSPHRASE } from "./stellarConfig";
import { decrypt } from "./encryption";
import { db } from "../db";
import { transactions, projectTokenLedger, wallets } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Ensure a trustline exists for a user account to accept a specific asset
 * 
 * @param userPublicKey - User's Stellar public key
 * @param assetCode - Token asset code (e.g., "CORN2025")
 * @param issuerPublicKey - Issuer's public key
 * @param limit - Trust limit (optional, defaults to unlimited "922337203685.4775807")
 * @returns Transaction hash or throws error
 * 
 * @example
 * ```typescript
 * const txHash = await ensureTrustline(
 *   "GABC...",
 *   "CORN2025",
 *   "GDEF...",
 *   "1000000"
 * );
 * console.log("Trustline created:", txHash);
 * ```
 */
export async function ensureTrustline(
  userPublicKey: string,
  assetCode: string,
  issuerPublicKey: string,
  limit?: string
): Promise<string> {
  try {
    console.log(`🔗 Setting up trustline for ${userPublicKey.substring(0, 8)}... to accept ${assetCode}`);

    // Validate inputs
    if (!userPublicKey || !userPublicKey.startsWith("G") || userPublicKey.length !== 56) {
      throw new Error("Invalid user public key format");
    }
    if (!issuerPublicKey || !issuerPublicKey.startsWith("G") || issuerPublicKey.length !== 56) {
      throw new Error("Invalid issuer public key format");
    }
    if (!assetCode || assetCode.length === 0 || assetCode.length > 12) {
      throw new Error("Asset code must be between 1-12 characters");
    }

    // Get user's wallet secret key
    const [userWallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.cryptoWalletPublicKey, userPublicKey))
      .limit(1);

    if (!userWallet || !userWallet.cryptoWalletSecretEncrypted) {
      throw new Error("User wallet not found or secret key missing");
    }

    // Decrypt user's secret key
    const userSecretKey = decrypt(userWallet.cryptoWalletSecretEncrypted);
    const userKeypair = StellarSdk.Keypair.fromSecret(userSecretKey);

    // Check if trustline already exists
    const userAccount = await horizonServer.loadAccount(userPublicKey);
    const asset = new StellarSdk.Asset(assetCode, issuerPublicKey);
    
    const existingTrustline = userAccount.balances.find(
      (balance: any) =>
        balance.asset_type !== "native" &&
        balance.asset_code === assetCode &&
        balance.asset_issuer === issuerPublicKey
    );

    if (existingTrustline) {
      console.log(`   ✓ Trustline already exists for ${assetCode}`);
      return "EXISTING_TRUSTLINE"; // Special return value indicating no new transaction
    }

    // Build trustline transaction
    const trustlineTransaction = new StellarSdk.TransactionBuilder(userAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: asset,
          limit: limit, // If not provided, defaults to max limit
        })
      )
      .setTimeout(30) // 30 second timeout
      .build();

    // Sign transaction
    trustlineTransaction.sign(userKeypair);

    // Submit to Stellar network
    const result = await horizonServer.submitTransaction(trustlineTransaction);

    console.log(`   ✅ Trustline created successfully! TX: ${result.hash}`);

    return result.hash;
  } catch (error: any) {
    console.error("❌ Error creating trustline:", error);

    // Handle Stellar-specific errors
    if (error.response && error.response.data) {
      const errorData = error.response.data;
      throw new Error(`Stellar error: ${errorData.title || error.message}`);
    }

    throw new Error(error.message || "Unknown error creating trustline");
  }
}

/**
 * Transfer a custom asset from sender to recipient on Stellar network
 * 
 * @param senderPublicKey - Sender's Stellar public key
 * @param recipientPublicKey - Recipient's Stellar public key
 * @param assetCode - Token asset code (e.g., "CORN2025")
 * @param issuerPublicKey - Issuer's public key
 * @param amount - Amount to transfer (as string to preserve precision)
 * @returns Transaction hash or throws error
 * 
 * @example
 * ```typescript
 * const txHash = await transferAsset(
 *   "GABC...",
 *   "GDEF...",
 *   "CORN2025",
 *   "GISSUER...",
 *   "100.00"
 * );
 * console.log("Transfer successful:", txHash);
 * ```
 */
export async function transferAsset(
  senderPublicKey: string,
  recipientPublicKey: string,
  assetCode: string,
  issuerPublicKey: string,
  amount: string
): Promise<string> {
  try {
    console.log(`💸 Transferring ${amount} ${assetCode} from ${senderPublicKey.substring(0, 8)}... to ${recipientPublicKey.substring(0, 8)}...`);

    // Validate inputs
    if (!senderPublicKey || !senderPublicKey.startsWith("G") || senderPublicKey.length !== 56) {
      throw new Error("Invalid sender public key format");
    }
    if (!recipientPublicKey || !recipientPublicKey.startsWith("G") || recipientPublicKey.length !== 56) {
      throw new Error("Invalid recipient public key format");
    }
    if (!assetCode || assetCode.length === 0 || assetCode.length > 12) {
      throw new Error("Asset code must be between 1-12 characters");
    }
    if (!amount || parseFloat(amount) <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    // Get sender's wallet secret key
    const [senderWallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.cryptoWalletPublicKey, senderPublicKey))
      .limit(1);

    if (!senderWallet || !senderWallet.cryptoWalletSecretEncrypted) {
      throw new Error("Sender wallet not found or secret key missing");
    }

    // Decrypt sender's secret key
    const senderSecretKey = decrypt(senderWallet.cryptoWalletSecretEncrypted);
    const senderKeypair = StellarSdk.Keypair.fromSecret(senderSecretKey);

    // Load sender's account
    const senderAccount = await horizonServer.loadAccount(senderPublicKey);

    // Create the asset
    const asset = new StellarSdk.Asset(assetCode, issuerPublicKey);

    // Build payment transaction
    const paymentTransaction = new StellarSdk.TransactionBuilder(senderAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: recipientPublicKey,
          asset: asset,
          amount: amount,
        })
      )
      .setTimeout(30) // 30 second timeout
      .build();

    // Sign transaction
    paymentTransaction.sign(senderKeypair);

    // Submit to Stellar network
    const result = await horizonServer.submitTransaction(paymentTransaction);

    console.log(`   ✅ Transfer successful! TX: ${result.hash}`);

    return result.hash;
  } catch (error: any) {
    console.error("❌ Error transferring asset:", error);

    // Handle Stellar-specific errors
    if (error.response && error.response.data) {
      const errorData = error.response.data;
      
      // Provide more helpful error messages for common issues
      if (errorData.extras && errorData.extras.result_codes) {
        const resultCodes = errorData.extras.result_codes;
        
        if (resultCodes.operations && resultCodes.operations.includes("op_underfunded")) {
          throw new Error("Insufficient balance to complete transfer");
        }
        if (resultCodes.operations && resultCodes.operations.includes("op_no_trust")) {
          throw new Error("Recipient has not established trustline for this asset");
        }
        if (resultCodes.operations && resultCodes.operations.includes("op_line_full")) {
          throw new Error("Recipient's trustline limit would be exceeded");
        }
      }

      throw new Error(`Stellar error: ${errorData.title || error.message}`);
    }

    throw new Error(error.message || "Unknown error transferring asset");
  }
}

/**
 * Record a transaction in the database after successful Stellar operation
 * 
 * @param txHash - Stellar transaction hash
 * @param userId - User ID who performed the transaction
 * @param projectId - Project ID (for token-related transactions)
 * @param amount - Transaction amount (as string to preserve precision)
 * @param type - Type of transaction ("investment", "transfer", "mint", etc.)
 * @param currency - Currency type (NGN, USDC, XLM, or token symbol)
 * @param notes - Optional notes about the transaction
 * @returns Created transaction ID
 * 
 * @example
 * ```typescript
 * const txId = await recordTransaction(
 *   "abc123stellartxhash",
 *   "user-uuid",
 *   "project-uuid",
 *   "100.00",
 *   "investment",
 *   "CORN2025",
 *   "User purchased 100 CORN2025 tokens"
 * );
 * ```
 */
export async function recordTransaction(
  txHash: string,
  userId: string,
  projectId: string | null,
  amount: string,
  type: "deposit" | "withdrawal" | "investment" | "return" | "fee" | "transfer",
  currency: "NGN" | "USDC" | "XLM" | string,
  notes?: string
): Promise<string> {
  try {
    console.log(`📝 Recording transaction: ${type} of ${amount} ${currency} (TX: ${txHash.substring(0, 8)}...)`);

    // Validate inputs
    if (!txHash) {
      throw new Error("Transaction hash is required");
    }
    if (!userId) {
      throw new Error("User ID is required");
    }
    if (!amount || parseFloat(amount) <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    // Determine if this is a standard currency or a token
    const isStandardCurrency = ["NGN", "USDC", "XLM"].includes(currency);

    // Create transaction record (for standard currencies only)
    let transactionId: string | undefined;
    
    if (isStandardCurrency) {
      const [transaction] = await db
        .insert(transactions)
        .values({
          userId,
          type: type as "deposit" | "withdrawal" | "investment" | "return" | "fee",
          amount,
          currency: currency as "NGN" | "USDC" | "XLM",
          status: "completed",
          paymentMethod: "stellar",
          reference: txHash,
          notes: notes || `Stellar transaction: ${txHash}`,
        })
        .returning();

      transactionId = transaction.id;
      console.log(`   ✓ Transaction record created: ${transactionId}`);
    }

    // For project token transactions, also create ledger entry
    if (projectId) {
      // Determine the ledger action type based on transaction type
      let ledgerAction: "create" | "mint" | "transfer" | "burn" | "redemption";
      
      switch (type) {
        case "investment":
          ledgerAction = "transfer"; // User buying tokens = transfer from distribution
          break;
        case "return":
          ledgerAction = "redemption"; // User redeeming tokens
          break;
        default:
          ledgerAction = "transfer"; // Default to transfer
      }

      const [ledgerEntry] = await db
        .insert(projectTokenLedger)
        .values({
          projectId,
          userId,
          action: ledgerAction,
          tokenAmount: amount,
          stellarTransactionHash: txHash,
          notes: notes || `${type} transaction`,
        })
        .returning();

      console.log(`   ✓ Token ledger entry created: ${ledgerEntry.id}`);
    }

    console.log(`   ✅ Transaction recorded successfully`);

    return transactionId || txHash;
  } catch (error: any) {
    console.error("❌ Error recording transaction:", error);
    throw new Error(error.message || "Unknown error recording transaction");
  }
}

/**
 * Helper function to check if a user has a trustline for a specific asset
 * 
 * @param userPublicKey - User's Stellar public key
 * @param assetCode - Token asset code
 * @param issuerPublicKey - Issuer's public key
 * @returns True if trustline exists, false otherwise
 */
export async function hasTrustline(
  userPublicKey: string,
  assetCode: string,
  issuerPublicKey: string
): Promise<boolean> {
  try {
    const account = await horizonServer.loadAccount(userPublicKey);
    
    const trustline = account.balances.find(
      (balance: any) =>
        balance.asset_type !== "native" &&
        balance.asset_code === assetCode &&
        balance.asset_issuer === issuerPublicKey
    );

    return !!trustline;
  } catch (error: any) {
    console.error("Error checking trustline:", error);
    return false;
  }
}

/**
 * Get the balance of a specific asset in a user's account
 * 
 * @param userPublicKey - User's Stellar public key
 * @param assetCode - Token asset code (or "native" for XLM)
 * @param issuerPublicKey - Issuer's public key (not needed for XLM)
 * @returns Balance as string, or "0" if not found
 */
export async function getAssetBalance(
  userPublicKey: string,
  assetCode: string,
  issuerPublicKey?: string
): Promise<string> {
  try {
    const account = await horizonServer.loadAccount(userPublicKey);
    
    if (assetCode === "XLM" || assetCode === "native") {
      // Get native XLM balance
      const xlmBalance = account.balances.find(
        (balance: any) => balance.asset_type === "native"
      );
      return xlmBalance ? xlmBalance.balance : "0";
    }

    // Get custom asset balance
    const assetBalance = account.balances.find(
      (balance: any) =>
        balance.asset_type !== "native" &&
        balance.asset_code === assetCode &&
        balance.asset_issuer === issuerPublicKey
    );

    return assetBalance ? assetBalance.balance : "0";
  } catch (error: any) {
    console.error("Error getting asset balance:", error);
    return "0";
  }
}
