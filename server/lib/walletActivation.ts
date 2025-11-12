import * as StellarSdk from "stellar-sdk";
import { horizonServer, NETWORK_PASSPHRASE } from "./stellarConfig";
import { decrypt } from "./encryption";
import { db } from "../db";
import { wallets, platformWallets } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

interface WalletActivationResult {
  success: boolean;
  txHashes: string[];
  error?: string;
  alreadyActivated?: boolean;
}

/**
 * Activate a regenerator wallet with account creation and trustlines
 * 
 * @param userPublicKey - User's Stellar public key
 * @param startingBalance - XLM to fund account with (default: "2")
 * @returns Activation result with transaction hashes
 * 
 * @description
 * This function performs a complete wallet activation in one orchestrated flow:
 * 1. Creates the Stellar account (if not exists)
 * 2. Establishes NGNTS trustline
 * 3. Establishes USDC trustline
 * 
 * All operations are bundled into minimal transactions to reduce fees.
 */
export async function activateRegeneratorWallet(
  userPublicKey: string,
  startingBalance: string = "2"
): Promise<WalletActivationResult> {
  const txHashes: string[] = [];

  try {
    console.log(`🚀 Activating wallet ${userPublicKey.substring(0, 8)}...`);

    // Validate inputs
    if (!userPublicKey || !userPublicKey.startsWith("G") || userPublicKey.length !== 56) {
      return {
        success: false,
        txHashes: [],
        error: "Invalid public key format",
      };
    }

    // Get user wallet from database
    const [userWallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.cryptoWalletPublicKey, userPublicKey))
      .limit(1);

    if (!userWallet || !userWallet.cryptoWalletSecretEncrypted) {
      return {
        success: false,
        txHashes: [],
        error: "User wallet not found in database",
      };
    }

    // Decrypt user's secret key
    const userSecret = decrypt(userWallet.cryptoWalletSecretEncrypted);
    const userKeypair = StellarSdk.Keypair.fromSecret(userSecret);

    // Get Operations wallet for funding
    const [operationsWallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletRole, "operations"))
      .limit(1);

    if (!operationsWallet || !operationsWallet.encryptedSecretKey) {
      return {
        success: false,
        txHashes: [],
        error: "Operations wallet not configured",
      };
    }

    const operationsSecret = decrypt(operationsWallet.encryptedSecretKey);
    const operationsKeypair = StellarSdk.Keypair.fromSecret(operationsSecret);

    // Get Treasury wallet for NGNTS issuer
    const [treasuryWallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletRole, "treasury"))
      .limit(1);

    if (!treasuryWallet) {
      return {
        success: false,
        txHashes: [],
        error: "Treasury wallet not configured",
      };
    }

    // Check if account already exists
    let accountExists = false;
    let existingAccount;
    try {
      existingAccount = await horizonServer.loadAccount(userPublicKey);
      accountExists = true;
      console.log(`   ℹ️  Account already exists on Stellar`);
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // Account doesn't exist - this is expected
        accountExists = false;
      } else {
        throw error;
      }
    }

    // Step 1: Create account if needed
    if (!accountExists) {
      console.log(`   1️⃣  Creating account with ${startingBalance} XLM...`);
      
      const operationsAccount = await horizonServer.loadAccount(operationsKeypair.publicKey());

      const createAccountTx = new StellarSdk.TransactionBuilder(operationsAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.createAccount({
            destination: userPublicKey,
            startingBalance: startingBalance,
          })
        )
        .setTimeout(30)
        .build();

      createAccountTx.sign(operationsKeypair);
      const createResult = await horizonServer.submitTransaction(createAccountTx);
      txHashes.push(createResult.hash);
      console.log(`      ✅ Account created! TX: ${createResult.hash}`);

      // Load the newly created account
      existingAccount = await horizonServer.loadAccount(userPublicKey);
    }

    // Step 2: Create trustlines (bundled in single transaction)
    console.log(`   2️⃣  Establishing trustlines...`);

    const ngntsAsset = new StellarSdk.Asset("NGNTS", treasuryWallet.publicKey);
    const usdcIssuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"; // Testnet USDC
    const usdcAsset = new StellarSdk.Asset("USDC", usdcIssuer);

    // Check existing trustlines
    const existingNGNTS = existingAccount!.balances.find(
      (b: any) => b.asset_type !== "native" && b.asset_code === "NGNTS" && b.asset_issuer === treasuryWallet.publicKey
    );
    const existingUSDC = existingAccount!.balances.find(
      (b: any) => b.asset_type !== "native" && b.asset_code === "USDC" && b.asset_issuer === usdcIssuer
    );

    const needsNGNTS = !existingNGNTS;
    const needsUSDC = !existingUSDC;

    if (needsNGNTS || needsUSDC) {
      // Reload account for latest sequence number
      const userAccount = await horizonServer.loadAccount(userPublicKey);
      
      const trustlineTxBuilder = new StellarSdk.TransactionBuilder(userAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      if (needsNGNTS) {
        trustlineTxBuilder.addOperation(
          StellarSdk.Operation.changeTrust({
            asset: ngntsAsset,
          })
        );
        console.log(`      ➕ Adding NGNTS trustline`);
      }

      if (needsUSDC) {
        trustlineTxBuilder.addOperation(
          StellarSdk.Operation.changeTrust({
            asset: usdcAsset,
          })
        );
        console.log(`      ➕ Adding USDC trustline`);
      }

      const trustlineTx = trustlineTxBuilder.setTimeout(30).build();
      trustlineTx.sign(userKeypair);
      
      const trustlineResult = await horizonServer.submitTransaction(trustlineTx);
      txHashes.push(trustlineResult.hash);
      console.log(`      ✅ Trustlines established! TX: ${trustlineResult.hash}`);
    } else {
      console.log(`      ℹ️  All trustlines already exist`);
    }

    // Update wallet activation status in database
    await db
      .update(wallets)
      .set({
        activationStatus: "active",
        activationTxHash: txHashes[0] || null,
        updatedAt: new Date(),
      })
      .where(eq(wallets.cryptoWalletPublicKey, userPublicKey));

    console.log(`   ✅ Wallet activation complete!`);

    return {
      success: true,
      txHashes,
      alreadyActivated: accountExists && !needsNGNTS && !needsUSDC,
    };
  } catch (error: any) {
    console.error("❌ Wallet activation failed:", error);

    if (error.response && error.response.data) {
      console.error("   Stellar error details:", JSON.stringify(error.response.data, null, 2));
    }

    return {
      success: false,
      txHashes,
      error: error.message || "Unknown activation error",
    };
  }
}
