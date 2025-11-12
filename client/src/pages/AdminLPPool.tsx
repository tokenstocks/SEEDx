import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Wallet, AlertCircle, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

// Safe parse helper - handles string numeric values and returns fallback on error
const safeParseNumber = (value: string | number | undefined, fallback: number = 0): number => {
  if (value === undefined || value === null) return fallback;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) || !isFinite(num) ? fallback : num;
};

interface LPPoolBalance {
  balances: {
    ngnts: string;
    usdc: string;
    xlm: string;
  };
  totalValueNGN: string;
  composition: {
    ngntsPercent: string;
    usdcPercent: string;
    xlmPercent: string;
  };
  walletAddress: string;
  lastSynced: string;
}

interface LPPoolFlows {
  period: {
    from: string;
    to: string;
  };
  inflows: {
    total: string;
    primerContributions: string;
    primerCount: number;
    regeneratorInvestments: string;
    investmentCount: number;
  };
  outflows: {
    total: string;
    lpAllocations: string;
    allocationCount: number;
  };
  netFlow: string;
}

interface RegenerationRate {
  regenerationRate: string;
  totalInvestments: string;
  investmentCount: number;
  totalAllocations: string;
  allocationCount: number;
  interpretation: string;
}

export default function AdminLPPool() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch LP Pool balance
  const { 
    data: balance, 
    isLoading: balanceLoading, 
    error: balanceError,
    refetch: refetchBalance 
  } = useQuery<LPPoolBalance>({
    queryKey: ["/api/admin/lp-pool/balance"],
    refetchInterval: autoRefresh ? 30000 : false,
    retry: 2,
  });

  // Fetch 24h flows
  const { 
    data: flows, 
    isLoading: flowsLoading, 
    error: flowsError,
    refetch: refetchFlows 
  } = useQuery<LPPoolFlows>({
    queryKey: ["/api/admin/lp-pool/flows"],
    refetchInterval: autoRefresh ? 30000 : false,
    retry: 2,
  });

  // Fetch regeneration rate
  const { 
    data: regeneration, 
    isLoading: regenerationLoading, 
    error: regenerationError,
    refetch: refetchRegeneration 
  } = useQuery<RegenerationRate>({
    queryKey: ["/api/admin/lp-pool/regeneration-rate"],
    refetchInterval: autoRefresh ? 30000 : false,
    retry: 2,
  });

  const handleRefreshAll = () => {
    refetchBalance();
    refetchFlows();
    refetchRegeneration();
  };
  
  const hasAnyError = balanceError || flowsError || regenerationError;

  const formatNGN = (value: string | number | undefined) => {
    const num = safeParseNumber(value);
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatNumber = (value: string | number | undefined) => {
    const num = safeParseNumber(value);
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Check if pool balance is critically low (< 1M NGN)
  const isCriticallyLow = balance && safeParseNumber(balance.totalValueNGN) < 1000000;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">LP Pool Monitoring</h1>
              <p className="text-slate-400">
                Real-time liquidity pool health and capital flows
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {balance && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1.5" data-testid="badge-live-status">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </Badge>
                <span className="text-sm text-slate-400">
                  Updated {new Date(balance.lastSynced).toLocaleTimeString()}
                </span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={balanceLoading || flowsLoading || regenerationLoading}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(balanceLoading || flowsLoading || regenerationLoading) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              data-testid="button-auto-refresh"
            >
              {autoRefresh ? "Auto-Refresh ON" : "Auto-Refresh OFF"}
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {hasAnyError && (
          <Card className="border-red-500/50 bg-red-500/10 backdrop-blur-sm" data-testid="alert-error">
            <CardContent className="flex items-center justify-between gap-3 pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div>
                  <p className="font-semibold text-red-400">Failed to Load LP Pool Data</p>
                  <p className="text-sm text-slate-300">
                    {balanceError ? "Balance error: Unable to query Stellar network. " : ""}
                    {flowsError ? "Flows error: Unable to fetch transaction data. " : ""}
                    {regenerationError ? "Regeneration error: Unable to calculate metrics. " : ""}
                  </p>
                </div>
              </div>
              <Button onClick={handleRefreshAll} variant="outline" size="sm" data-testid="button-retry">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Critical Alert */}
        {isCriticallyLow && (
          <Card className="border-red-500/50 bg-red-500/10 backdrop-blur-sm" data-testid="alert-low-balance">
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div>
                <p className="font-semibold text-red-400">Critical Pool Balance Alert</p>
                <p className="text-sm text-slate-300">
                  LP Pool balance is below ₦1,000,000. Immediate attention required.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hero Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          {/* Total Pool Value */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm border-t-4 border-t-emerald-500" data-testid="card-total-value">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Total Pool Value</CardTitle>
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <Skeleton className="h-10 w-40" />
              ) : balance ? (
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-white" data-testid="text-total-value">
                    {formatNGN(balance.totalValueNGN)}
                  </p>
                  <p className="text-xs text-slate-400">
                    Live from Stellar Network
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No data</p>
              )}
            </CardContent>
          </Card>

          {/* 24h Inflows */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm border-t-4 border-t-blue-500" data-testid="card-inflows">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                24h Inflows
              </CardTitle>
            </CardHeader>
            <CardContent>
              {flowsLoading ? (
                <Skeleton className="h-10 w-40" />
              ) : flows ? (
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-blue-400" data-testid="text-inflows">
                    {formatNGN(flows.inflows.total)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {flows.inflows.primerCount} Primers + {flows.inflows.investmentCount} Regenerators
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No data</p>
              )}
            </CardContent>
          </Card>

          {/* 24h Outflows */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm border-t-4 border-t-orange-500" data-testid="card-outflows">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-400" />
                24h Outflows
              </CardTitle>
            </CardHeader>
            <CardContent>
              {flowsLoading ? (
                <Skeleton className="h-10 w-40" />
              ) : flows ? (
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-orange-400" data-testid="text-outflows">
                    {formatNGN(flows.outflows.total)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {flows.outflows.allocationCount} LP Allocations
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No data</p>
              )}
            </CardContent>
          </Card>

          {/* Regeneration Rate */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm border-t-4 border-t-purple-500" data-testid="card-regeneration-rate">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Regeneration Rate</CardTitle>
            </CardHeader>
            <CardContent>
              {regenerationLoading ? (
                <Skeleton className="h-10 w-40" />
              ) : regeneration ? (
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-purple-400" data-testid="text-regeneration-rate">
                    {formatNumber(regeneration.regenerationRate)}%
                  </p>
                  <p className="text-xs text-slate-400">
                    {safeParseNumber(regeneration.regenerationRate) >= 100 ? "Fully regenerated" : `${Math.max(0, 100 - safeParseNumber(regeneration.regenerationRate)).toFixed(0)}% to full regeneration`}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No data</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Asset Composition & Details */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Asset Composition */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm" data-testid="card-composition">
            <CardHeader>
              <CardTitle className="text-white">Asset Composition</CardTitle>
              <CardDescription className="text-slate-400">Current distribution of assets in LP Pool</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {balanceLoading ? (
                <>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </>
              ) : balance ? (
                <>
                  {/* NGNTS */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white">NGNTS</span>
                      <span className="text-slate-400">{balance.composition.ngntsPercent}%</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                        style={{ width: `${balance.composition.ngntsPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400">
                      {formatNumber(balance.balances.ngnts)} NGNTS = {formatNGN(parseFloat(balance.balances.ngnts))}
                    </p>
                  </div>

                  {/* USDC */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white">USDC</span>
                      <span className="text-slate-400">{balance.composition.usdcPercent}%</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                        style={{ width: `${balance.composition.usdcPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400" data-testid="text-usdc-balance">
                      {formatNumber(balance.balances.usdc)} USDC
                    </p>
                  </div>

                  {/* XLM */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white">XLM (Network Gas)</span>
                      <span className="text-slate-400">{balance.composition.xlmPercent}%</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600"
                        style={{ width: `${balance.composition.xlmPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400" data-testid="text-xlm-balance">
                      {formatNumber(balance.balances.xlm)} XLM
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400">No data available</p>
              )}
            </CardContent>
          </Card>

          {/* Net Flow & Regeneration Details */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm" data-testid="card-details">
            <CardHeader>
              <CardTitle className="text-white">Capital Flow Summary</CardTitle>
              <CardDescription className="text-slate-400">24-hour period analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {flowsLoading || regenerationLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : flows && regeneration ? (
                <>
                  {/* Net Flow */}
                  <div className="p-4 rounded-lg bg-white/5 space-y-2">
                    <p className="text-sm font-medium text-slate-400">24h Net Flow</p>
                    <p className={`text-2xl font-bold ${safeParseNumber(flows.netFlow) >= 0 ? 'text-emerald-400' : 'text-red-400'}`} data-testid="text-net-flow">
                      {safeParseNumber(flows.netFlow) >= 0 ? '+' : ''}{formatNGN(flows.netFlow)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {safeParseNumber(flows.netFlow) >= 0 ? 'Pool is growing' : 'Pool is contracting'}
                    </p>
                  </div>

                  {/* All-Time Stats */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-white">All-Time Statistics</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-400">Total Investments</p>
                        <p className="font-semibold text-white" data-testid="text-total-investments">{formatNGN(regeneration.totalInvestments)}</p>
                        <p className="text-xs text-slate-400">{regeneration.investmentCount} transactions</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Total Allocations</p>
                        <p className="font-semibold text-white" data-testid="text-total-allocations">{formatNGN(regeneration.totalAllocations)}</p>
                        <p className="text-xs text-slate-400">{regeneration.allocationCount} allocations</p>
                      </div>
                    </div>
                  </div>

                  {/* Wallet Address */}
                  {balance && (
                    <div className="pt-3 border-t border-white/10">
                      <p className="text-sm text-slate-400 mb-1">LP Pool Wallet</p>
                      <code className="text-xs bg-white/5 px-2 py-1 rounded block truncate text-slate-300" data-testid="text-wallet-address">
                        {balance.walletAddress}
                      </code>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
