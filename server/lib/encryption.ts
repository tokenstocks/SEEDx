import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

// In production, ENCRYPTION_KEY is mandatory
// In development, warn but allow startup for frontend development
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  const errorMessage = 
    "ENCRYPTION_KEY environment variable is required and must be exactly 32 characters. " +
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(16).toString('hex'))\"";
  
  if (!IS_DEVELOPMENT) {
    throw new Error(errorMessage);
  }
  
  console.warn("\n⚠️  WARNING: " + errorMessage);
  console.warn("⚠️  Stellar wallet creation will not work until ENCRYPTION_KEY is configured.\n");
}

/**
 * Encrypts a string using AES-256-CBC
 * @param text - The text to encrypt
 * @returns Encrypted string in format: iv:encryptedData
 */
export function encrypt(text: string): string {
  if (!text) {
    throw new Error("Cannot encrypt empty text");
  }
  
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    throw new Error("Cannot encrypt: ENCRYPTION_KEY is not properly configured");
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv
  );

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Return IV and encrypted data separated by colon
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a string encrypted with AES-256-CBC
 * @param encryptedText - The encrypted text in format: iv:encryptedData
 * @returns Decrypted string
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    throw new Error("Cannot decrypt empty text");
  }
  
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    throw new Error("Cannot decrypt: ENCRYPTION_KEY is not properly configured");
  }

  const parts = encryptedText.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted text format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const encryptedData = parts[1];

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv
  );

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
