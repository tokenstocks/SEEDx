import * as StellarSdk from "stellar-sdk";
import { horizonServer, NETWORK_PASSPHRASE, isTestnet } from "./stellarConfig";
import { decrypt } from "./encryption";
import { db } from "../db";
import { platformWallets } from "@shared/schema";
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
 * Get the Operations platform wallet credentials for funding new accounts
 * @returns Operations wallet keypair or null if not found
 */
async function getPlatformFundingKeypair(): Promise<StellarSdk.Keypair | null> {
  try {
    // Get the Operations platform wallet
    const [operationsWallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "operations"))
      .limit(1);

    if (!operationsWallet || !operationsWallet.encryptedSecretKey) {
      console.error("❌ Operations platform wallet not found or secret key missing");
      return null;
    }

    // Decrypt the secret key
    const secretKey = decrypt(operationsWallet.encryptedSecretKey);
    return StellarSdk.Keypair.fromSecret(secretKey);
  } catch (error: any) {
    console.error("❌ Error getting platform funding keypair:", error.message);
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

    // Get Operations platform wallet keypair for funding
    const fundingKeypair = await getPlatformFundingKeypair();
    if (!fundingKeypair) {
      return {
        success: false,
        error: "Operations wallet not configured. Please contact system administrator.",
      };
    }

    console.log(`🔄 Creating account ${publicKey.substring(0, 8)}... with ${startingBalance} XLM...`);

    // Check if the funding wallet exists on Stellar and activate with Friendbot if needed (testnet only)
    let fundingAccount;
    try {
      fundingAccount = await horizonServer.loadAccount(fundingKeypair.publicKey());
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // Funding wallet doesn't exist on-chain
        if (isTestnet) {
          console.log(`⚠️  Operations wallet not found on testnet. Activating with Friendbot...`);
          try {
            // Fund with Friendbot (testnet only)
            const friendbotUrl = `https://friendbot.stellar.org?addr=${fundingKeypair.publicKey()}`;
            const friendbotResponse = await fetch(friendbotUrl);
            if (!friendbotResponse.ok) {
              throw new Error(`Friendbot failed: ${friendbotResponse.statusText}`);
            }
            console.log(`✅ Operations wallet activated with Friendbot!`);
            // Load the newly created account
            fundingAccount = await horizonServer.loadAccount(fundingKeypair.publicKey());
          } catch (friendbotError: any) {
            console.error(`❌ Failed to activate Operations wallet with Friendbot:`, friendbotError);
            return {
              success: false,
              error: "Operations wallet not activated. Friendbot activation failed. Please contact administrator.",
            };
          }
        } else {
          // Mainnet - require manual funding
          return {
            success: false,
            error: "Operations wallet not activated on mainnet. Please fund the Operations wallet manually before proceeding.",
          };
        }
      } else {
        // Other errors
        throw error;
      }
    }

    // Build transaction
    const transaction = new StellarSdk.TransactionBuilder(fundingAccount, {
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
    transaction.sign(fundingKeypair);

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
