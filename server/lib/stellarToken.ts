import * as StellarSdk from "stellar-sdk";
import { horizonServer, NETWORK_PASSPHRASE } from "./stellarConfig";
import { decrypt } from "./encryption";
import { createAndFundAccount } from "./stellarAccount";

/**
 * Parameters for creating a project token on Stellar
 */
export interface CreateProjectTokenParams {
  projectId: string;
  assetCode: string;
  tokensIssued: string;
  issuerPublicKey: string;
  issuerSecretKeyEncrypted: string;
  distributionPublicKey: string;
  distributionSecretKeyEncrypted: string;
}

/**
 * Response type for token creation operations
 */
export interface CreateTokenResponse {
  success: boolean;
  issuerAccountTxHash?: string;
  distributionAccountTxHash?: string;
  trustlineTxHash?: string;
  mintTxHash?: string;
  error?: string;
  step?: string; // Which step failed
}

/**
 * Create a project token on the Stellar network
 * 
 * This function performs the complete token creation workflow:
 * 1. Activate issuer and distribution accounts (if not already active)
 * 2. Create trustline from distribution to issuer
 * 3. Mint tokens by sending asset from issuer to distribution
 * 
 * @param params - Token creation parameters
 * @returns Result object with transaction hashes and success status
 * 
 * @example
 * ```typescript
 * const result = await createProjectToken({
 *   projectId: "uuid",
 *   assetCode: "CORN2025",
 *   tokensIssued: "1000000",
 *   issuerPublicKey: "GABC...",
 *   issuerSecretKeyEncrypted: "encrypted...",
 *   distributionPublicKey: "GDEF...",
 *   distributionSecretKeyEncrypted: "encrypted...",
 * });
 * ```
 */
export async function createProjectToken(
  params: CreateProjectTokenParams
): Promise<CreateTokenResponse> {
  const {
    projectId,
    assetCode,
    tokensIssued,
    issuerPublicKey,
    issuerSecretKeyEncrypted,
    distributionPublicKey,
    distributionSecretKeyEncrypted,
  } = params;

  try {
    console.log(`🌟 Creating token ${assetCode} for project ${projectId}`);

    // Decrypt keypairs
    const issuerSecret = decrypt(issuerSecretKeyEncrypted);
    const distributionSecret = decrypt(distributionSecretKeyEncrypted);
    const issuerKeypair = StellarSdk.Keypair.fromSecret(issuerSecret);
    const distributionKeypair = StellarSdk.Keypair.fromSecret(distributionSecret);

    const result: CreateTokenResponse = { success: false };

    // Step 1: Activate issuer account
    console.log(`1️⃣  Activating issuer account: ${issuerPublicKey.substring(0, 8)}...`);
    const issuerActivation = await createAndFundAccount(issuerPublicKey, "2");
    if (!issuerActivation.success) {
      return {
        success: false,
        error: `Failed to activate issuer account: ${issuerActivation.error}`,
        step: "issuer_activation",
      };
    }
    if (issuerActivation.txHash) {
      result.issuerAccountTxHash = issuerActivation.txHash;
    }

    // Step 2: Activate distribution account
    console.log(`2️⃣  Activating distribution account: ${distributionPublicKey.substring(0, 8)}...`);
    const distributionActivation = await createAndFundAccount(distributionPublicKey, "2");
    if (!distributionActivation.success) {
      return {
        success: false,
        error: `Failed to activate distribution account: ${distributionActivation.error}`,
        step: "distribution_activation",
      };
    }
    if (distributionActivation.txHash) {
      result.distributionAccountTxHash = distributionActivation.txHash;
    }

    // Create the custom asset
    const asset = new StellarSdk.Asset(assetCode, issuerPublicKey);

    // Step 3: Create trustline from distribution account to issuer
    console.log(`3️⃣  Creating trustline for ${assetCode}...`);
    try {
      const distributionAccount = await horizonServer.loadAccount(distributionPublicKey);
      
      const trustlineTransaction = new StellarSdk.TransactionBuilder(distributionAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.changeTrust({
            asset: asset,
            limit: tokensIssued, // Set trust limit to total tokens issued
          })
        )
        .setTimeout(30)
        .build();

      trustlineTransaction.sign(distributionKeypair);
      const trustlineResult = await horizonServer.submitTransaction(trustlineTransaction);
      result.trustlineTxHash = trustlineResult.hash;
      console.log(`   ✅ Trustline created: ${trustlineResult.hash}`);
    } catch (error: any) {
      console.error("❌ Trustline creation failed:", error);
      return {
        ...result,
        success: false,
        error: `Failed to create trustline: ${error.message}`,
        step: "trustline",
      };
    }

    // Step 4: Mint tokens by sending from issuer to distribution
    console.log(`4️⃣  Minting ${tokensIssued} ${assetCode} tokens...`);
    try {
      const issuerAccount = await horizonServer.loadAccount(issuerPublicKey);
      
      const mintTransaction = new StellarSdk.TransactionBuilder(issuerAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: distributionPublicKey,
            asset: asset,
            amount: tokensIssued,
          })
        )
        .setTimeout(30)
        .build();

      mintTransaction.sign(issuerKeypair);
      const mintResult = await horizonServer.submitTransaction(mintTransaction);
      result.mintTxHash = mintResult.hash;
      console.log(`   ✅ Tokens minted: ${mintResult.hash}`);
    } catch (error: any) {
      console.error("❌ Token minting failed:", error);
      return {
        ...result,
        success: false,
        error: `Failed to mint tokens: ${error.message}`,
        step: "mint",
      };
    }

    // Optional Step 5: Lock issuer account (commented out for now)
    // This would prevent any further issuance of tokens
    // console.log(`5️⃣  Locking issuer account...`);
    // await lockIssuerAccount(issuerKeypair);

    console.log(`✅ Token ${assetCode} created successfully!`);
    console.log(`   Issuer: ${issuerPublicKey}`);
    console.log(`   Distribution: ${distributionPublicKey}`);
    console.log(`   Supply: ${tokensIssued} ${assetCode}`);

    return {
      ...result,
      success: true,
    };
  } catch (error: any) {
    console.error("❌ Error creating project token:", error);
    return {
      success: false,
      error: error.message || "Unknown error during token creation",
      step: "unknown",
    };
  }
}

