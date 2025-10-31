/**
 * Validates that all required environment variables are set
 * This should be called at application startup before any routes are registered
 */
export function validateEnvironment(): void {
  const requiredVars = [
    "DATABASE_URL",
    "JWT_SECRET",
    "ENCRYPTION_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

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
    let errorMessage = "Environment validation failed:\n\n";

    if (missing.length > 0) {
      errorMessage += "Missing required environment variables:\n";
      missing.forEach((v) => {
        errorMessage += `  - ${v}\n`;
      });
      errorMessage += "\n";
    }

    if (invalid.length > 0) {
      errorMessage += "Invalid environment variables:\n";
      invalid.forEach((v) => {
        errorMessage += `  - ${v}\n`;
      });
      errorMessage += "\n";
    }

    errorMessage += "Setup instructions:\n";
    errorMessage += "1. Copy server/.env.example to .env\n";
    errorMessage += "2. Fill in all required values\n";
    errorMessage += "3. Generate secure keys with:\n";
    errorMessage += "   JWT_SECRET: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n";
    errorMessage += "   ENCRYPTION_KEY: node -e \"console.log(require('crypto').randomBytes(16).toString('hex'))\"\n";

    throw new Error(errorMessage);
  }

  console.log("Environment validation passed");
}
