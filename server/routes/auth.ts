import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { Keypair } from "stellar-sdk";
import { db } from "../db";
import { users, wallets, registerUserSchema, loginSchema } from "@shared/schema";
import { generateToken } from "../lib/jwt";
import { encrypt } from "../lib/encryption";
import { authMiddleware } from "../middleware/auth";
import { eq, sql } from "drizzle-orm";
import { createAndFundAccount } from "../lib/stellarAccount";

const router = Router();
const SALT_ROUNDS = 12;

/**
 * POST /api/auth/register
 * Register a new user with email, password, and create Stellar wallet
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = registerUserSchema.parse(req.body);
    const { email, phone, password, firstName, lastName } = validatedData;

    // Check if user already exists
    const existingUserResult = await db.execute(sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`);
    // postgres-js returns results directly as an array
    if (Array.isArray(existingUserResult) && existingUserResult.length > 0) {
      res.status(400).json({ error: "User with this email already exists" });
      return;
    }

    // Check if phone already exists
    const existingPhoneResult = await db.execute(sql`SELECT id FROM users WHERE phone = ${phone} LIMIT 1`);
    if (Array.isArray(existingPhoneResult) && existingPhoneResult.length > 0) {
      res.status(400).json({ error: "User with this phone number already exists" });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate Stellar keypair
    const stellarKeypair = Keypair.random();
    const stellarPublicKey = stellarKeypair.publicKey();
    const stellarSecretKey = stellarKeypair.secret();

    // Encrypt the secret key
    const stellarSecretKeyEncrypted = encrypt(stellarSecretKey);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        phone,
        passwordHash,
        firstName,
        lastName,
        role: "investor",
        kycStatus: "pending",
        stellarPublicKey,
        stellarSecretKeyEncrypted,
      })
      .returning();

    // Create hybrid wallet with Stellar keypair for crypto operations
    const walletKeypair = Keypair.random();
    const cryptoWalletPublicKey = walletKeypair.publicKey();
    const cryptoWalletSecretEncrypted = encrypt(walletKeypair.secret());

    await db.insert(wallets).values({
      userId: newUser.id,
      fiatBalance: "0.00",
      cryptoBalances: {},
      cryptoWalletPublicKey,
      cryptoWalletSecretEncrypted,
    });

    // Activate wallet account on Stellar testnet (async, non-blocking)
    // If this fails, the user can still use the platform - account will be activated later
    createAndFundAccount(cryptoWalletPublicKey, "2")
      .then((result) => {
        if (result.success) {
          console.log(`✅ Wallet activated for user ${newUser.email}: ${result.txHash || 'already exists'}`);
        } else {
          console.warn(`⚠️  Failed to activate wallet for user ${newUser.email}: ${result.error}`);
        }
      })
      .catch((error) => {
        console.error(`❌ Error activating wallet for user ${newUser.email}:`, error);
      });

    // Generate JWT token
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    // Return user info (excluding sensitive data)
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        phone: newUser.phone,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        kycStatus: newUser.kycStatus,
        stellarPublicKey: newUser.stellarPublicKey,
        isLpInvestor: newUser.isLpInvestor,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    if (error.name === "ZodError") {
      res.status(400).json({ error: "Invalid input data", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to register user" });
    }
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Return user info (excluding sensitive data)
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        kycStatus: user.kycStatus,
        stellarPublicKey: user.stellarPublicKey,
        isLpInvestor: user.isLpInvestor,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    if (error.name === "ZodError") {
      res.status(400).json({ error: "Invalid input data", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to login" });
    }
  }
});

/**
 * GET /api/auth/me
 * Get current user profile (protected route)
 */
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Get user's hybrid wallet
    const [userWallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, user.id));

    const network = process.env.STELLAR_NETWORK || "testnet";

    // Return user info (excluding sensitive data)
    res.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        kycStatus: user.kycStatus,
        stellarPublicKey: user.stellarPublicKey,
        isLpInvestor: user.isLpInvestor,
        kycDocuments: user.kycDocuments,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      wallet: userWallet ? {
        id: userWallet.id,
        fiatBalance: userWallet.fiatBalance,
        cryptoBalances: userWallet.cryptoBalances || {},
        cryptoWalletPublicKey: userWallet.cryptoWalletPublicKey,
        network,
        createdAt: userWallet.createdAt,
        updatedAt: userWallet.updatedAt,
      } : null,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user profile" });
  }
});

export default router;
