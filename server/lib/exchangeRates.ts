/**
 * Exchange Rate Service
 * Auto-fetches XLM/NGN and USDC/NGN rates from CoinGecko API
 * Caches rates in database with TTL (Time To Live)
 */

import { db } from "../db";
import { exchangeRates } from "@shared/schema";
import { eq } from "drizzle-orm";

// CoinGecko API (Free, no API key required)
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";

// Cache duration: 5 minutes (rates update frequently)
const CACHE_TTL_MS = 5 * 60 * 1000;

// NGNTS is pegged 1:1 with NGN
const NGNTS_NGN_RATE = "1.00";

interface CoinGeckoResponse {
  stellar?: {
    ngn?: number;
    usd?: number;
  };
  "usd-coin"?: {
    ngn?: number;
    usd?: number;
  };
}

export interface AllRatesData {
  xlmUsd: string;
  xlmNgn: string;
  usdNgn: string;
  usdcNgn: string;
  ngntsNgn: string;
  lastFetchedAt: Date;
  isStale: boolean;
}

/**
 * Fetch latest rates from CoinGecko API with retry logic
 */
async function fetchRatesFromAPI(retries = 3): Promise<{
  xlmUsd: number;
  xlmNgn: number;
  usdNgn: number;
  usdcNgn: number;
}> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(
        `${COINGECKO_API}?ids=stellar,usd-coin&vs_currencies=ngn,usd`
      );

      if (response.status === 429) {
        // Rate limited - wait and retry
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`[ExchangeRates] Rate limited, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data: CoinGeckoResponse = await response.json();

      // Validate all required fields exist and are positive numbers
      const xlmUsd = data.stellar?.usd;
      const xlmNgn = data.stellar?.ngn;
      const usdcUsd = data["usd-coin"]?.usd;
      const usdcNgn = data["usd-coin"]?.ngn;

      if (!xlmUsd || xlmUsd <= 0) {
        throw new Error("Invalid XLM/USD rate from CoinGecko");
      }
      if (!xlmNgn || xlmNgn <= 0) {
        throw new Error("Invalid XLM/NGN rate from CoinGecko");
      }
      if (!usdcUsd || usdcUsd <= 0) {
        throw new Error("Invalid USDC/USD rate from CoinGecko");
      }
      if (!usdcNgn || usdcNgn <= 0) {
        throw new Error("Invalid USDC/NGN rate from CoinGecko");
      }

      // Calculate USD/NGN rate from USDC (USDC is pegged 1:1 with USD)
      const usdNgn = usdcNgn / usdcUsd;

      console.log("[ExchangeRates] Fetched from CoinGecko:", {
        xlmUsd,
        xlmNgn,
        usdNgn,
        usdcNgn,
      });

      return { xlmUsd, xlmNgn, usdNgn, usdcNgn };
    } catch (error: any) {
      lastError = error;
      console.error(`[ExchangeRates] API fetch attempt ${attempt} failed:`, error.message);
      
      if (attempt < retries) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`[ExchangeRates] Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw new Error(`Failed to fetch rates after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Get current rates from database cache
 */
async function getCachedRates(): Promise<AllRatesData | null> {
  const [rates] = await db.select().from(exchangeRates).limit(1);

  if (!rates) {
    return null;
  }

  // Check if cache is still valid
  const now = new Date();
  const cacheAge = now.getTime() - new Date(rates.lastFetchedAt).getTime();

  if (cacheAge > CACHE_TTL_MS || rates.isStale) {
    console.log("[ExchangeRates] Cache expired or marked stale");
    return null;
  }

  // Calculate USDC/NGN from USD/NGN (USDC is pegged 1:1 with USD)
  const usdcNgn = parseFloat(rates.usdNgn);

  return {
    xlmUsd: rates.xlmUsd,
    xlmNgn: rates.xlmNgn,
    usdNgn: rates.usdNgn,
    usdcNgn: usdcNgn.toFixed(2),
    ngntsNgn: NGNTS_NGN_RATE,
    lastFetchedAt: new Date(rates.lastFetchedAt),
    isStale: rates.isStale,
  };
}

/**
 * Update rates in database cache
 */
async function updateCachedRates(rates: {
  xlmUsd: number;
  xlmNgn: number;
  usdNgn: number;
  usdcNgn: number;
}): Promise<void> {
  const now = new Date();

  // Check if any rate exists
  const [existing] = await db.select().from(exchangeRates).limit(1);

  if (existing) {
    // Update existing row with WHERE clause
    await db
      .update(exchangeRates)
      .set({
        xlmUsd: rates.xlmUsd.toFixed(8),
        xlmNgn: rates.xlmNgn.toFixed(2),
        usdNgn: rates.usdNgn.toFixed(2),
        isStale: false,
        lastFetchedAt: now,
        updatedAt: now,
      })
      .where(eq(exchangeRates.id, existing.id));
  } else {
    // Insert new
    await db.insert(exchangeRates).values({
      xlmUsd: rates.xlmUsd.toFixed(8),
      xlmNgn: rates.xlmNgn.toFixed(2),
      usdNgn: rates.usdNgn.toFixed(2),
      isStale: false,
      lastFetchedAt: now,
    });
  }

  console.log("[ExchangeRates] Updated cache:", {
    xlmUsd: rates.xlmUsd,
    xlmNgn: rates.xlmNgn,
    usdNgn: rates.usdNgn,
    usdcNgn: rates.usdcNgn,
  });
}

/**
 * Get all current exchange rates
 * Returns cached rates if valid, otherwise fetches from API
 */
export async function getAllRates(): Promise<AllRatesData> {
  // Check cache first
  const cached = await getCachedRates();
  if (cached) {
    return cached;
  }

  // Fetch from API
  const { xlmUsd, xlmNgn, usdNgn, usdcNgn } = await fetchRatesFromAPI();

  // Update cache
  await updateCachedRates({ xlmUsd, xlmNgn, usdNgn, usdcNgn });

  return {
    xlmUsd: xlmUsd.toFixed(8),
    xlmNgn: xlmNgn.toFixed(2),
    usdNgn: usdNgn.toFixed(2),
    usdcNgn: usdcNgn.toFixed(2),
    ngntsNgn: NGNTS_NGN_RATE,
    lastFetchedAt: new Date(),
    isStale: false,
  };
}

/**
 * Get specific rate (XLM/NGN, USDC/NGN, or NGNTS/NGN)
 */
export async function getRate(
  baseCurrency: string,
  quoteCurrency: string
): Promise<string> {
  const rates = await getAllRates();

  if (baseCurrency === "XLM" && quoteCurrency === "NGN") {
    return rates.xlmNgn;
  } else if (baseCurrency === "USDC" && quoteCurrency === "NGN") {
    return rates.usdcNgn;
  } else if (baseCurrency === "NGNTS" && quoteCurrency === "NGN") {
    return rates.ngntsNgn;
  } else if (baseCurrency === "NGN" && quoteCurrency === "NGNTS") {
    return rates.ngntsNgn; // 1:1 peg
  }

  throw new Error(`Unsupported currency pair: ${baseCurrency}/${quoteCurrency}`);
}

/**
 * Convert amount between currencies
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rate: string
): number {
  const rateNum = parseFloat(rate);

  if (fromCurrency === "NGN" && (toCurrency === "XLM" || toCurrency === "USDC")) {
    // NGN -> Crypto: divide by rate
    return amount / rateNum;
  } else if ((fromCurrency === "XLM" || fromCurrency === "USDC") && toCurrency === "NGN") {
    // Crypto -> NGN: multiply by rate
    return amount * rateNum;
  } else if (fromCurrency === "NGN" && toCurrency === "NGNTS") {
    // NGN -> NGNTS: 1:1 peg
    return amount;
  } else if (fromCurrency === "NGNTS" && toCurrency === "NGN") {
    // NGNTS -> NGN: 1:1 peg
    return amount;
  }

  throw new Error(`Unsupported currency conversion: ${fromCurrency} -> ${toCurrency}`);
}

/**
 * Force refresh rates from API (admin function)
 */
export async function refreshRates(): Promise<AllRatesData> {
  const { xlmUsd, xlmNgn, usdNgn, usdcNgn } = await fetchRatesFromAPI();
  await updateCachedRates({ xlmUsd, xlmNgn, usdNgn, usdcNgn });

  return {
    xlmUsd: xlmUsd.toFixed(8),
    xlmNgn: xlmNgn.toFixed(2),
    usdNgn: usdNgn.toFixed(2),
    usdcNgn: usdcNgn.toFixed(2),
    ngntsNgn: NGNTS_NGN_RATE,
    lastFetchedAt: new Date(),
    isStale: false,
  };
}