/**
 * Lock an issuer account to prevent further token minting
 * This sets all signing weights to zero, making the account immutable
 * 
 * @param issuerKeypair - The issuer's keypair
 * @returns Transaction hash or null on failure
 * 
 * NOTE: This is a one-way operation and cannot be undone!
 */
export async function lockIssuerAccount(
  issuerKeypair: StellarSdk.Keypair
): Promise<string | null> {
  try {
    const issuerPublicKey = issuerKeypair.publicKey();
    console.log(`🔒 Locking issuer account: ${issuerPublicKey.substring(0, 8)}...`);

    const issuerAccount = await horizonServer.loadAccount(issuerPublicKey);

    const lockTransaction = new StellarSdk.TransactionBuilder(issuerAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.setOptions({
          masterWeight: 0, // Set master key weight to 0
          lowThreshold: 0,
          medThreshold: 0,
          highThreshold: 0,
        })
      )
      .setTimeout(30)
      .build();

    lockTransaction.sign(issuerKeypair);
    const result = await horizonServer.submitTransaction(lockTransaction);

    console.log(`   ✅ Issuer account locked: ${result.hash}`);
    return result.hash;
  } catch (error: any) {
    console.error("❌ Failed to lock issuer account:", error);
    return null;
  }
}

/**
 * Verify that a token exists on Stellar by checking the distribution account
 * 
 * @param distributionPublicKey - Distribution account public key
 * @param assetCode - The asset code to verify
 * @param issuerPublicKey - The issuer's public key
 * @returns True if token is found in distribution account balances
 */
export async function verifyTokenExists(
  distributionPublicKey: string,
  assetCode: string,
  issuerPublicKey: string
): Promise<boolean> {
  try {
    const distributionAccount = await horizonServer.loadAccount(distributionPublicKey);
    
    // Check if the asset exists in the account's balances
    const tokenBalance = distributionAccount.balances.find(
      (balance: any) =>
        balance.asset_type !== "native" &&
        balance.asset_code === assetCode &&
        balance.asset_issuer === issuerPublicKey
    );

    return !!tokenBalance;
  } catch (error: any) {
    console.error("Error verifying token:", error);
    return false;
  }
}

/**
 * Get the balance of a specific token in an account
 * 
 * @param accountPublicKey - Account to check
 * @param assetCode - Asset code
 * @param issuerPublicKey - Issuer's public key
 * @returns Token balance as string, or null if not found
 */
export async function getTokenBalance(
  accountPublicKey: string,
  assetCode: string,
  issuerPublicKey: string
): Promise<string | null> {
  try {
    const account = await horizonServer.loadAccount(accountPublicKey);
    
    const tokenBalance = account.balances.find(
      (balance: any) =>
        balance.asset_type !== "native" &&
        balance.asset_code === assetCode &&
        balance.asset_issuer === issuerPublicKey
    );

    return tokenBalance ? tokenBalance.balance : null;
  } catch (error: any) {
    console.error("Error getting token balance:", error);
    return null;
  }
}
