import bcrypt from "bcrypt";
import { Keypair } from "stellar-sdk";
import { db } from "../db";
import { users, wallets } from "../../shared/schema";
import { encrypt } from "../lib/encryption";
import { eq } from "drizzle-orm";

async function createAdminUser() {
  const email = "admin@tokenstocks.local";
  const password = "1234567890";
  const firstName = "Admin";
  const lastName = "User";
  const phone = "+9999999999";

  console.log("Creating admin user...");

  // Check if admin user already exists with new email
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    console.log("Admin user already exists with ID:", existingUser[0].id);
    console.log("Email:", existingUser[0].email);
    console.log("Role:", existingUser[0].role);
    
    // Update to admin role if not already
    if (existingUser[0].role !== "admin") {
      await db
        .update(users)
        .set({ role: "admin" })
        .where(eq(users.id, existingUser[0].id));
      console.log("✓ Updated existing user to admin role");
    }
    return;
  }

  // Check for old admin user with email "admin" and update it
  const oldAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin"))
    .limit(1);

  if (oldAdmin.length > 0) {
    console.log("Found old admin user, updating email...");
    const passwordHash = await bcrypt.hash(password, 12);
    await db
      .update(users)
      .set({ 
        email,
        passwordHash,
        role: "admin",
        kycStatus: "approved"
      })
      .where(eq(users.id, oldAdmin[0].id));
    console.log("✓ Updated old admin user to new email:", email);
    console.log("  ID:", oldAdmin[0].id);
    console.log("\nLogin credentials:");
    console.log("  Email:", email);
    console.log("  Password:", password);
    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Generate Stellar keypair for wallet
  const stellarKeypair = Keypair.random();
  const stellarPublicKey = stellarKeypair.publicKey();
  const stellarSecretKey = stellarKeypair.secret();

  // Encrypt secret key
  const encryptedSecretKey = encrypt(stellarSecretKey);

  // Create user
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      dateOfBirth: new Date("1990-01-01"),
      address: "Admin Address",
      role: "admin",
      kycStatus: "approved",
    })
    .returning();

  console.log("✓ Admin user created successfully!");
  console.log("  ID:", newUser.id);
  console.log("  Email:", newUser.email);
  console.log("  Role:", newUser.role);
  console.log("  KYC Status:", newUser.kycStatus);

  // Create hybrid wallet
  const [wallet] = await db
    .insert(wallets)
    .values({
      userId: newUser.id,
      fiatBalance: "0",
      cryptoBalances: JSON.stringify({
        XLM: "0",
        USDC: "0",
      }),
      stellarPublicKey,
      stellarSecretKeyEncrypted: encryptedSecretKey,
    })
    .returning();

  console.log("✓ Hybrid wallet created");
  console.log("  Wallet ID:", wallet.id);
  console.log("  Stellar Public Key:", stellarPublicKey);
  console.log("\nLogin credentials:");
  console.log("  Email:", email);
  console.log("  Password:", password);
  console.log("\nYou can now log in at the /login page");
  console.log("\n⚠️  IMPORTANT: This is a test account. Use a strong password in production!");

  process.exit(0);
}

createAdminUser().catch((error) => {
  console.error("Error creating admin user:", error);
  process.exit(1);
});
