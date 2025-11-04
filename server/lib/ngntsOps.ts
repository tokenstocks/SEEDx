/**
 * NGNTS Operations
 * Functions for transferring NGNTS tokens between wallets
 */

import { Keypair, Asset, Operation, TransactionBuilder, BASE_FEE, Networks, Memo } from "stellar-sdk";
import { horizonServer, isTestnet } from "./stellarConfig";
import { decrypt } from "./encryption";
import { db } from "../db";
import { platformWallets, wallets } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Ensure user has NGNTS trustline established
 */
export async function ensureNgntsTrustline(
  userPublicKey: string,
  userSecretEncrypted: string,
  treasuryPublicKey: string
): Promise<string | null> {
  try {
    // Check if trustline already exists on blockchain
    const account = await horizonServer.loadAccount(userPublicKey);
    const ngntsBalance = account.balances.find(
      (balance) => {
        if (balance.asset_type === "liquidity_pool_shares") {
          return false;
        }
        return balance.asset_code === "NGNTS" && balance.asset_issuer === treasuryPublicKey;
      }
    );

    if (ngntsBalance !== undefined) {
      console.log(`[NGNTS] Trustline already exists for ${userPublicKey}`);
      return null; // Trustline exists
    }

    // Create trustline
    console.log(`[NGNTS] Creating trustline for ${userPublicKey}`);

    const userSecret = decrypt(userSecretEncrypted);
    const userKeypair = Keypair.fromSecret(userSecret);

    const ngntsAsset = new Asset("NGNTS", treasuryPublicKey);

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: isTestnet ? Networks.TESTNET : Networks.PUBLIC,
    })
      .addOperation(
        Operation.changeTrust({
          asset: ngntsAsset,
        })
      )
      .setTimeout(30)
      .build();

    transaction.sign(userKeypair);

    const result = await horizonServer.submitTransaction(transaction);

    console.log(`[NGNTS] Trustline created: ${result.hash}`);
    return result.hash;
  } catch (error: any) {
    console.error("[NGNTS] Trustline creation failed:", error);
    throw new Error(`Failed to create NGNTS trustline: ${error.message}`);
  }
}

/**
 * Transfer NGNTS from Distribution wallet to user wallet
 */
export async function transferNgnts(
  toPublicKey: string,
  amount: string,
  memo?: string
): Promise<{
  txHash: string;
  amount: string;
}> {
  try {
    console.log(`[NGNTS] Transferring ${amount} NGNTS to ${toPublicKey}`);

    // Get Distribution and Treasury wallets
    const [distributionWallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "distribution"))
      .limit(1);

    const [treasuryWallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "treasury"))
      .limit(1);

    if (!distributionWallet || !treasuryWallet) {
      throw new Error("Platform wallets not found");
    }

    // Decrypt Distribution wallet secret
    const distributionSecret = decrypt(distributionWallet.encryptedSecretKey);
    const distributionKeypair = Keypair.fromSecret(distributionSecret);

    // Create NGNTS asset (issued by Treasury)
    const ngntsAsset = new Asset("NGNTS", treasuryWallet.publicKey);

    // Load Distribution account
    const distributionAccount = await horizonServer.loadAccount(
      distributionWallet.publicKey
    );

    // Build payment transaction
    const txBuilder = new TransactionBuilder(distributionAccount, {
      fee: BASE_FEE,
      networkPassphrase: isTestnet ? Networks.TESTNET : Networks.PUBLIC,
    })
      .addOperation(
        Operation.payment({
          destination: toPublicKey,
          asset: ngntsAsset,
          amount: amount,
        })
      )
      .setTimeout(30);

    // Add memo if provided
    if (memo) {
      txBuilder.addMemo(Memo.text(memo));
    }

    const transaction = txBuilder.build();
    transaction.sign(distributionKeypair);

    // Submit transaction
    const result = await horizonServer.submitTransaction(transaction);

    console.log(`[NGNTS] Transfer successful: ${result.hash}`);

    return {
      txHash: result.hash,
      amount,
    };
  } catch (error: any) {
    console.error("[NGNTS] Transfer failed:", error);
    
    if (error.response && error.response.data) {
      console.error("[NGNTS] Error details:", JSON.stringify(error.response.data, null, 2));
    }
    
    throw new Error(`Failed to transfer NGNTS: ${error.message}`);
  }
}

/**
 * Credit NGNTS to user after deposit approval
 * This function:
 * 1. Ensures user has NGNTS trustline
 * 2. Transfers NGNTS from Distribution wallet
 * 3. Updates database balances
 */
