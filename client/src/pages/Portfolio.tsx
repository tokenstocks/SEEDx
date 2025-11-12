import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  ArrowUpFromLine,
  Activity,
  AlertCircle,
  X
} from "lucide-react";
import { Link } from "wouter";
import type { RedemptionRequest } from "@/types/phase4";
import UnifiedHeader from "@/components/UnifiedHeader";
import { motion, useReducedMotion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TimelineEvent {
  type: string;
  timestamp: string;
  amount?: string;
  tokenSymbol?: string;
  projectName?: string;
  txHash?: string;
  status?: string;
  orderType?: string;
  pricePerToken?: string;
  currency?: string;
}

interface Investment {
  id: string;
  projectId: string;
  projectName: string;
  projectTokenSymbol: string;
  amount: string;
  tokensReceived: string;
  currency: string;
  createdAt: string;
}

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
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
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

  const { data: walletData } = useQuery<{
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
  });

  const isOnboardingComplete = kycData?.kycStatus === "approved" && walletData?.activated;

  useEffect(() => {
    const hasSeenModal = sessionStorage.getItem("onboarding_modal_shown");
    
    if (!isOnboardingComplete && !hasSeenModal && user) {
      const timer = setTimeout(() => {
        setOnboardingModalOpen(true);
        sessionStorage.setItem("onboarding_modal_shown", "true");
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnboardingComplete, user]);

  const { data: portfolio, isLoading: portfolioLoading } = useQuery<Portfolio>({
    queryKey: ["/api/investments/portfolio"],
    enabled: !!user,
  });

  const { data: investments, isLoading: investmentsLoading } = useQuery<Investment[]>({
    queryKey: ["/api/investments"],
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

  const { data: redemptions, isLoading: redemptionsLoading } = useQuery<{ redemptions: RedemptionRequest[] }>({
    queryKey: ["/api/investments/redemptions/list"],
    enabled: !!user,
  });

  const { data: timeline = [], isLoading: timelineLoading } = useQuery<TimelineEvent[]>({
    queryKey: ["/api/regenerator/timeline"],
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

  const getRedemptionStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case "processing":
        return <Badge variant="default" className="flex items-center gap-1"><RefreshCw className="w-3 h-3" />Processing</Badge>;
      case "completed":
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Completed</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "token_purchase":
        return <ShoppingBag className="w-5 h-5 text-emerald-400" />;
      case "token_sale":
        return <Send className="w-5 h-5 text-blue-400" />;
      case "cashflow_received":
        return <TrendingUp className="w-5 h-5 text-purple-400" />;
      case "market_order_placed":
        return <Activity className="w-5 h-5 text-amber-400" />;
      case "market_order_filled":
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case "market_order_cancelled":
        return <XCircle className="w-5 h-5 text-red-400" />;
      case "wallet_deposit":
        return <ArrowDownToLine className="w-5 h-5 text-green-400" />;
      case "wallet_withdrawal":
        return <ArrowUpFromLine className="w-5 h-5 text-orange-400" />;
      default:
        return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "token_purchase":
        return "bg-emerald-500/20 border-emerald-500/30";
      case "token_sale":
        return "bg-blue-500/20 border-blue-500/30";
      case "cashflow_received":
        return "bg-purple-500/20 border-purple-500/30";
      case "market_order_placed":
        return "bg-amber-500/20 border-amber-500/30";
      case "market_order_filled":
        return "bg-emerald-500/20 border-emerald-500/30";
      case "market_order_cancelled":
        return "bg-red-500/20 border-red-500/30";
      case "wallet_deposit":
        return "bg-green-500/20 border-green-500/30";
      case "wallet_withdrawal":
        return "bg-orange-500/20 border-orange-500/30";
      default:
        return "bg-slate-500/20 border-slate-500/30";
    }
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

  const formatCurrency = (amount: string | number, currency: string = "NGN") => {
    const value = typeof amount === "string" ? parseFloat(amount) : amount;
    
    const localeMap: Record<string, string> = {
      "NGN": "en-NG",
      "USD": "en-US",
      "USDC": "en-US",
      "XLM": "en-US",
    };

    const locale = localeMap[currency] || "en-US";
    
    if (currency === "USDC") {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(value).replace("$", "USDC ");
    } else if (currency === "XLM") {
      return `${value.toFixed(7)} XLM`;
    }

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const renderEventDescription = (event: TimelineEvent) => {
    switch (event.type) {
      case "token_purchase":
        return (
          <div className="space-y-1">
            <p className="text-sm text-white">
              Purchased {parseFloat(event.amount || "0").toLocaleString()} {event.tokenSymbol} tokens
            </p>
            <p className="text-xs text-slate-400">
              Project: {event.projectName}
            </p>
            {event.txHash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${event.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-emerald-400 hover:text-emerald-300"
                data-testid={`link-tx-${event.txHash.substring(0, 8)}`}
              >
                View on Stellar
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
          </div>
        );
      case "token_sale":
        return (
          <div className="space-y-1">
            <p className="text-sm text-white">
              Sold {parseFloat(event.amount || "0").toLocaleString()} {event.tokenSymbol} tokens
            </p>
            <p className="text-xs text-slate-400">
              Project: {event.projectName}
            </p>
          </div>
        );
      case "cashflow_received":
        return (
          <div className="space-y-1">
            <p className="text-sm text-white">
              Received {formatCurrency(parseFloat(event.amount || "0"))} cashflow distribution
            </p>
            <p className="text-xs text-slate-400">
              Project: {event.projectName}
            </p>
          </div>
        );
      case "market_order_placed":
        return (
          <div className="space-y-1">
            <p className="text-sm text-white">
              {event.orderType === "buy" ? "Buy" : "Sell"} order placed for {event.tokenSymbol}
            </p>
            <p className="text-xs text-slate-400">
              Amount: {parseFloat(event.amount || "0").toLocaleString()} @ {formatCurrency(parseFloat(event.pricePerToken || "0"))} per token
            </p>
          </div>
        );
      case "market_order_filled":
        return (
          <div className="space-y-1">
            <p className="text-sm text-white">
              {event.orderType === "buy" ? "Buy" : "Sell"} order filled
            </p>
            <p className="text-xs text-slate-400">
              {parseFloat(event.amount || "0").toLocaleString()} {event.tokenSymbol} tokens
            </p>
          </div>
        );
      case "market_order_cancelled":
        return (
          <div className="space-y-1">
            <p className="text-sm text-white">
              Order cancelled
            </p>
            <p className="text-xs text-slate-400">
              {event.tokenSymbol} {event.orderType === "buy" ? "buy" : "sell"} order
            </p>
          </div>
        );
      case "wallet_deposit":
        return (
          <div className="space-y-1">
            <p className="text-sm text-white">
              Deposited {formatCurrency(parseFloat(event.amount || "0"), event.currency || "NGN")}
            </p>
            {event.txHash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${event.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-emerald-400 hover:text-emerald-300"
                data-testid={`link-tx-${event.txHash.substring(0, 8)}`}
              >
                View on Stellar
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
          </div>
        );
      case "wallet_withdrawal":
        return (
          <div className="space-y-1">
            <p className="text-sm text-white">
              Withdrew {formatCurrency(parseFloat(event.amount || "0"), event.currency || "NGN")}
            </p>
            {event.txHash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${event.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-emerald-400 hover:text-emerald-300"
                data-testid={`link-tx-${event.txHash.substring(0, 8)}`}
              >
                View on Stellar
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
          </div>
        );
      default:
        return (
          <p className="text-sm text-slate-400">
            Activity recorded
          </p>
        );
    }
  };

  const getTotalInvested = () => {
    return stats?.totalInvested || 0;
  };

  const getTotalValue = () => {
    return parseFloat(portfolio?.totalValue || "0");
  };

  const calculateGainLoss = () => {
    return getTotalValue() - getTotalInvested();
  };

  const calculateGainLossPercentage = () => {
    const invested = getTotalInvested();
    if (invested === 0) return 0;
    const gainLoss = calculateGainLoss();
    return (gainLoss / invested) * 100;
  };

  const prefersReducedMotion = useReducedMotion();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <UnifiedHeader />
      <div className="max-w-7xl mx-auto p-4 py-8">
        {/* Onboarding Banner */}
        {!isOnboardingComplete && !bannerDismissed && (
          <Alert className="mb-6 bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border-emerald-500/30" data-testid="alert-onboarding-banner">
            <AlertCircle className="h-4 w-4 text-emerald-400" />
            <AlertDescription className="flex items-center justify-between">
              <div className="flex-1 text-white">
                <span className="font-semibold">Complete Your Setup:</span>{" "}
                {kycData?.kycStatus !== "approved" && "Get KYC verified"}
                {kycData?.kycStatus !== "approved" && !walletData?.activated && " and "}
                {!walletData?.activated && "activate your wallet"}
                {" to start participating in projects."}
              </div>
              <div className="flex items-center gap-2">
                {kycData?.kycStatus !== "approved" && (
                  <Button
                    size="sm"
                    onClick={() => setLocation("/regenerator-profile")}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    data-testid="button-complete-kyc"
                  >
                    Complete KYC
                  </Button>
                )}
                {!walletData?.activated && (
                  <Button
                    size="sm"
                    onClick={() => setLocation("/regenerator-profile")}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-activate-wallet"
                  >
                    Activate Wallet
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setBannerDismissed(true)}
                  className="text-slate-400 hover:text-white"
                  data-testid="button-dismiss-banner"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Regenerator Dashboard
                </Badge>
              </div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                My Portfolio
              </h1>
              <p className="text-slate-400 text-lg">
                Track your agricultural participation performance
              </p>
            </div>
            {user?.isLpInvestor && (
              <Link href="/lp-dashboard" data-testid="link-lp-dashboard">
                <Button className="gap-2 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-600/20">
                  <TrendingUp className="w-4 h-4" />
                  LP Dashboard
                </Button>
              </Link>
            )}
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: "Total Invested",
              value: formatCurrency(getTotalInvested()),
              subtitle: "Across all projects",
              icon: Wallet,
              color: "text-blue-400",
              bgGradient: "from-blue-500/10 to-blue-600/10"
            },
            {
              title: "Portfolio Value",
              value: formatCurrency(getTotalValue()),
              subtitle: `${calculateGainLoss() >= 0 ? '+' : ''}${calculateGainLossPercentage().toFixed(2)}% ${calculateGainLoss() >= 0 ? 'Gain' : 'Loss'}`,
              icon: TrendingUp,
              color: "text-emerald-400",
              bgGradient: "from-emerald-500/10 to-emerald-600/10",
              subtitleColor: calculateGainLoss() >= 0 ? "text-emerald-400" : "text-red-400"
            },
            {
              title: "Cashflow Received",
              value: formatCurrency(stats?.totalCashflowReceived || 0),
              subtitle: "Lifetime distributions",
              icon: DollarSign,
              color: "text-purple-400",
              bgGradient: "from-purple-500/10 to-purple-600/10"
            },
            {
              title: "Active Projects",
              value: stats?.activeProjects || 0,
              subtitle: "Participating in",
              icon: Coins,
              color: "text-amber-400",
              bgGradient: "from-amber-500/10 to-amber-600/10"
            }
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
            >
              <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 h-full hover-elevate transition-all duration-300">
                <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r ${stat.bgGradient}`} />
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-slate-400">{stat.title}</h3>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="text-3xl font-bold mb-1 text-white">
                  {stat.value}
                </div>
                <p className={`text-xs ${stat.subtitleColor || 'text-slate-500'}`}>
                  {stat.subtitle}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Token Holdings, Investment History, Redemptions & Timeline */}
        <Tabs defaultValue="holdings" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-3xl bg-white/5 border-white/10">
            <TabsTrigger value="holdings" data-testid="tab-holdings" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">Token Holdings</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">Investment History</TabsTrigger>
            <TabsTrigger value="redemptions" data-testid="tab-redemptions" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">Redemptions</TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">Activity Timeline</TabsTrigger>
          </TabsList>

          {/* Token Holdings Tab */}
          <TabsContent value="holdings">
            <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-2">Token Holdings</h2>
                <p className="text-slate-400 mb-6">
                  Consolidated view of your token holdings by project
                </p>
                <div>
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
                  <div className="space-y-4">
                    {portfolio.holdings.map((holding) => {
                      const currentValue = parseFloat(holding.tokenAmount) * parseFloat(holding.pricePerToken);
                      return (
                        <div
                          key={holding.id}
                          className="flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate bg-white/5"
                          data-testid={`holding-${holding.projectId}`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 bg-emerald-500/10 rounded flex items-center justify-center flex-shrink-0">
                              <Coins className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-white">{holding.projectName}</h4>
                              <p className="text-sm text-slate-400">
                                {parseFloat(holding.tokenAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })} {holding.tokenSymbol}
                              </p>
                              {holding.stellarAssetCode && (
                                <div className="mt-1 flex items-center gap-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {holding.stellarAssetCode}
                                  </Badge>
                                  <a
                                    href={`https://stellar.expert/explorer/testnet/account/${holding.stellarIssuerPublicKey}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                                  >
                                    View on Stellar
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="text-right">
                              <div className="font-semibold text-white">
                                {formatCurrency(currentValue.toFixed(2))}
                              </div>
                              <div className="text-sm text-slate-400">
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
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Coins className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-white">No token holdings yet</h3>
                    <p className="text-slate-400 mb-4">
                      Start investing in agricultural projects to receive tokens
                    </p>
                    <Link href="/projects" data-testid="link-browse-projects-holdings">
                      <Button>Browse Projects</Button>
                    </Link>
                  </div>
                )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Investment History Tab */}
          <TabsContent value="history">
            <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-2">Investment History</h2>
                <p className="text-slate-400 mb-6">
                  Complete history of all your investments
                </p>
                <div>
                {investmentsLoading ? (
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
                ) : investments && investments.length > 0 ? (
                  <div className="space-y-3">
                    {investments.map((investment) => (
                      <div
                        key={investment.id}
                        className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5"
                        data-testid={`investment-${investment.id}`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 bg-blue-500/10 rounded flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white">{investment.projectName}</h4>
                            <p className="text-xs text-slate-400">
                              {new Date(investment.createdAt).toLocaleDateString()} at {new Date(investment.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-semibold text-white">
                            {formatCurrency(investment.amount)}
                          </div>
                          <div className="text-xs text-slate-400">
                            +{parseFloat(investment.tokensReceived).toLocaleString(undefined, { maximumFractionDigits: 2 })} {investment.projectTokenSymbol}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-white">No investments yet</h3>
                    <p className="text-slate-400 mb-4">
                      Start investing in agricultural projects to build your portfolio
                    </p>
                    <Link href="/projects" data-testid="link-browse-projects-history">
                      <Button>Browse Projects</Button>
                    </Link>
                  </div>
                )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Redemptions Tab */}
          <TabsContent value="redemptions">
            <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-2">Redemption History</h2>
                <p className="text-slate-400 mb-6">
                  Track your token redemption requests and their status
                </p>
                <div>
                {redemptionsLoading ? (
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
                ) : redemptions && redemptions.redemptions.length > 0 ? (
                  <div className="space-y-3">
                    {redemptions.redemptions.map((redemption) => (
                      <div
                        key={redemption.id}
                        className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5"
                        data-testid={`redemption-${redemption.id}`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 bg-purple-500/10 rounded flex items-center justify-center flex-shrink-0">
                            <RefreshCw className="w-5 h-5 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white">{redemption.projectName || `Project ${redemption.projectId.slice(0, 8)}...`}</h4>
                            <p className="text-xs text-slate-400">
                              {parseFloat(redemption.tokensAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens → {formatCurrency(redemption.redemptionValueNgnts)} NGNTS
                            </p>
                            <p className="text-xs text-slate-400">
                              Requested: {new Date(redemption.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <div className="font-semibold text-white">
                              {formatCurrency(redemption.redemptionValueNgnts)}
                            </div>
                          </div>
                          {getRedemptionStatusBadge(redemption.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <RefreshCw className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-white">No redemptions yet</h3>
                    <p className="text-slate-400 mb-4">
                      Your redemption history will appear here when you redeem tokens
                    </p>
                  </div>
                )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Activity Timeline Tab */}
          <TabsContent value="timeline">
            <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-2">Activity Timeline</h2>
                <p className="text-slate-400 mb-6">Your complete participation history</p>
                <div>
                  {timelineLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Clock className="w-8 h-8 text-slate-500 animate-spin" />
                    </div>
                  ) : timeline.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2 text-white">No activity yet</h3>
                      <p className="text-slate-400 mb-4">
                        Your participation and trading history will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {timeline.map((event, index) => (
                        <motion.div
                          key={`${event.type}-${event.timestamp}-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex gap-4"
                          data-testid={`event-${event.type}-${index}`}
                        >
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center ${getEventColor(event.type)}`}>
                            {getEventIcon(event.type)}
                          </div>
                          <div className="flex-1 min-w-0 pb-4 border-b border-white/5 last:border-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex-1 min-w-0">
                                {renderEventDescription(event)}
                              </div>
                              <div className="text-xs text-slate-500 flex-shrink-0">
                                {formatTimestamp(event.timestamp)}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Redemption Dialog */}
      <Dialog open={redemptionDialogOpen} onOpenChange={setRedemptionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redeem Tokens</DialogTitle>
            <DialogDescription>
              Request to redeem your {selectedHolding?.tokenSymbol} tokens for cash value
            </DialogDescription>
          </DialogHeader>
          {selectedHolding && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Project</span>
                  <span className="font-medium">{selectedHolding.projectName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <Label className="text-sm text-muted-foreground">Available to Redeem</Label>
                  <p className="font-semibold">
                    {parseFloat(selectedHolding.tokenAmount).toLocaleString()} {selectedHolding.tokenSymbol}
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current Price</span>
                  <span className="font-medium">{formatCurrency(selectedHolding.pricePerToken)}/token</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tokens-amount">Tokens to Redeem</Label>
                <Input
                  id="tokens-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={tokensToRedeem}
                  onChange={(e) => setTokensToRedeem(e.target.value)}
                  max={parseFloat(selectedHolding.tokenAmount)}
                  step="0.01"
                  data-testid="input-redeem-amount"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum: {parseFloat(selectedHolding.tokenAmount).toLocaleString()} tokens
                </p>
              </div>
              {tokensToRedeem && parseFloat(tokensToRedeem) > 0 && (
                <div className="rounded-lg bg-muted p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Value</span>
                    <span className="font-semibold">
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
            >
              {createRedemptionMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Onboarding Modal */}
      <Dialog open={onboardingModalOpen} onOpenChange={setOnboardingModalOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-emerald-500/30" data-testid="dialog-onboarding">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <DialogTitle className="text-2xl text-white">Welcome to SEEDx!</DialogTitle>
            </div>
            <DialogDescription className="text-slate-300 text-base">
              Complete these steps to start participating in regenerative agricultural projects
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-4 p-4 rounded-lg border border-white/10 bg-white/5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                kycData?.kycStatus === "approved" ? "bg-emerald-600" : "bg-slate-700"
              }`}>
                {kycData?.kycStatus === "approved" ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <span className="text-white font-semibold">1</span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Complete KYC Verification</h3>
                <p className="text-sm text-slate-400 mb-2">
                  Submit your identity documents for verification. This typically takes 1-2 business days.
                </p>
                {kycData?.kycStatus !== "approved" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setOnboardingModalOpen(false);
                      setLocation("/regenerator-profile");
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    data-testid="button-modal-kyc"
                  >
                    Start KYC
                  </Button>
                )}
                {kycData?.status === "approved" && (
                  <Badge className="bg-emerald-600" data-testid="badge-modal-kyc-complete">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                )}
                {kycData?.kycStatus === "pending" && (
                  <Badge variant="secondary" data-testid="badge-modal-kyc-pending">
                    <Clock className="w-3 h-3 mr-1" />
                    Under Review
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg border border-white/10 bg-white/5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                walletData?.activated ? "bg-emerald-600" : "bg-slate-700"
              }`}>
                {walletData?.activated ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <span className="text-white font-semibold">2</span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Activate Your Wallet</h3>
                <p className="text-sm text-slate-400 mb-2">
                  Set up your Stellar blockchain wallet to hold project tokens and receive cashflow.
                </p>
                {!walletData?.activated && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setOnboardingModalOpen(false);
                      setLocation("/regenerator-profile");
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-modal-wallet"
                  >
                    Activate Wallet
                  </Button>
                )}
                {walletData?.activated && (
                  <Badge className="bg-emerald-600" data-testid="badge-modal-wallet-complete">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Activated
                  </Badge>
                )}
                {walletData?.activationStatus === "pending" && (
                  <Badge variant="secondary" data-testid="badge-modal-wallet-pending">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending Approval
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg border border-white/10 bg-white/5">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold">3</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Browse & Participate</h3>
                <p className="text-sm text-slate-400">
                  Once verified, explore agricultural projects and acquire participation tokens.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setOnboardingModalOpen(false)}
              className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
              data-testid="button-modal-close"
            >
              Got it, thanks!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
