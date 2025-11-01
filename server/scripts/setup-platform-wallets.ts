import { db } from "../db";
import { users, wallets } from "@shared/schema";
import { Keypair } from "stellar-sdk";
import { encrypt } from "../lib/encryption";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

/**
 * Setup script: Create LP and admin platform wallets
 * 
 * This script creates:
 * 1. LP (Liquidity Provider) user account with hybrid wallet
 * 2. Admin/Platform user account with hybrid wallet
 * 
 * Both wallets get Stellar keypairs for crypto operations
 */

const SALT_ROUNDS = 12;

async function setupPlatformWallets() {
  console.log("🏦 Setting up platform wallets (LP & Admin)...\n");

  try {
    // 1. Create LP user account if it doesn't exist
    console.log("📊 Step 1: Setting up LP (Liquidity Provider) account...");
    
    let lpUser = await db.execute(
      sql`SELECT * FROM users WHERE email = 'lp@tokenstocks.platform' LIMIT 1`
    );
    
    if (Array.isArray(lpUser) && lpUser.length > 0) {
      console.log("   ✓ LP user already exists");
      lpUser = lpUser[0] as any;
    } else {
      const passwordHash = await bcrypt.hash("SecureLPPassword123!", SALT_ROUNDS);
      const stellarKeypair = Keypair.random();
      
      const [newLpUser] = await db
        .insert(users)
        .values({
          email: "lp@tokenstocks.platform",
          phone: "+1-LP-PLATFORM",
          passwordHash,
          firstName: "Liquidity",
          lastName: "Provider",
          role: "admin",
          kycStatus: "approved",
          stellarPublicKey: stellarKeypair.publicKey(),
          stellarSecretKeyEncrypted: encrypt(stellarKeypair.secret()),
        })
        .returning();
      
      lpUser = newLpUser as any;
      console.log(`   ✓ Created LP user: ${lpUser.id}`);
    }

    // 2. Create LP hybrid wallet
    console.log("💰 Step 2: Creating LP hybrid wallet...");
    
    let lpWallet = await db.execute(
      sql`SELECT * FROM wallets WHERE user_id = ${lpUser.id} LIMIT 1`
    );
    
    if (Array.isArray(lpWallet) && lpWallet.length > 0) {
      console.log("   ✓ LP wallet already exists");
      lpWallet = lpWallet[0] as any;
    } else {
      const walletKeypair = Keypair.random();
      
      const [newLpWallet] = await db
        .insert(wallets)
        .values({
          userId: lpUser.id,
          fiatBalance: "0.00",
          cryptoBalances: {},
          cryptoWalletPublicKey: walletKeypair.publicKey(),
          cryptoWalletSecretEncrypted: encrypt(walletKeypair.secret()),
        })
        .returning();
      
      lpWallet = newLpWallet as any;
      console.log(`   ✓ Created LP wallet: ${lpWallet.id}`);
      console.log(`   Stellar Public Key: ${lpWallet.cryptoWalletPublicKey}`);
    }

    // 3. Create Admin/Platform user account
    console.log("\n🔐 Step 3: Setting up Admin/Platform account...");
    
    let adminUser = await db.execute(
      sql`SELECT * FROM users WHERE email = 'admin@tokenstocks.platform' LIMIT 1`
    );
    
    if (Array.isArray(adminUser) && adminUser.length > 0) {
      console.log("   ✓ Admin user already exists");
      adminUser = adminUser[0] as any;
    } else {
      const passwordHash = await bcrypt.hash("SecureAdminPassword123!", SALT_ROUNDS);
      const stellarKeypair = Keypair.random();
      
      const [newAdminUser] = await db
        .insert(users)
        .values({
          email: "admin@tokenstocks.platform",
          phone: "+1-ADMIN-PLATFORM",
          passwordHash,
          firstName: "Platform",
          lastName: "Admin",
          role: "admin",
          kycStatus: "approved",
          stellarPublicKey: stellarKeypair.publicKey(),
          stellarSecretKeyEncrypted: encrypt(stellarKeypair.secret()),
        })
        .returning();
      
      adminUser = newAdminUser as any;
      console.log(`   ✓ Created Admin user: ${adminUser.id}`);
    }

    // 4. Create Admin hybrid wallet
    console.log("💰 Step 4: Creating Admin hybrid wallet...");
    
    let adminWallet = await db.execute(
      sql`SELECT * FROM wallets WHERE user_id = ${adminUser.id} LIMIT 1`
    );
    
    if (Array.isArray(adminWallet) && adminWallet.length > 0) {
      console.log("   ✓ Admin wallet already exists");
      adminWallet = adminWallet[0] as any;
    } else {
      const walletKeypair = Keypair.random();
      
      const [newAdminWallet] = await db
        .insert(wallets)
        .values({
          userId: adminUser.id,
          fiatBalance: "0.00",
          cryptoBalances: {},
          cryptoWalletPublicKey: walletKeypair.publicKey(),
          cryptoWalletSecretEncrypted: encrypt(walletKeypair.secret()),
        })
        .returning();
      
      adminWallet = newAdminWallet as any;
      console.log(`   ✓ Created Admin wallet: ${adminWallet.id}`);
      console.log(`   Stellar Public Key: ${adminWallet.cryptoWalletPublicKey}`);
    }

    // 5. Verification summary
    console.log("\n✅ Platform wallets setup complete!\n");
    console.log("Summary:");
    console.log("========================================");
    console.log(`LP Account:`);
    console.log(`  User ID: ${lpUser.id}`);
    console.log(`  Wallet ID: ${lpWallet.id}`);
    console.log(`  Fiat Balance: ${lpWallet.fiat_balance || lpWallet.fiatBalance}`);
    console.log(`  Stellar Key: ${lpWallet.crypto_wallet_public_key || lpWallet.cryptoWalletPublicKey}`);
    console.log(`\nAdmin Account:`);
    console.log(`  User ID: ${adminUser.id}`);
    console.log(`  Wallet ID: ${adminWallet.id}`);
    console.log(`  Fiat Balance: ${adminWallet.fiat_balance || adminWallet.fiatBalance}`);
    console.log(`  Stellar Key: ${adminWallet.crypto_wallet_public_key || adminWallet.cryptoWalletPublicKey}`);
    console.log("========================================\n");
    
  } catch (error: any) {
    console.error("❌ Platform wallet setup failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run setup
setupPlatformWallets()
  .then(() => {
    console.log("✅ Setup script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Setup script failed:", error);
    process.exit(1);
  });