export async function creditNgntsDeposit(
  userId: string,
  amount: string,
  transactionId: string
): Promise<{
  trustlineTxHash: string | null;
  transferTxHash: string;
  amount: string;
}> {
  try {
    console.log(`[NGNTS] Credit deposit - User: ${userId}, Amount: ${amount}`);

    // Get user's wallet
    const [userWallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    if (!userWallet || !userWallet.cryptoWalletPublicKey || !userWallet.cryptoWalletSecretEncrypted) {
      throw new Error("User wallet not found or not configured");
    }

    // Get Treasury wallet for NGNTS issuer
    const [treasuryWallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "treasury"))
      .limit(1);

    if (!treasuryWallet) {
      throw new Error("Treasury wallet not found");
    }

    // Step 1: Ensure trustline exists
    let trustlineTxHash: string | null = null;
    try {
      trustlineTxHash = await ensureNgntsTrustline(
        userWallet.cryptoWalletPublicKey,
        userWallet.cryptoWalletSecretEncrypted,
        treasuryWallet.publicKey
      );
    } catch (error: any) {
      // If trustline creation fails, this is critical - payment will fail
      console.error(`[NGNTS] Trustline creation failed: ${error.message}`);
      throw new Error(`Failed to establish NGNTS trustline: ${error.message}`);
    }

    // Step 2: Transfer NGNTS from Distribution wallet to user
    // Stellar text memos are max 28 bytes, so use first 8 chars of transaction ID
    const shortTxId = transactionId.substring(0, 8);
    const { txHash: transferTxHash } = await transferNgnts(
      userWallet.cryptoWalletPublicKey,
      amount,
      `DEP-${shortTxId}` // e.g., "DEP-18fb693d" = 12 bytes (safe)
    );

    // Step 3: Update database balance
    const currencyKey = "NGNTS";
    await db
      .update(wallets)
      .set({
        cryptoBalances: sql.raw(`
          jsonb_set(
            COALESCE(crypto_balances, '{}'::jsonb),
            ARRAY['${currencyKey}'],
            to_jsonb(
              COALESCE(
                (crypto_balances->>'${currencyKey}')::numeric,
                0
              ) + ${Number(amount)}
            )
          )
        `),
        updatedAt: new Date(),
      })
      .where(eq(wallets.userId, userId));

    console.log(`[NGNTS] Deposit credited successfully`);

    return {
      trustlineTxHash,
      transferTxHash,
      amount,
    };
  } catch (error: any) {
    console.error("[NGNTS] Credit deposit failed:", error);
    throw error;
  }
}

/**
 * Burn NGNTS from user wallet (for NGN withdrawals)
 * This function:
 * 1. Sends NGNTS from user's wallet back to Treasury (issuer)
 * 2. This effectively burns the tokens (sending to issuer removes from circulation)
 * 3. Updates database balances
 * 
 * Important: In Stellar, sending tokens back to the issuer burns them
 */
export async function burnNgnts(
  userId: string,
  amount: string,
  transactionId: string
): Promise<{
  burnTxHash: string;
  amount: string;
}> {
  try {
    console.log(`[NGNTS] Burn withdrawal - User: ${userId}, Amount: ${amount}`);

    // Get user's wallet
    const [userWallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    if (!userWallet || !userWallet.cryptoWalletPublicKey || !userWallet.cryptoWalletSecretEncrypted) {
      throw new Error("User wallet not found or not configured");
    }

    // Get Treasury wallet (NGNTS issuer - sending back here burns the tokens)
    const [treasuryWallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "treasury"))
      .limit(1);

    if (!treasuryWallet) {
      throw new Error("Treasury wallet not found");
    }

    // Decrypt user's wallet secret
    const userSecret = decrypt(userWallet.cryptoWalletSecretEncrypted);
    const userKeypair = Keypair.fromSecret(userSecret);

    // Create NGNTS asset (issued by Treasury)
    const ngntsAsset = new Asset("NGNTS", treasuryWallet.publicKey);

    // Load user's account
    const userAccount = await horizonServer.loadAccount(userWallet.cryptoWalletPublicKey);

    // Build burn transaction (send NGNTS back to issuer = burn)
    // Stellar text memos are max 28 bytes, so use first 8 chars of transaction ID
    const shortTxId = transactionId.substring(0, 8);
    const transaction = new TransactionBuilder(userAccount, {
      fee: BASE_FEE,
      networkPassphrase: isTestnet ? Networks.TESTNET : Networks.PUBLIC,
    })
      .addOperation(
        Operation.payment({
          destination: treasuryWallet.publicKey, // Send to issuer = burn
          asset: ngntsAsset,
          amount: amount,
        })
      )
      .addMemo(Memo.text(`WTH-${shortTxId}`)) // e.g., "WTH-18fb693d" = 12 bytes (safe)
      .setTimeout(30)
      .build();

    transaction.sign(userKeypair);

    // Submit transaction
    const result = await horizonServer.submitTransaction(transaction);

    console.log(`[NGNTS] Burn successful: ${result.hash}`);

    // Update database balance (deduct NGNTS)
    const currencyKey = "NGNTS";
    await db
      .update(wallets)
      .set({
        cryptoBalances: sql.raw(`
          jsonb_set(
            COALESCE(crypto_balances, '{}'::jsonb),
            ARRAY['${currencyKey}'],
            to_jsonb(
              COALESCE(
                (crypto_balances->>'${currencyKey}')::numeric,
                0
              ) - ${Number(amount)}
            )
          )
        `),
        updatedAt: new Date(),
      })
      .where(eq(wallets.userId, userId));

    console.log(`[NGNTS] Balance updated after burn`);

    return {
      burnTxHash: result.hash,
      amount,
    };
  } catch (error: any) {
    console.error("[NGNTS] Burn failed:", error);
    
    if (error.response && error.response.data) {
      console.error("[NGNTS] Error details:", JSON.stringify(error.response.data, null, 2));
    }
    
    throw new Error(`Failed to burn NGNTS: ${error.message}`);
  }
}
