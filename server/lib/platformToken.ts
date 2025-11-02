import * as StellarSdk from "stellar-sdk";
import { horizonServer, NETWORK_PASSPHRASE } from "./stellarConfig";
import { decrypt } from "./encryption";
import { db } from "../db";
import { platformWallets } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Issue NGNTS token from Treasury wallet and establish trustline with Distribution wallet
 * Sets authorization flags on Treasury account for proper asset control
 * 
 * @returns Result object with transaction hashes
 */
export async function issueNGNTS(): Promise<{
  success: boolean;
  authFlagsTxHash?: string;
  trustlineTxHash?: string;
  error?: string;
}> {
  try {
    console.log("🌟 Issuing NGNTS token...");

    // Get Treasury and Distribution wallets from database
    const [treasuryWallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "treasury"));

    const [distributionWallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "distribution"));

    if (!treasuryWallet || !distributionWallet) {
      throw new Error("Treasury or Distribution wallet not found");
    }

    // Decrypt secret keys
    const treasurySecret = decrypt(treasuryWallet.encryptedSecretKey);
    const distributionSecret = decrypt(distributionWallet.encryptedSecretKey);
    const treasuryKeypair = StellarSdk.Keypair.fromSecret(treasurySecret);
    const distributionKeypair = StellarSdk.Keypair.fromSecret(distributionSecret);

    // Create NGNTS asset (Treasury is the issuer)
    const ngntsAsset = new StellarSdk.Asset("NGNTS", treasuryWallet.publicKey);

    console.log(`1️⃣  Treasury (issuer): ${treasuryWallet.publicKey.substring(0, 8)}...`);
    console.log(`2️⃣  Distribution (holder): ${distributionWallet.publicKey.substring(0, 8)}...`);

    // Step 1: Set authorization flags on Treasury account (issuer)
    console.log(`3️⃣  Setting authorization flags on Treasury account...`);
    const treasuryAccount = await horizonServer.loadAccount(treasuryWallet.publicKey);
    
    const authFlagsTransaction = new StellarSdk.TransactionBuilder(treasuryAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.setOptions({
          setFlags: StellarSdk.AuthRevocableFlag,
        })
      )
      .setTimeout(30)
      .build();

    authFlagsTransaction.sign(treasuryKeypair);
    const authFlagsResult = await horizonServer.submitTransaction(authFlagsTransaction);
    const authFlagsTxHash = authFlagsResult.hash;
    
    console.log(`   ✅ Auth flags set: ${authFlagsTxHash}`);

    // Step 2: Distribution wallet establishes trustline to NGNTS
    console.log(`4️⃣  Creating trustline from Distribution to Treasury...`);
    const distributionAccount = await horizonServer.loadAccount(distributionWallet.publicKey);
    
    const trustlineTransaction = new StellarSdk.TransactionBuilder(distributionAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: ngntsAsset,
          // No limit = unlimited trust
        })
      )
      .setTimeout(30)
      .build();

    trustlineTransaction.sign(distributionKeypair);
    const trustlineResult = await horizonServer.submitTransaction(trustlineTransaction);
    const trustlineTxHash = trustlineResult.hash;
    
    console.log(`   ✅ Trustline created: ${trustlineTxHash}`);

    // Step 3: Authorize Distribution account to hold NGNTS
    console.log(`5️⃣  Authorizing Distribution account...`);
    const treasuryAccountRefresh = await horizonServer.loadAccount(treasuryWallet.publicKey);
    
    const authorizeTransaction = new StellarSdk.TransactionBuilder(treasuryAccountRefresh, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.setTrustLineFlags({
          trustor: distributionWallet.publicKey,
          asset: ngntsAsset,
          flags: {
            authorized: true,
          },
        })
      )
      .setTimeout(30)
      .build();

    authorizeTransaction.sign(treasuryKeypair);
    await horizonServer.submitTransaction(authorizeTransaction);
    
    console.log(`   ✅ Distribution account authorized`);

    console.log(`✅ NGNTS token issued successfully!`);
    console.log(`   Asset Code: NGNTS`);
    console.log(`   Issuer: ${treasuryWallet.publicKey}`);
    console.log(`   Distribution: ${distributionWallet.publicKey}`);

    return {
      success: true,
      authFlagsTxHash,
      trustlineTxHash,
    };
  } catch (error: any) {
    console.error("❌ Error issuing NGNTS:", error);
    return {
      success: false,
      error: error.message || "Unknown error during NGNTS issuance",
    };
  }
}

/**
 * Mint NGNTS tokens by sending from Treasury to Distribution wallet
 * Updates Distribution wallet balance in database after minting
 * 
 * @param amount Amount of NGNTS to mint (as string)
 * @returns Transaction hash and updated balance
 */
export async function mintNGNTS(amount: string): Promise<{
  success: boolean;
  txHash?: string;
  newBalance?: string;
  error?: string;
}> {
  try {
    console.log(`💰 Minting ${amount} NGNTS...`);

    // Get Treasury and Distribution wallets
    const [treasuryWallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "treasury"));

    const [distributionWallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "distribution"));

    if (!treasuryWallet || !distributionWallet) {
      throw new Error("Treasury or Distribution wallet not found");
    }

    // Decrypt Treasury secret
    const treasurySecret = decrypt(treasuryWallet.encryptedSecretKey);
    const treasuryKeypair = StellarSdk.Keypair.fromSecret(treasurySecret);

    // Create NGNTS asset
    const ngntsAsset = new StellarSdk.Asset("NGNTS", treasuryWallet.publicKey);

    // Mint by sending from Treasury to Distribution
    const treasuryAccount = await horizonServer.loadAccount(treasuryWallet.publicKey);
    
    const mintTransaction = new StellarSdk.TransactionBuilder(treasuryAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: distributionWallet.publicKey,
          asset: ngntsAsset,
          amount,
        })
      )
      .setTimeout(30)
      .build();

    mintTransaction.sign(treasuryKeypair);
    const mintResult = await horizonServer.submitTransaction(mintTransaction);
    const txHash = mintResult.hash;
    
    console.log(`   ✅ Minted ${amount} NGNTS: ${txHash}`);

    // Sync Distribution wallet balance from Horizon
    const distributionAccount = await horizonServer.loadAccount(distributionWallet.publicKey);
    const ngntsBalance = distributionAccount.balances.find(
      (b: any) => b.asset_code === "NGNTS" && b.asset_issuer === treasuryWallet.publicKey
    );
    const newBalance = ngntsBalance ? ngntsBalance.balance : "0";

    // Update database with new balance
    await db
      .update(platformWallets)
      .set({
        balanceNGNTS: newBalance,
        lastSyncedAt: new Date(),
      })
      .where(eq(platformWallets.id, distributionWallet.id));

    console.log(`   💾 Updated database: ${newBalance} NGNTS`);

    return {
      success: true,
      txHash,
      newBalance,
    };
  } catch (error: any) {
    console.error("❌ Error minting NGNTS:", error);
    return {
      success: false,
      error: error.message || "Unknown error during NGNTS minting",
    };
  }
}
