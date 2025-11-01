import bcrypt from "bcrypt";
import { Keypair } from "stellar-sdk";
import { db } from "../db";
import { users, wallets } from "../../shared/schema";
import { encrypt } from "../lib/encryption";

async function createAdminUser() {
  const email = "admin@tokenstocks.local";
  const password = "1234567890";
  const firstName = "Admin";
  const lastName = "User";
  const phone = "+1234567890";

  console.log("Creating admin user...");

  // Check if admin user already exists
  const existingUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, email),
  });

  if (existingUser) {
    console.log("Admin user already exists with ID:", existingUser.id);
    console.log("Email:", existingUser.email);
    console.log("Role:", existingUser.role);
    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Generate Stellar keypair
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
      role: "admin",
      kycStatus: "approved",
      stellarPublicKey,
      stellarSecretKey: encryptedSecretKey,
    })
    .returning();

  console.log("✓ Admin user created successfully!");
  console.log("  ID:", newUser.id);
  console.log("  Email:", newUser.email);
  console.log("  Role:", newUser.role);
  console.log("  KYC Status:", newUser.kycStatus);

  // Create wallets
  const currencies = ["NGN", "USDC", "XLM"] as const;
  for (const currency of currencies) {
    await db.insert(wallets).values({
      userId: newUser.id,
      currency,
      balance: "0.00",
    });
  }

  console.log("✓ Wallets created (NGN, USDC, XLM)");
  console.log("\nLogin credentials:");
  console.log("  Email:", email);
  console.log("  Password:", password);
  console.log("\nYou can now log in at the /login page");

  process.exit(0);
}

createAdminUser().catch((error) => {
  console.error("Error creating admin user:", error);
  process.exit(1);
});
