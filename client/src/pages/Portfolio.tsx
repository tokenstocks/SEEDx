import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  TrendingUp,
  Package,
  DollarSign,
  ExternalLink,
  Coins,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Sparkles,
  Wallet,
  Send,
  ShoppingBag,
  ArrowDownToLine,
  Activity,
  AlertCircle,
  X,
  Info,
  Fuel,
  PlusCircle,
  Building2,
  BarChart3,
  Zap
} from "lucide-react";
import { Link } from "wouter";
import type { RedemptionRequest } from "@/types/phase4";
import UnifiedHeader from "@/components/UnifiedHeader";
import { motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TokenHolding {
  id: string;
  projectId: string;
  projectName: string;
  tokenSymbol: string;
  tokenAmount: string;
  pricePerToken: string;
  stellarAssetCode: string;
  stellarIssuerPublicKey: string;
  updatedAt: string;
}

interface Portfolio {
  holdings: TokenHolding[];
  totalValue: string;
  currency: string;
}

export default function Portfolio() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [redemptionDialogOpen, setRedemptionDialogOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<TokenHolding | null>(null);
  const [tokensToRedeem, setTokensToRedeem] = useState("");
  const [showAllActivity, setShowAllActivity] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      setLocation("/login");
      return;
    }

    setUser(JSON.parse(userData));
  }, [setLocation]);

  const { data: kycData } = useQuery<{
    kycStatus: string;
    kycDocuments?: any;
  }>({
    queryKey: ["/api/users/kyc-status"],
    enabled: !!user,
  });

  const { data: walletData, dataUpdatedAt: walletUpdatedAt } = useQuery<{
    activated: boolean;
    activationStatus: string;
    publicKey: string;
    balances: {
      xlm: string;
      usdc: string;
      ngnts: string;
    };
  }>({
    queryKey: ["/api/regenerator/wallet/balances"],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: exchangeRates } = useQuery<{
    rates: {
      xlmNgn: string;
      usdcNgn: string;
      ngntsNgn: string;
      xlmUsd: string;
      usdNgn: string;
    };
    lastFetchedAt: string;
    isStale: boolean;
  }>({
    queryKey: ["/api/exchange-rates"],
    refetchInterval: 60000,
  });

  const { data: portfolio, isLoading: portfolioLoading } = useQuery<Portfolio>({
    queryKey: ["/api/investments/portfolio"],
    enabled: !!user,
  });

  const { data: stats } = useQuery<{
    totalInvested: number;
    totalCashflowReceived: number;
    totalTokensOwned: number;
    activeProjects: number;
  }>({
    queryKey: ["/api/regenerator/stats"],
    enabled: !!user,
  });

  const { data: redemptions } = useQuery<{ redemptions: RedemptionRequest[] }>({
    queryKey: ["/api/investments/redemptions/list"],
    enabled: !!user,
  });

  const { data: depositHistory } = useQuery<{
    deposits: Array<{
      id: string;
      amountNGN: string;
      platformFee: string;
      gasFee: string;
      ngntsAmount: string;
      status: "pending" | "approved" | "rejected" | "completed";
      referenceCode: string;
      txHash: string | null;
      createdAt: string;
    }>;
  }>({
    queryKey: ["/api/regenerator/bank-deposits"],
    enabled: !!user,
  });

  const createRedemptionMutation = useMutation({
    mutationFn: async (data: { projectId: string; tokensAmount: string }) => {
      return await apiRequest("POST", "/api/investments/redemptions/create", data);
    },
    onSuccess: () => {
      toast({
        title: "Redemption Request Submitted",
        description: "Your redemption request has been submitted and is pending admin review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/investments/redemptions/list"] });
      setRedemptionDialogOpen(false);
      setSelectedHolding(null);
      setTokensToRedeem("");
    },
    onError: (error: Error) => {
      toast({
        title: "Redemption Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const totalCapitalValue = useMemo(() => {
    if (!walletData || !exchangeRates) return 0;

    const ngntsBalance = parseFloat(walletData.balances.ngnts || "0");
    const usdcBalance = parseFloat(walletData.balances.usdc || "0");
    const usdcToNgnRate = parseFloat(exchangeRates.rates.usdcNgn || "1650");

    const ngntsValue = ngntsBalance;
    const usdcValue = usdcBalance * usdcToNgnRate;

    return ngntsValue + usdcValue;
  }, [walletData, exchangeRates]);

  const walletLastUpdated = useMemo(() => {
    if (!walletUpdatedAt) return "Never";
    const diffMs = Date.now() - walletUpdatedAt;
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 10) return "Just now";
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  }, [walletUpdatedAt]);

  const isDataLive = useMemo(() => {
    if (!walletUpdatedAt) return false;
    const diffMs = Date.now() - walletUpdatedAt;
    return diffMs < 10000;
  }, [walletUpdatedAt]);

  const assetAllocation = useMemo(() => {
    if (!walletData || totalCapitalValue === 0) return { ngnts: 0, usdc: 0 };

    const ngntsBalance = parseFloat(walletData.balances.ngnts || "0");
    const usdcBalance = parseFloat(walletData.balances.usdc || "0");
    const usdcToNgnRate = parseFloat(exchangeRates?.rates.usdcNgn || "1650");

    const ngntsValue = ngntsBalance;
    const usdcValue = usdcBalance * usdcToNgnRate;

    return {
      ngnts: (ngntsValue / totalCapitalValue) * 100,
      usdc: (usdcValue / totalCapitalValue) * 100,
    };
  }, [walletData, exchangeRates, totalCapitalValue]);

  const recentActivity = useMemo(() => {
    if (!depositHistory?.deposits) return [];
    return depositHistory.deposits.slice(0, 5);
  }, [depositHistory]);

  const isOnboardingComplete = kycData?.kycStatus === "approved" && walletData?.activated;

  const handleRedeemClick = (holding: TokenHolding) => {
    setSelectedHolding(holding);
    setRedemptionDialogOpen(true);
  };

  const handleRedemptionSubmit = () => {
    if (!selectedHolding || !tokensToRedeem) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid token amount to redeem.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(tokensToRedeem);
    if (isNaN(amount) || amount <= 0 || amount > parseFloat(selectedHolding.tokenAmount)) {
      toast({
        title: "Invalid Amount",
        description: `Please enter an amount between 0 and ${selectedHolding.tokenAmount} tokens.`,
        variant: "destructive",
      });
      return;
    }

    createRedemptionMutation.mutate({
      projectId: selectedHolding.projectId,
      tokensAmount: tokensToRedeem,
    });
  };

  const formatCurrency = (amount: string | number) => {
    const value = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 border-orange-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
      case "completed":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="bg-red-500/10 text-red-400 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!user) return null;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <UnifiedHeader />
        
        <div className="max-w-7xl mx-auto p-4 py-8 space-y-8">
          {/* Page Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent" data-testid="text-page-title">
                Member Dashboard
              </h1>
              <p className="text-slate-400 text-lg">
                Track your cooperative participation and capital
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={isOnboardingComplete ? "default" : "secondary"}
                className={
                  isOnboardingComplete
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-orange-500/10 text-orange-400 border-orange-500/30"
                }
                data-testid="badge-account-status"
              >
                {isOnboardingComplete ? "Active Member" : kycData?.kycStatus === "pending" ? "KYC Under Review" : "Pending Setup"}
              </Badge>
            </div>
          </div>

          {/* Onboarding Alert */}
          {!isOnboardingComplete && (
            <Alert className="bg-gradient-to-r from-orange-900/30 to-amber-900/30 border-orange-500/30">
              <AlertCircle className="h-4 w-4 text-orange-400" />
              <AlertDescription className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex-1 text-white">
                  <span className="font-semibold">Complete Your Setup:</span>{" "}
                  {kycData?.kycStatus !== "approved" && "Get KYC verified"}
                  {kycData?.kycStatus !== "approved" && !walletData?.activated && " and "}
                  {!walletData?.activated && "activate your wallet"}
                  {" to start participating in cooperatives."}
                </div>
                <Link href="/regenerator-profile">
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700" data-testid="button-complete-setup">
                    Complete Setup
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {/* Hero Capital Value Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-900/20 via-blue-900/20 to-purple-900/20 border-2 border-emerald-500/30 backdrop-blur-md">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" />
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="text-lg text-slate-400 font-normal mb-2">Total Capital Value</CardTitle>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl md:text-6xl font-bold text-white" data-testid="text-total-capital">
                        {formatCurrency(totalCapitalValue)}
                      </span>
                      {isDataLive && (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Live
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      Last updated: {walletLastUpdated}
                    </p>
                  </div>
                  <Link href="/regenerator-profile">
                    <Button className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800" data-testid="button-deposit-hero">
                      <PlusCircle className="w-4 h-4" />
                      Add Capital
                    </Button>
                  </Link>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {totalCapitalValue > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Capital Allocation</span>
                      <span className="text-slate-500">NGNTS + USDC</span>
                    </div>

                    {/* NGNTS */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-white font-medium">NGNTS</span>
                          <span className="text-slate-400 text-sm">
                            {assetAllocation.ngnts.toFixed(1)}%
                          </span>
                        </div>
                        <span className="text-white font-medium">
                          {formatCurrency(walletData?.balances.ngnts || "0")}
                        </span>
                      </div>
                      <Progress
                        value={assetAllocation.ngnts}
                        className="h-2 bg-slate-800/50 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-emerald-600"
                      />
                    </div>

                    {/* USDC */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-white font-medium">USDC</span>
                          <span className="text-slate-400 text-sm">
                            {assetAllocation.usdc.toFixed(1)}%
                          </span>
                        </div>
                        <span className="text-white font-medium">
                          {formatCurrency(parseFloat(walletData?.balances.usdc || "0") * parseFloat(exchangeRates?.rates.usdcNgn || "1650"))}
                        </span>
                      </div>
                      <Progress
                        value={assetAllocation.usdc}
                        className="h-2 bg-slate-800/50 [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-blue-600"
                      />
                    </div>

                    {/* XLM Gas */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center gap-2">
                              <Fuel className="w-4 h-4 text-amber-400" />
                              <span className="text-slate-400 text-sm">Network Gas</span>
                              <Info className="w-3 h-3 text-slate-500" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs max-w-xs">
                              XLM is used exclusively for Stellar network transaction fees (gas). It's not counted as participation capital.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Badge variant="secondary" className="bg-slate-800/50 text-amber-400">
                        {parseFloat(walletData?.balances.xlm || "0").toFixed(4)} XLM
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Wallet className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Make Your First Capital Contribution</h3>
                    <p className="text-slate-400 mb-6">
                      Add capital to your wallet to start participating in agricultural cooperatives
                    </p>
                    <Link href="/regenerator-profile">
                      <Button className="bg-gradient-to-r from-emerald-600 to-emerald-700">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Add Capital Now
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="bg-white/5 backdrop-blur-md border-white/10 hover-elevate">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/60 to-blue-600/60" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-slate-400 font-normal">Total Contributed</CardTitle>
                  <Wallet className="w-4 h-4 text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white" data-testid="text-total-contributed">
                  {formatCurrency(stats?.totalInvested || 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Lifetime capital</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-md border-white/10 hover-elevate">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500/60 to-purple-600/60" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-slate-400 font-normal">Participation Units</CardTitle>
                  <Package className="w-4 h-4 text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white" data-testid="text-participation-units">
                  {stats?.totalTokensOwned?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-slate-500 mt-1">Tokens owned</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-md border-white/10 hover-elevate">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/60 to-amber-600/60" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-slate-400 font-normal">Active Cooperatives</CardTitle>
                  <Building2 className="w-4 h-4 text-amber-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white" data-testid="text-active-cooperatives">
                  {stats?.activeProjects || 0}
                </div>
                <p className="text-xs text-slate-500 mt-1">Participating in</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-md border-white/10 hover-elevate">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 to-emerald-600/60" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-slate-400 font-normal">Total Distributions</CardTitle>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white" data-testid="text-total-distributions">
                  {formatCurrency(stats?.totalCashflowReceived || 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Lifetime received</p>
              </CardContent>
            </Card>
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Portfolio Holdings */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-white/5 backdrop-blur-md border-white/10">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">Participation Holdings</CardTitle>
                      <p className="text-sm text-slate-400 mt-1">Your cooperative project tokens</p>
                    </div>
                    <Link href="/projects">
                      <Button variant="outline" size="sm" data-testid="button-browse-cooperatives">
                        Browse Cooperatives
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {portfolioLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4">
                          <Skeleton className="h-12 w-12 rounded" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/4" />
                          </div>
                          <Skeleton className="h-4 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : portfolio && portfolio.holdings.length > 0 ? (
                    <div className="space-y-3">
                      {portfolio.holdings.slice(0, 4).map((holding) => {
                        const currentValue = parseFloat(holding.tokenAmount) * parseFloat(holding.pricePerToken);
                        return (
                          <div
                            key={holding.id}
                            className="flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate bg-white/5"
                            data-testid={`holding-${holding.projectId}`}
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Coins className="w-5 h-5 text-emerald-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-white truncate">{holding.projectName}</h4>
                                <p className="text-sm text-slate-400">
                                  {parseFloat(holding.tokenAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })} {holding.tokenSymbol}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-right">
                                <div className="font-semibold text-white">
                                  {formatCurrency(currentValue.toFixed(2))}
                                </div>
                                <div className="text-xs text-slate-400">
                                  @ {formatCurrency(holding.pricePerToken)}/token
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRedeemClick(holding)}
                                data-testid={`button-redeem-${holding.projectId}`}
                              >
                                Redeem
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {portfolio.holdings.length > 4 && (
                        <Link href="/regenerator-profile">
                          <Button variant="ghost" className="w-full text-emerald-400 hover:text-emerald-300">
                            View All Holdings ({portfolio.holdings.length})
                          </Button>
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Coins className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2 text-white">No holdings yet</h3>
                      <p className="text-slate-400 mb-4">
                        Participate in agricultural cooperatives to receive tokens
                      </p>
                      <Link href="/projects">
                        <Button data-testid="link-browse-projects-holdings">
                          Browse Cooperatives
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-white/5 backdrop-blur-md border-white/10">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500/60 via-pink-500/60 to-purple-500/60" />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Clock className="w-5 h-5 text-purple-400" />
                        Recent Activity
                      </CardTitle>
                      <p className="text-sm text-slate-400 mt-1">Your latest capital transactions</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentActivity.length > 0 ? (
                    <div className="space-y-3">
                      {(showAllActivity ? depositHistory?.deposits : recentActivity)?.map((deposit) => (
                        <div
                          key={deposit.id}
                          className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5"
                          data-testid={`activity-${deposit.id}`}
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <ArrowDownToLine className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-white font-medium">Deposit</span>
                                {getStatusBadge(deposit.status)}
                              </div>
                              <p className="text-sm text-slate-400">
                                Ref: {deposit.referenceCode} • {formatTimestamp(deposit.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-semibold text-white">
                              {formatCurrency(deposit.amountNGN)}
                            </div>
                            {deposit.txHash && (
                              <a
                                href={`https://stellar.expert/explorer/testnet/tx/${deposit.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs text-emerald-400 hover:text-emerald-300 mt-1"
                                data-testid={`tx-link-${deposit.id}`}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Stellar
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                      {depositHistory && depositHistory.deposits.length > 5 && (
                        <Button
                          variant="ghost"
                          className="w-full text-purple-400 hover:text-purple-300"
                          onClick={() => setShowAllActivity(!showAllActivity)}
                        >
                          {showAllActivity ? "Show Less" : `View All (${depositHistory.deposits.length})`}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                      <p className="text-slate-400">No activity yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Quick Actions */}
            <div className="space-y-6">
              <Card className="bg-white/5 backdrop-blur-md border-white/10">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/60 to-orange-500/60" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Zap className="w-5 h-5 text-amber-400" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/regenerator-profile" className="block">
                    <Button className="w-full justify-start gap-2 bg-emerald-600 hover:bg-emerald-700" data-testid="button-go-to-settings">
                      <PlusCircle className="w-4 h-4" />
                      Add Capital
                    </Button>
                  </Link>
                  <Link href="/projects" className="block">
                    <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-browse-projects">
                      <Building2 className="w-4 h-4" />
                      Browse Cooperatives
                    </Button>
                  </Link>
                  <Link href="/marketplace" className="block">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <ShoppingBag className="w-4 h-4" />
                      Marketplace
                    </Button>
                  </Link>
                  <Link href="/regenerator-profile" className="block">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <BarChart3 className="w-4 h-4" />
                      View Settings
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Member Benefits */}
              <Card className="bg-gradient-to-br from-emerald-900/20 to-blue-900/20 border-emerald-500/20 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    Member Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-300">
                      Access to tokenized agricultural cooperatives
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-300">
                      Receive distribution payments from cooperative cashflows
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-300">
                      Trade participation units on the marketplace
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-300">
                      Full transparency via blockchain verification
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Redemption Dialog */}
        <Dialog open={redemptionDialogOpen} onOpenChange={setRedemptionDialogOpen}>
          <DialogContent className="sm:max-w-md bg-slate-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Redeem Tokens</DialogTitle>
              <DialogDescription className="text-slate-400">
                Request to redeem your {selectedHolding?.tokenSymbol} tokens for cash value
              </DialogDescription>
            </DialogHeader>
            {selectedHolding && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Cooperative</span>
                    <span className="font-medium text-white">{selectedHolding.projectName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <Label className="text-sm text-slate-400">Available to Redeem</Label>
                    <p className="font-semibold text-white">
                      {parseFloat(selectedHolding.tokenAmount).toLocaleString()} {selectedHolding.tokenSymbol}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Current Price</span>
                    <span className="font-medium text-white">{formatCurrency(selectedHolding.pricePerToken)}/token</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tokens-amount" className="text-white">Tokens to Redeem</Label>
                  <Input
                    id="tokens-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={tokensToRedeem}
                    onChange={(e) => setTokensToRedeem(e.target.value)}
                    max={parseFloat(selectedHolding.tokenAmount)}
                    step="0.01"
                    data-testid="input-redeem-amount"
                    className="bg-slate-800 border-white/10 text-white"
                  />
                  <p className="text-xs text-slate-400">
                    Maximum: {parseFloat(selectedHolding.tokenAmount).toLocaleString()} tokens
                  </p>
                </div>
                {tokensToRedeem && parseFloat(tokensToRedeem) > 0 && (
                  <div className="rounded-lg bg-slate-800/50 border border-white/10 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Estimated Value</span>
                      <span className="font-semibold text-white">
                        {formatCurrency((parseFloat(tokensToRedeem) * parseFloat(selectedHolding.pricePerToken)).toFixed(2))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRedemptionDialogOpen(false);
                  setTokensToRedeem("");
                }}
                data-testid="button-cancel-redeem"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRedemptionSubmit}
                disabled={createRedemptionMutation.isPending}
                data-testid="button-submit-redeem"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {createRedemptionMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
