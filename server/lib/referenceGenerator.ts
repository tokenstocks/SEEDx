import crypto from "crypto";

/**
 * Generates a unique reference code for bank transfers
 * Format: SD-YYYYMMDD-XXXXXX (e.g., SD-20241031-A1B2C3)
 * @returns Unique reference string
 */
export function generateBankReference(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `SD-${dateStr}-${randomPart}`;
}

/**
 * Generates a unique memo for Stellar transactions
 * Format: 12-digit numeric string
 * @returns Unique memo string
 */
export function generateStellarMemo(): string {
  // Generate a random 12-digit number
  const min = 100000000000; // 12 digits
  const max = 999999999999;
  const memo = Math.floor(Math.random() * (max - min + 1)) + min;
  return memo.toString();
}

/**
 * Validates if a reference code matches the expected format
 * Accepts both SD- (new) and TS- (legacy) prefixes
 * @param reference - Reference code to validate
 * @returns boolean
 */
export function isValidBankReference(reference: string): boolean {
  return /^(SD|TS)-\d{8}-[A-F0-9]{6}$/.test(reference);
}

/**
 * Validates if a memo matches the expected format
 * @param memo - Memo to validate
 * @returns boolean
 */
export function isValidStellarMemo(memo: string): boolean {
  return /^\d{12}$/.test(memo);
}
