import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = "24h";
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

// In production, JWT_SECRET is mandatory
// In development, warn but allow startup for frontend development
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  const errorMessage = 
    "JWT_SECRET environment variable is required and must be at least 32 characters. " +
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"";
  
  if (!IS_DEVELOPMENT) {
    throw new Error(errorMessage);
  }
  
  console.warn("\n⚠️  WARNING: " + errorMessage);
  console.warn("⚠️  Authentication endpoints will not work until JWT_SECRET is configured.\n");
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Generates a JWT token for a user
 * @param payload - User data to encode in the token
 * @returns JWT token string
 */
export function generateToken(payload: JWTPayload): string {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error("Cannot generate JWT token: JWT_SECRET is not properly configured");
  }
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
}

/**
 * Verifies and decodes a JWT token
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export function verifyToken(token: string): JWTPayload | null {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error("Cannot verify JWT token: JWT_SECRET is not properly configured");
    return null;
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}
