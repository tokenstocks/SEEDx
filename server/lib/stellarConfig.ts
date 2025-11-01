import * as StellarSdk from "stellar-sdk";

/**
 * Stellar Network Configuration
 * 
 * Supports toggling between testnet and mainnet via STELLAR_NETWORK env variable
 */

export type StellarNetworkType = "testnet" | "mainnet";

const STELLAR_NETWORK = (process.env.STELLAR_NETWORK || "testnet") as StellarNetworkType;
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

// Validate network configuration
if (STELLAR_NETWORK !== "testnet" && STELLAR_NETWORK !== "mainnet") {
  throw new Error(`Invalid STELLAR_NETWORK: ${STELLAR_NETWORK}. Must be 'testnet' or 'mainnet'`);
}

// Network passphrase
export const NETWORK_PASSPHRASE = 
  STELLAR_NETWORK === "testnet" 
    ? StellarSdk.Networks.TESTNET 
    : StellarSdk.Networks.PUBLIC;

// Horizon server URL
export const HORIZON_URL = 
  STELLAR_NETWORK === "testnet"
    ? "https://horizon-testnet.stellar.org"
    : "https://horizon.stellar.org";

// Create Horizon server instance
export const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);

// Export current network type
export const currentNetwork: StellarNetworkType = STELLAR_NETWORK;

// Platform Stellar address for deposits (testnet/mainnet specific)
export const PLATFORM_STELLAR_ADDRESS = 
  process.env.PLATFORM_STELLAR_ADDRESS || 
  (STELLAR_NETWORK === "testnet" 
    ? process.env.PLATFORM_STELLAR_ADDRESS_TESTNET
    : process.env.PLATFORM_STELLAR_ADDRESS_MAINNET) ||
  "";

if (!PLATFORM_STELLAR_ADDRESS && !IS_DEVELOPMENT) {
  console.warn("⚠️  PLATFORM_STELLAR_ADDRESS not configured - deposits will not work");
}

// Log current configuration
console.log(`🌟 Stellar Network: ${STELLAR_NETWORK.toUpperCase()}`);
console.log(`   Horizon URL: ${HORIZON_URL}`);
console.log(`   Network Passphrase: ${NETWORK_PASSPHRASE}`);
if (PLATFORM_STELLAR_ADDRESS) {
  console.log(`   Platform Address: ${PLATFORM_STELLAR_ADDRESS}`);
}

/**
 * Get network configuration for a wallet
 * @returns Network configuration object
 */
export function getNetworkConfig() {
  return {
    network: currentNetwork,
    passphrase: NETWORK_PASSPHRASE,
    horizonUrl: HORIZON_URL,
    platformAddress: PLATFORM_STELLAR_ADDRESS,
  };
}

/**
 * Check if current network is testnet
 */
export function isTestnet(): boolean {
  return currentNetwork === "testnet";
}

/**
 * Check if current network is mainnet
 */
export function isMainnet(): boolean {
  return currentNetwork === "mainnet";
}

export default {
  network: currentNetwork,
  passphrase: NETWORK_PASSPHRASE,
  horizonUrl: HORIZON_URL,
  server: horizonServer,
  platformAddress: PLATFORM_STELLAR_ADDRESS,
  getNetworkConfig,
  isTestnet,
  isMainnet,
};
