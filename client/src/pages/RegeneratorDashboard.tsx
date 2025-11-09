import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Wallet, 
  ShoppingCart, 
  Activity, 
  ExternalLink,
  CheckCircle2,
  XCircle,
  Send,
  ShoppingBag,
  Clock,
  Lock,
  Unlock,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { motion } from "framer-motion";
import RegeneratorHeader from "@/components/RegeneratorHeader";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

interface TokenHolding {
  tokenSymbol: string;
  tokenAmount: string;
  liquidTokens: string;
  lockedTokens: string;
  projectId: string;
  projectName: string;
  projectLocation: string;
  projectStatus: string;
  currentNav: string;
}

export default function RegeneratorDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const { data: stats } = useQuery<{
    totalInvested: number;
    totalCashflowReceived: number;
    totalTokensOwned: number;
    activeProjects: number;
  }>({
    queryKey: ["/api/regenerator/stats"],
  });

  const { data: portfolio = [] } = useQuery<TokenHolding[]>({
    queryKey: ["/api/regenerator/portfolio"],
  });

  const { data: timeline = [], isLoading: timelineLoading } = useQuery<TimelineEvent[]>({
    queryKey: ["/api/regenerator/timeline"],
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case "token_purchase":
        return <ShoppingBag className="w-5 h-5 text-emerald-400" />;
      case "token_sale":
        return <Send className="w-5 h-5 text-blue-400" />;
      case "cashflow_received":
        return <TrendingUp className="w-5 h-5 text-purple-400" />;
      case "market_order_placed":
        return <ShoppingCart className="w-5 h-5 text-amber-400" />;
      case "market_order_filled":
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
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

  const formatCurrency = (value: number, currency: string = "NGN") => {
    // Map currency codes to appropriate locales
    const localeMap: Record<string, string> = {
      "NGN": "en-NG",
      "USD": "en-US",
      "USDC": "en-US",
      "XLM": "en-US",
    };

    const locale = localeMap[currency] || "en-US";
    
    // For crypto currencies, show as USD equivalent with symbol override
    if (currency === "USDC") {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(value).replace("$", "USDC ");
    } else if (currency === "XLM") {
      return `${value.toFixed(7)} XLM`; // XLM typically shows 7 decimal places
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <RegeneratorHeader />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-white" data-testid="text-dashboard-title">
              Portfolio Dashboard
            </h1>
            <p className="text-slate-400 mt-1">
              Track your farm token holdings and trading activity
            </p>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <Card className="bg-slate-900/50 border-slate-800" data-testid="card-stat-invested">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Total Invested
              </CardTitle>
              <Wallet className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-total-invested">
                {formatCurrency(stats?.totalInvested || 0)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Across all projects
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800" data-testid="card-stat-cashflow">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Cashflow Received
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-total-cashflow">
                {formatCurrency(stats?.totalCashflowReceived || 0)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Lifetime distributions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800" data-testid="card-stat-tokens">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Total Tokens
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-total-tokens">
                {(stats?.totalTokensOwned || 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Across all farms
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800" data-testid="card-stat-projects">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Active Projects
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-active-projects">
                {stats?.activeProjects || 0}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Participating in
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="portfolio" className="space-y-4">
            <TabsList className="bg-slate-900/50 border border-slate-800" data-testid="tabs-dashboard">
              <TabsTrigger value="portfolio" data-testid="tab-portfolio">
                Portfolio Holdings
              </TabsTrigger>
              <TabsTrigger value="timeline" data-testid="tab-timeline">
                Activity Timeline
              </TabsTrigger>
            </TabsList>

            {/* Portfolio Holdings Tab */}
            <TabsContent value="portfolio" className="space-y-4">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Your Token Holdings</CardTitle>
                  <CardDescription className="text-slate-400">
                    Farm tokens you currently own
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {portfolio.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400" data-testid="text-no-holdings">
                        No token holdings yet
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
                        Browse the marketplace to start participating in farm projects
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {portfolio.map((holding, index) => {
                        const totalValue = parseFloat(holding.tokenAmount) * parseFloat(holding.currentNav || "0");
                        const hasLockedTokens = parseFloat(holding.lockedTokens || "0") > 0;
                        
                        return (
                          <motion.div
                            key={`${holding.projectId}-${index}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover-elevate"
                            data-testid={`card-holding-${holding.tokenSymbol}`}
                          >
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="space-y-2 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-white" data-testid={`text-project-name-${holding.tokenSymbol}`}>
                                    {holding.projectName}
                                  </h3>
                                  <Badge variant="outline" className="text-xs" data-testid={`badge-token-${holding.tokenSymbol}`}>
                                    {holding.tokenSymbol}
                                  </Badge>
                                  {holding.projectStatus && (
                                    <Badge 
                                      variant={holding.projectStatus === "active" ? "default" : "secondary"}
                                      className="text-xs"
                                      data-testid={`badge-status-${holding.tokenSymbol}`}
                                    >
                                      {holding.projectStatus}
                                    </Badge>
                                  )}
                                </div>
                                
                                <p className="text-sm text-slate-400" data-testid={`text-location-${holding.tokenSymbol}`}>
                                  {holding.projectLocation}
                                </p>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                  <div>
                                    <p className="text-xs text-slate-500">Total Tokens</p>
                                    <p className="text-sm font-medium text-white" data-testid={`text-amount-${holding.tokenSymbol}`}>
                                      {parseFloat(holding.tokenAmount).toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500">Current NAV</p>
                                    <p className="text-sm font-medium text-white" data-testid={`text-nav-${holding.tokenSymbol}`}>
                                      {formatCurrency(parseFloat(holding.currentNav || "0"))}
                                    </p>
                                  </div>
                                  {hasLockedTokens && (
                                    <>
                                      <div>
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                          <Unlock className="w-3 h-3" />
                                          Liquid
                                        </p>
                                        <p className="text-sm font-medium text-emerald-400" data-testid={`text-liquid-${holding.tokenSymbol}`}>
                                          {parseFloat(holding.liquidTokens).toLocaleString()}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                          <Lock className="w-3 h-3" />
                                          Locked
                                        </p>
                                        <p className="text-sm font-medium text-amber-400" data-testid={`text-locked-${holding.tokenSymbol}`}>
                                          {parseFloat(holding.lockedTokens).toLocaleString()}
                                        </p>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <p className="text-xs text-slate-500">Total Value</p>
                                <p className="text-xl font-bold text-emerald-400" data-testid={`text-value-${holding.tokenSymbol}`}>
                                  {formatCurrency(totalValue)}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Timeline Tab */}
            <TabsContent value="timeline" className="space-y-4">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Activity Timeline</CardTitle>
                  <CardDescription className="text-slate-400">
                    Your recent transactions and market activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {timelineLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Clock className="w-8 h-8 text-slate-600 animate-spin" />
                    </div>
                  ) : timeline.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400" data-testid="text-no-activity">
                        No activity yet
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
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
                          {/* Icon */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center ${getEventColor(event.type)}`}>
                            {getEventIcon(event.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 pb-4 border-b border-slate-800 last:border-0">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="flex-1">
                                {renderEventDescription(event)}
                              </div>
                              <span className="text-xs text-slate-500 flex-shrink-0" data-testid={`text-timestamp-${index}`}>
                                {formatTimestamp(event.timestamp)}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
