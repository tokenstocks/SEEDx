import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, RefreshCw, AlertCircle, CheckCircle, Zap } from "lucide-react";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { TreasurySummary, TreasuryReconciliation, TreasurySnapshot } from "@/types/phase4";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminTreasury() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      setLocation("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "admin") {
      setLocation("/dashboard");
      return;
    }

    setUser(parsedUser);
  }, [setLocation]);

  const { data: summary, isLoading: summaryLoading } = useQuery<TreasurySummary>({
    queryKey: ["/api/admin/treasury/summary"],
    enabled: !!user,
  });

  const { data: snapshots, isLoading: snapshotsLoading } = useQuery<{ snapshots: TreasurySnapshot[] }>({
    queryKey: ["/api/admin/treasury/snapshots"],
    enabled: !!user,
  });

  const { data: reconciliation, isLoading: reconciliationLoading, refetch: refetchReconciliation } = useQuery<TreasuryReconciliation>({
    queryKey: ["/api/admin/treasury/reconcile"],
    enabled: !!user,
  });

  const runReconciliationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("GET", "/api/admin/treasury/reconcile");
    },
    onSuccess: () => {
      toast({
        title: "Reconciliation Complete",
        description: "Treasury reconciliation has been run successfully.",
      });
      refetchReconciliation();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/treasury/reconcile"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Reconciliation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const runRegenerationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/system/run-regeneration");
    },
    onSuccess: (data: any) => {
      toast({
        title: "Regeneration Complete",
        description: `Processed ${data.processedCashflows} cashflows. Regenerators: ${data.allocations.regenerators}, LP Pool: ${data.allocations.lpPool}, Treasury: ${data.allocations.treasury}, Project: ${data.allocations.projectReinvest} NGNTS`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/treasury/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/treasury/snapshots"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Regeneration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: string | number) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const chartData = snapshots?.snapshots
    .slice(-30) // Last 30 snapshots
    .map((snapshot) => ({
      date: new Date(snapshot.asOfDate).toLocaleDateString(),
      balance: parseFloat(snapshot.balance),
    })) || [];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto p-4 py-8">
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
            data-testid="link-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2 text-white">Treasury Pool Dashboard</h1>
          <p className="text-slate-400">
            Monitor regenerative capital flows and treasury pool health
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Virtual Balance</CardTitle>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-white" data-testid="text-virtual-balance">
                    {summary ? formatCurrency(summary.virtualBalance) : formatCurrency(0)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    NGNTS in treasury pool
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Transactions</CardTitle>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-white" data-testid="text-total-transactions">
                    {summary?.totalTransactions || 0}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    All-time treasury operations
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Reconciliation Status</CardTitle>
              {reconciliation?.status === 'ok' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-400" />
              )}
            </CardHeader>
            <CardContent>
              {reconciliationLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : reconciliation ? (
                <>
                  <Badge 
                    variant={reconciliation.status === 'ok' ? 'default' : 'secondary'}
                    className="mb-2"
                  >
                    {reconciliation.status.toUpperCase()}
                  </Badge>
                  {reconciliation.discrepancy && parseFloat(reconciliation.discrepancy) !== 0 && (
                    <p className="text-xs text-yellow-400 mt-1">
                      Discrepancy: {formatCurrency(reconciliation.discrepancy)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400">Not run yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transaction Breakdown */}
        {summary && (
          <Card className="mb-8 bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Transaction Breakdown</CardTitle>
              <CardDescription className="text-slate-400">
                Treasury pool operations by type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Inflow</p>
                  <p className="text-xl font-semibold text-emerald-400" data-testid="text-inflow-count">
                    {summary.transactionBreakdown.inflow}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Allocation</p>
                  <p className="text-xl font-semibold text-white" data-testid="text-allocation-count">
                    {summary.transactionBreakdown.allocation}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Buyback</p>
                  <p className="text-xl font-semibold text-white" data-testid="text-buyback-count">
                    {summary.transactionBreakdown.buyback}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Replenish</p>
                  <p className="text-xl font-semibold text-white" data-testid="text-replenish-count">
                    {summary.transactionBreakdown.replenish}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Fee</p>
                  <p className="text-xl font-semibold text-white" data-testid="text-fee-count">
                    {summary.transactionBreakdown.fee}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Regenerative Capital Management */}
        <Card className="mb-8 bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-white">Regenerative Capital Loop</CardTitle>
              <CardDescription className="text-slate-400">
                Process verified cashflows through 60/20/10/10 allocation cycle
              </CardDescription>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  disabled={runRegenerationMutation.isPending}
                  data-testid="button-run-regeneration"
                >
                  <Zap className={`w-4 h-4 mr-2 ${runRegenerationMutation.isPending ? 'animate-pulse' : ''}`} />
                  Run Regeneration
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Run Regenerative Capital Loop?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will process all verified, unprocessed project cashflows through the regenerative capital allocation cycle:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>60% allocated to treasury pool</li>
                      <li>20% distributed to LP investors</li>
                      <li>10% allocated for project reinvestment</li>
                      <li>10% allocated for platform fees</li>
                    </ul>
                    <p className="mt-2 font-medium">This action will mark processed cashflows and cannot be undone.</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-regeneration">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => runRegenerationMutation.mutate()}
                    data-testid="button-confirm-regeneration"
                  >
                    Run Regeneration
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                The regenerative capital loop automatically distributes verified project cashflows to sustain treasury health, reward LP investors, and fund continued growth.
              </p>
              <div className="grid md:grid-cols-4 gap-4 pt-2">
                <div className="p-3 bg-white/5 rounded-md">
                  <p className="text-xs text-slate-400 mb-1">Treasury Allocation</p>
                  <p className="text-lg font-bold text-white">60%</p>
                </div>
                <div className="p-3 bg-white/5 rounded-md">
                  <p className="text-xs text-slate-400 mb-1">LP Distribution</p>
                  <p className="text-lg font-bold text-white">20%</p>
                </div>
                <div className="p-3 bg-white/5 rounded-md">
                  <p className="text-xs text-slate-400 mb-1">Reinvestment</p>
                  <p className="text-lg font-bold text-white">10%</p>
                </div>
                <div className="p-3 bg-white/5 rounded-md">
                  <p className="text-xs text-slate-400 mb-1">Platform Fees</p>
                  <p className="text-lg font-bold text-white">10%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balance History Chart */}
        <Card className="mb-8 bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Treasury Balance History</CardTitle>
            <CardDescription className="text-slate-400">
              Historical balance snapshots (last 30 entries)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {snapshotsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₦${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), "Balance"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <TrendingDown className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">No snapshot data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reconciliation Details */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-white">Reconciliation Report</CardTitle>
              <CardDescription className="text-slate-400">
                Compare computed balance with latest snapshot
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => runReconciliationMutation.mutate()}
              disabled={runReconciliationMutation.isPending}
              data-testid="button-run-reconciliation"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${runReconciliationMutation.isPending ? 'animate-spin' : ''}`} />
              Run Reconciliation
            </Button>
          </CardHeader>
          <CardContent>
            {reconciliationLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : reconciliation ? (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Computed Balance</p>
                    <p className="text-xl font-semibold text-white" data-testid="text-computed-balance">
                      {formatCurrency(reconciliation.computedBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Last Snapshot Balance</p>
                    <p className="text-xl font-semibold text-white" data-testid="text-snapshot-balance">
                      {reconciliation.lastSnapshotBalance 
                        ? formatCurrency(reconciliation.lastSnapshotBalance)
                        : "N/A"
                      }
                    </p>
                  </div>
                </div>

                {reconciliation.lastSnapshotDate && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Last Snapshot Date</p>
                    <p className="text-sm text-white">{new Date(reconciliation.lastSnapshotDate).toLocaleString()}</p>
                  </div>
                )}

                {reconciliation.recommendations && reconciliation.recommendations.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-white mb-2">Recommendations</p>
                    <ul className="list-disc list-inside space-y-1">
                      {reconciliation.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-slate-400">
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {reconciliation.status === 'ok' ? (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    <p className="text-sm font-medium">Treasury is reconciled</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-sm font-medium">Discrepancy detected - review required</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400">Click "Run Reconciliation" to generate a report</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
