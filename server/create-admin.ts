import { db } from "./db";
import { users, wallets } from "../shared/schema";
import bcrypt from "bcrypt";
import { Keypair } from "stellar-sdk";
import { encrypt } from "./lib/encryption";
import { createAndFundAccount } from "./lib/stellarAccount";

const SALT_ROUNDS = 10;

async function createAdminAccount() {
  console.log("🔐 Creating admin account...");

  const adminData = {
    email: "admin2@seedx.com",
    phone: "+23481234567890",
    password: "password123@",
    firstName: "Admin",
    lastName: "User",
    role: "admin" as const,
    isLpInvestor: false,
  };

  try {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, adminData.email),
    });

    if (existingUser) {
      console.log("❌ User with this email already exists");
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminData.password, SALT_ROUNDS);

    // Generate Stellar keypair for user identity
    const stellarKeypair = Keypair.random();
    const stellarPublicKey = stellarKeypair.publicKey();
    const stellarSecretKey = stellarKeypair.secret();
    const stellarSecretKeyEncrypted = encrypt(stellarSecretKey);

    // Create user with admin role
    const [newUser] = await db
      .insert(users)
      .values({
        email: adminData.email,
        phone: adminData.phone,
        passwordHash,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        role: adminData.role,
        kycStatus: "approved", // Auto-approve KYC for admin
        stellarPublicKey,
        stellarSecretKeyEncrypted,
        isLpInvestor: adminData.isLpInvestor,
      })
      .returning();

    console.log("✅ Admin user created:", {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    // Create wallet
    const walletKeypair = Keypair.random();
    const cryptoWalletPublicKey = walletKeypair.publicKey();
    const cryptoWalletSecretEncrypted = encrypt(walletKeypair.secret());

    const [newWallet] = await db
      .insert(wallets)
      .values({
        userId: newUser.id,
        fiatBalance: "0.00",
        cryptoBalances: {},
        cryptoWalletPublicKey,
        cryptoWalletSecretEncrypted,
      })
      .returning();

    console.log("✅ Wallet created:", {
      id: newWallet.id,
      publicKey: cryptoWalletPublicKey,
    });

    // Activate wallet on Stellar testnet (async)
    console.log("🌟 Activating Stellar wallet...");
    const result = await createAndFundAccount(cryptoWalletPublicKey, "2");
    
    if (result.success) {
      console.log(`✅ Wallet activated: ${result.txHash || 'already exists'}`);
    } else {
      console.warn(`⚠️  Wallet activation failed: ${result.error}`);
      console.warn("   You can activate it later from the admin panel");
    }

    console.log("\n🎉 Admin account created successfully!");
    console.log("\n📋 Account Details:");
    console.log("   Email:", adminData.email);
    console.log("   Password:", adminData.password);
    console.log("   Role:", adminData.role);
    console.log("   Stellar Public Key:", stellarPublicKey);
    console.log("   Wallet Public Key:", cryptoWalletPublicKey);
    console.log("\n⚠️  IMPORTANT: Please change the password after first login!");
    console.log("   Login at: /login");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin account:", error);
    process.exit(1);
  }
}

createAdminAccount();
