import * as StellarSdk from "stellar-sdk";
import { horizonServer, NETWORK_PASSPHRASE, isTestnet } from "./stellarConfig";
import { decrypt } from "./encryption";
import { db } from "../db";
import { users, wallets } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Response type for account creation operations
 */
export interface CreateAccountResponse {
  success: boolean;
  txHash?: string;
  error?: string;
  alreadyExists?: boolean;
}

/**
 * Get the Admin wallet credentials for funding operations
 * @returns Admin keypair or null if not found
 */
async function getAdminKeypair(): Promise<StellarSdk.Keypair | null> {
  try {
    // Find the admin user
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);

    if (!adminUser) {
      console.error("❌ Admin user not found");
      return null;
    }

    // Get admin's wallet
    const [adminWallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, adminUser.id))
      .limit(1);

    if (!adminWallet || !adminWallet.cryptoWalletSecretEncrypted) {
      console.error("❌ Admin wallet or secret key not found");
      return null;
    }

    // Decrypt the secret key
    const secretKey = decrypt(adminWallet.cryptoWalletSecretEncrypted);
    return StellarSdk.Keypair.fromSecret(secretKey);
  } catch (error: any) {
    console.error("❌ Error getting admin keypair:", error.message);
    return null;
  }
}

/**
 * Create and fund a Stellar account on the network
 * 
 * @param publicKey - The public key of the account to create
 * @param startingBalance - Starting balance in XLM (default: "2")
 * @returns Result object with success status, transaction hash, and error details
 * 
 * @example
 * ```typescript
 * const result = await createAndFundAccount("GABC...", "5");
 * if (result.success) {
 *   console.log("Account created:", result.txHash);
 * }
 * ```
 */
export async function createAndFundAccount(
  publicKey: string,
  startingBalance: string = "2"
): Promise<CreateAccountResponse> {
  try {
    // Validate inputs
    if (!publicKey || publicKey.length !== 56 || !publicKey.startsWith("G")) {
      return {
        success: false,
        error: "Invalid public key format",
      };
    }

    // Validate starting balance
    const balanceNum = parseFloat(startingBalance);
    if (isNaN(balanceNum) || balanceNum < 1) {
      return {
        success: false,
        error: "Starting balance must be at least 1 XLM",
      };
    }

    // Check if account already exists on Stellar
    try {
      await horizonServer.loadAccount(publicKey);
      console.log(`ℹ️  Account ${publicKey.substring(0, 8)}... already exists on-chain`);
      return {
        success: true,
        alreadyExists: true,
        txHash: undefined, // No new transaction was created
      };
    } catch (error: any) {
      // Account doesn't exist - this is expected for new accounts
      if (error.response && error.response.status === 404) {
        // Continue to account creation
      } else {
        throw error; // Re-throw unexpected errors
      }
    }

    // Get admin keypair for funding
    const adminKeypair = await getAdminKeypair();
    if (!adminKeypair) {
      return {
        success: false,
        error: "Admin wallet not configured for funding operations",
      };
    }

    console.log(`🔄 Creating account ${publicKey.substring(0, 8)}... with ${startingBalance} XLM...`);

    // Load admin account from Stellar
    const adminAccount = await horizonServer.loadAccount(adminKeypair.publicKey());

    // Build transaction
    const transaction = new StellarSdk.TransactionBuilder(adminAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.createAccount({
          destination: publicKey,
          startingBalance: startingBalance,
        })
      )
      .setTimeout(30) // 30 second timeout
      .build();

    // Sign transaction
    transaction.sign(adminKeypair);

    // Submit to Stellar network
    const result = await horizonServer.submitTransaction(transaction);

    console.log(`✅ Account created successfully! TX: ${result.hash}`);

    return {
      success: true,
      txHash: result.hash,
      alreadyExists: false,
    };
  } catch (error: any) {
    console.error("❌ Error creating account:", error);

    // Handle specific Stellar errors
    if (error.response && error.response.data) {
      const errorData = error.response.data;
      
      // Account already exists error (op_already_exists)
      if (errorData.extras && errorData.extras.result_codes) {
        const resultCodes = errorData.extras.result_codes;
        if (resultCodes.operations && resultCodes.operations.includes("op_already_exists")) {
          console.log(`ℹ️  Account ${publicKey.substring(0, 8)}... already exists (detected via error)`);
          return {
            success: true,
            alreadyExists: true,
          };
        }
      }

      return {
        success: false,
        error: `Stellar error: ${errorData.title || error.message}`,
      };
    }

    return {
      success: false,
      error: error.message || "Unknown error creating account",
    };
  }
}

/**
 * Check if a Stellar account exists on the network
 * 
 * @param publicKey - The public key to check
 * @returns True if account exists, false otherwise
 */
export async function accountExists(publicKey: string): Promise<boolean> {
  try {
    await horizonServer.loadAccount(publicKey);
    return true;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return false;
    }
    throw error; // Re-throw unexpected errors
  }
}

/**
 * Get account balance information from Stellar network
 * 
 * @param publicKey - The public key to query
 * @returns Account balances or null if account doesn't exist
 */
export async function getAccountBalances(publicKey: string): Promise<any[] | null> {
  try {
    const account = await horizonServer.loadAccount(publicKey);
    return account.balances;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error;
  }
}
