/**
 * Validates that all required environment variables are set
 * This should be called at application startup before any routes are registered
 * 
 * In development mode, this will warn about missing variables but allow the server to start
 * In production mode, this will throw an error and prevent the server from starting
 */
export function validateEnvironment(): void {
  const requiredVars = [
    "DATABASE_URL",
    "JWT_SECRET",
    "ENCRYPTION_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      missing.push(varName);
      continue;
    }

    // Validate specific requirements
    if (varName === "JWT_SECRET" && value.length < 32) {
      invalid.push(`${varName} (must be at least 32 characters)`);
    }
    if (varName === "ENCRYPTION_KEY" && value.length !== 32) {
      invalid.push(`${varName} (must be exactly 32 characters)`);
    }
  }

  if (missing.length > 0 || invalid.length > 0) {
    let message = "Environment validation:\n\n";

    if (missing.length > 0) {
      message += "Missing required environment variables:\n";
      missing.forEach((v) => {
        message += `  - ${v}\n`;
      });
      message += "\n";
    }

    if (invalid.length > 0) {
      message += "Invalid environment variables:\n";
      invalid.forEach((v) => {
        message += `  - ${v}\n`;
      });
      message += "\n";
    }

    message += "Setup instructions:\n";
    message += "1. Add these secrets in the Replit Secrets panel (Tools → Secrets)\n";
    message += "2. Generate secure keys with:\n";
    message += "   JWT_SECRET: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n";
    message += "   ENCRYPTION_KEY: node -e \"console.log(require('crypto').randomBytes(16).toString('hex'))\"\n";
    message += "3. Get Supabase credentials from: https://supabase.com → Project Settings → API\n";

    if (!IS_DEVELOPMENT) {
      throw new Error(message);
    }
    
    // In development, log warnings but allow the server to start
    console.warn("\n" + "=".repeat(80));
    console.warn("⚠️  " + message);
    console.warn("⚠️  The app will start but some features may not work.");
    console.warn("=".repeat(80) + "\n");
    return;
  }

  console.log("Environment validation passed - all required variables configured");
}
