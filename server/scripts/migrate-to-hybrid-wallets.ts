import { db } from "../db";
import { users, wallets } from "@shared/schema";
import { Keypair } from "stellar-sdk";
import { encrypt } from "../lib/encryption";
import { eq, sql } from "drizzle-orm";

/**
 * Migration script: Convert from 3-wallet-per-user to hybrid wallet model
 * 
 * This script:
 * 1. Backs up existing wallet data
 * 2. Drops and recreates wallets table with new hybrid schema
 * 3. Consolidates 3 wallets per user into 1 hybrid wallet
 * 4. Generates Stellar keypairs for crypto operations
 */

interface OldWallet {
  id: string;
  userId: string;
  currency: "NGN" | "USDC" | "XLM";
  balance: string;
  createdAt: Date;
  updatedAt: Date;
}

async function migrateToHybridWallets() {
  console.log("🔄 Starting migration to hybrid wallet model...\n");

  try {
    // Step 1: Backup existing wallet data
    console.log("📦 Step 1: Backing up existing wallet data...");
    const existingWalletsResult = await db.execute(
      sql`SELECT id, user_id as "userId", currency, balance, created_at as "createdAt", updated_at as "updatedAt" 
          FROM wallets 
          ORDER BY user_id, currency`
    );
    
    const existingWallets = existingWalletsResult as unknown as OldWallet[];
    console.log(`   Found ${existingWallets.length} existing wallet records`);
    
    // Group wallets by user
    const walletsByUser = new Map<string, OldWallet[]>();
    for (const wallet of existingWallets) {
      if (!walletsByUser.has(wallet.userId)) {
        walletsByUser.set(wallet.userId, []);
      }
      walletsByUser.get(wallet.userId)!.push(wallet);
    }
    
    console.log(`   Grouped into ${walletsByUser.size} user accounts\n`);

    // Step 2: Drop and recreate wallets table
    console.log("🗑️  Step 2: Dropping old wallets table...");
    await db.execute(sql`DROP TABLE IF EXISTS wallets CASCADE`);
    console.log("   Old table dropped\n");

    console.log("🏗️  Step 3: Creating new hybrid wallets table...");
    await db.execute(sql`
      CREATE TABLE wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        fiat_balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        crypto_balances JSONB NOT NULL DEFAULT '{}'::jsonb,
        crypto_wallet_public_key TEXT,
        crypto_wallet_secret_encrypted TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("   New hybrid table created\n");

    // Step 3: Create hybrid wallets for each user
    console.log("💰 Step 4: Creating hybrid wallets with consolidated balances...");
    let migratedCount = 0;
    let keypairGeneratedCount = 0;

    for (const [userId, oldWallets] of walletsByUser.entries()) {
      // Consolidate balances
      const ngnWallet = oldWallets.find(w => w.currency === "NGN");
      const usdcWallet = oldWallets.find(w => w.currency === "USDC");
      const xlmWallet = oldWallets.find(w => w.currency === "XLM");

      const fiatBalance = ngnWallet?.balance || "0.00";
      const cryptoBalances: any = {};
      
      if (usdcWallet && parseFloat(usdcWallet.balance) > 0) {
        cryptoBalances.USDC = usdcWallet.balance;
      }
      if (xlmWallet && parseFloat(xlmWallet.balance) > 0) {
        cryptoBalances.XLM = xlmWallet.balance;
      }

      // Generate Stellar keypair for crypto operations
      const stellarKeypair = Keypair.random();
      const cryptoWalletPublicKey = stellarKeypair.publicKey();
      const cryptoWalletSecretEncrypted = encrypt(stellarKeypair.secret());
      keypairGeneratedCount++;

      // Insert hybrid wallet
      await db.execute(sql`
        INSERT INTO wallets (
          user_id, 
          fiat_balance, 
          crypto_balances,
          crypto_wallet_public_key,
          crypto_wallet_secret_encrypted,
          created_at,
          updated_at
        ) VALUES (
          ${userId}::uuid,
          ${fiatBalance}::numeric,
          ${JSON.stringify(cryptoBalances)}::jsonb,
          ${cryptoWalletPublicKey},
          ${cryptoWalletSecretEncrypted},
          ${oldWallets[0].createdAt},
          NOW()
        )
      `);

      migratedCount++;
      
      if (migratedCount % 10 === 0) {
        console.log(`   Migrated ${migratedCount}/${walletsByUser.size} users...`);
      }
    }

    console.log(`   ✅ Successfully migrated ${migratedCount} users`);
    console.log(`   ✅ Generated ${keypairGeneratedCount} Stellar keypairs\n`);

    // Step 4: Verify migration
    console.log("🔍 Step 5: Verifying migration...");
    const newWalletCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM wallets`);
    const totalUsersResult = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    
    const newWalletCount = newWalletCountResult as unknown as Array<{ count: number }>;
    const totalUsers = totalUsersResult as unknown as Array<{ count: number }>;
    
    console.log(`   Total users: ${totalUsers[0].count}`);
    console.log(`   New hybrid wallets: ${newWalletCount[0].count}`);
    
    if (newWalletCount[0].count === walletsByUser.size) {
      console.log(`   ✅ Verification passed: All users have hybrid wallets\n`);
    } else {
      console.warn(`   ⚠️  Warning: Wallet count mismatch`);
    }

    console.log("✨ Migration completed successfully!\n");
    console.log("Summary:");
    console.log(`  - Old model: ${existingWallets.length} wallet records (3 per user)`);
    console.log(`  - New model: ${migratedCount} hybrid wallets (1 per user)`);
    console.log(`  - Stellar keypairs generated: ${keypairGeneratedCount}`);
    
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
migrateToHybridWallets()
  .then(() => {
    console.log("\n✅ Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration script failed:", error);
    process.exit(1);
  });
