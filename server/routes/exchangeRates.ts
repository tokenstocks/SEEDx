/**
 * Exchange Rates API Routes
 */

import express from "express";
import { getAllRates, getRate, refreshRates } from "../lib/exchangeRates";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = express.Router();

/**
 * GET /api/exchange-rates
 * Get all current exchange rates (cached, auto-refreshes if stale)
 * Public endpoint - no authentication required
 */
router.get("/", async (req, res) => {
  try {
    const rates = await getAllRates();
    
    res.json({
      rates: {
        xlmNgn: rates.xlmNgn,
        usdcNgn: rates.usdcNgn,
        ngntsNgn: rates.ngntsNgn,
        xlmUsd: rates.xlmUsd,
        usdNgn: rates.usdNgn,
      },
      lastFetchedAt: rates.lastFetchedAt,
      isStale: rates.isStale,
    });
  } catch (error: any) {
    console.error("Exchange rates error:", error);
    res.status(500).json({
      error: "Failed to fetch exchange rates",
      details: error.message,
    });
  }
});

/**
 * GET /api/exchange-rates/:baseCurrency/:quoteCurrency
 * Get specific exchange rate
 * Public endpoint
 */
router.get("/:baseCurrency/:quoteCurrency", async (req, res) => {
  try {
    const { baseCurrency, quoteCurrency } = req.params;
    
    const rate = await getRate(baseCurrency.toUpperCase(), quoteCurrency.toUpperCase());
    
    res.json({
      baseCurrency: baseCurrency.toUpperCase(),
      quoteCurrency: quoteCurrency.toUpperCase(),
      rate,
    });
  } catch (error: any) {
    console.error("Exchange rate error:", error);
    res.status(400).json({
      error: error.message || "Invalid currency pair",
    });
  }
});

/**
 * POST /api/exchange-rates/refresh
 * Force refresh rates from API (admin only)
 */
router.post("/refresh", authenticate, requireAdmin, async (req, res) => {
  try {
    const rates = await refreshRates();
    
    res.json({
      message: "Exchange rates refreshed successfully",
      rates: {
        xlmNgn: rates.xlmNgn,
        usdcNgn: rates.usdcNgn,
        ngntsNgn: rates.ngntsNgn,
        xlmUsd: rates.xlmUsd,
        usdNgn: rates.usdNgn,
      },
      lastFetchedAt: rates.lastFetchedAt,
    });
  } catch (error: any) {
    console.error("Exchange rates refresh error:", error);
    res.status(500).json({
      error: "Failed to refresh exchange rates",
      details: error.message,
    });
  }
});

export default router;
