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
  DollarSign, 
  ArrowLeft, 
  Coins, 
  Clock, 
  CheckCircle, 
  Info,
  Lock,
  Unlock,
  AlertCircle,
  BarChart3
} from "lucide-react";
import { Link } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// TypeScript Interfaces
interface LPHolding {
  id: string;
  projectId: string;
  projectName: string;
  tokenSymbol: string;
  tokenAmount: string;
  liquidTokens: string;
  lockedTokens: string;
  lockType: "none" | "grant" | "permanent" | "time_locked";
  lockReason: string | null;
  unlockDate: string | null;
  navPerToken: string;
  liquidValue: string;
  lockedValue: string;
  totalValue: string;
}

interface LPPortfolio {
  holdings: LPHolding[];
  summary: {
    totalLiquidValue: string;
    totalLockedValue: string;
    totalPortfolioValue: string;
    currency: string;
  };
}

interface NAVHistoryPoint {
  id: string;
  projectId: string;
  projectName: string;
  tokenSymbol: string;
  navPerToken: string;
  effectiveAt: string;
  liquidTokens: string;
  lockedTokens: string;
  liquidValue: string;
  lockedValue: string;
  totalValue: string;
}

interface CashflowEarning {
  id: string;
  projectId: string;
  projectName: string;
  amountNgnts: string;
  source: string | null;
  status: string;
  verifiedAt: string | null;
  createdAt: string;
  lpAllocation: number;
  lpPortionAmount: string;
  isRedeemable: boolean;
}

interface LPProfile {
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    kycStatus: string;
    isLpInvestor: boolean;
  };
  metrics: {
    totalInvested: string;
    totalCurrentValue: string;
    redeemableBalance: string;
    lockedGrantBalance: string;
    overallNavGrowth: string;
    projectsInvestedIn: number;
    totalInvestments: number;
  };
  currency: string;
}

export default function LPDashboard() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [redemptionDialogOpen, setRedemptionDialogOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<LPHolding | null>(null);
  const [tokensToRedeem, setTokensToRedeem] = useState("");
  const [navChartView, setNavChartView] = useState<"combined" | "liquid" | "locked">("combined");
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      setLocation("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Check if user is Primer
    if (!parsedUser.isLpInvestor) {
      toast({
        title: "Access Denied",
        description: "Primer status required to access this dashboard.",
        variant: "destructive",
      });
      setLocation("/portfolio");
    }
  }, [setLocation, toast]);

  // Fetch LP portfolio
  const { data: portfolio, isLoading: portfolioLoading } = useQuery<LPPortfolio>({
    queryKey: ["/api/lp/portfolio"],
    enabled: !!user && user.isLpInvestor,
  });

  // Fetch NAV history
  const { data: navHistoryData, isLoading: navHistoryLoading } = useQuery<{ navHistory: NAVHistoryPoint[] }>({
    queryKey: ["/api/lp/nav-history"],
    enabled: !!user && user.isLpInvestor,
  });

  // Fetch cashflow earnings
  const { data: cashflowData, isLoading: cashflowLoading } = useQuery<{ 
    cashflowEarnings: CashflowEarning[];
    totalEarnings: string;
    currency: string;
  }>({
    queryKey: ["/api/lp/cashflow-earnings"],
    enabled: !!user && user.isLpInvestor,
  });

  // Fetch LP profile
  const { data: profileData, isLoading: profileLoading } = useQuery<LPProfile>({
    queryKey: ["/api/lp/profile"],
    enabled: !!user && user.isLpInvestor,
  });

  // Redemption mutation
  const redemptionMutation = useMutation({
    mutationFn: async (data: { projectId: string; tokensAmount: string }) => {
      return await apiRequest("POST", "/api/investments/redemptions/create", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Redemption request submitted successfully. Awaiting admin approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lp/portfolio"] });
      setRedemptionDialogOpen(false);
      setSelectedHolding(null);
      setTokensToRedeem("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit redemption request",
        variant: "destructive",
      });
    },
  });

  const handleRedeemClick = (holding: LPHolding) => {
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

    const tokensNum = parseFloat(tokensToRedeem);
    const liquidAvailable = parseFloat(selectedHolding.liquidTokens);

    if (isNaN(tokensNum) || tokensNum <= 0 || tokensNum > liquidAvailable) {
      toast({
        title: "Invalid Amount",
        description: `Please enter a valid amount between 0 and ${liquidAvailable} liquid tokens.`,
        variant: "destructive",
      });
      return;
    }

    redemptionMutation.mutate({
      projectId: selectedHolding.projectId,
      tokensAmount: tokensToRedeem,
    });
  };

  const getLockBadge = (lockType: string, unlockDate: string | null) => {
    switch (lockType) {
      case "none":
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" data-testid="badge-liquid">
            <Unlock className="w-3 h-3" />
            Liquid
          </Badge>
        );
      case "permanent":
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100" data-testid="badge-permanent-lock">
            <Lock className="w-3 h-3" />
            Permanent Lock
          </Badge>
        );
      case "time_locked":
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100" data-testid="badge-time-locked">
            <Clock className="w-3 h-3" />
            {unlockDate ? `Locked until ${new Date(unlockDate).toLocaleDateString()}` : "Time Locked"}
          </Badge>
        );
      case "grant":
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100" data-testid="badge-grant">
            <Lock className="w-3 h-3" />
            Grant (Non-redeemable)
          </Badge>
        );
      default:
        return null;
    }
  };

  // Prepare chart data
  const chartData = navHistoryData?.navHistory
    .map((point) => ({
      date: new Date(point.effectiveAt).toLocaleDateString(),
      liquid: parseFloat(point.liquidValue),
      locked: parseFloat(point.lockedValue),
      total: parseFloat(point.totalValue),
      project: point.projectName,
    }))
    .reverse() || [];

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/portfolio" data-testid="link-back">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-page-title">Primer Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your liquid & locked token portfolio</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-4xl">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="portfolio" data-testid="tab-portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="cashflows" data-testid="tab-cashflows">Cashflows</TabsTrigger>
            <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Summary Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {profileLoading ? (
                <>
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </>
              ) : profileData ? (
                <>
                  <Card data-testid="card-total-value">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-total-value">
                        ₦{parseFloat(profileData.metrics.totalCurrentValue).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Growth: {profileData.metrics.overallNavGrowth}
                      </p>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-liquid-balance">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Redeemable Balance</CardTitle>
                      <Unlock className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600" data-testid="text-redeemable-balance">
                        ₦{parseFloat(profileData.metrics.redeemableBalance).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">Available for redemption</p>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-locked-balance">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Locked Grant Balance</CardTitle>
                      <Lock className="h-4 w-4 text-gray-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-gray-600" data-testid="text-locked-balance">
                        ₦{parseFloat(profileData.metrics.lockedGrantBalance).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">Non-redeemable</p>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-total-invested">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
                      <Coins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-total-invested">
                        ₦{parseFloat(profileData.metrics.totalInvested).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {profileData.metrics.projectsInvestedIn} projects
                      </p>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </div>

            {/* NAV Growth Chart */}
            <Card data-testid="card-nav-chart">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>NAV Growth Over Time</CardTitle>
                    <CardDescription>Track your portfolio value changes</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={navChartView === "combined" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNavChartView("combined")}
                      data-testid="button-chart-combined"
                    >
                      Combined
                    </Button>
                    <Button
                      variant={navChartView === "liquid" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNavChartView("liquid")}
                      data-testid="button-chart-liquid"
                    >
                      Liquid
                    </Button>
                    <Button
                      variant={navChartView === "locked" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNavChartView("locked")}
                      data-testid="button-chart-locked"
                    >
                      Locked
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {navHistoryLoading ? (
                  <Skeleton className="h-80" />
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      {(navChartView === "combined" || navChartView === "liquid") && (
                        <Line
                          type="monotone"
                          dataKey="liquid"
                          stroke="#16a34a"
                          strokeWidth={2}
                          name="Liquid Value (₦)"
                        />
                      )}
                      {(navChartView === "combined" || navChartView === "locked") && (
                        <Line
                          type="monotone"
                          dataKey="locked"
                          stroke="#6b7280"
                          strokeWidth={2}
                          name="Locked Value (₦)"
                        />
                      )}
                      {navChartView === "combined" && (
                        <Line
                          type="monotone"
                          dataKey="total"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="Total Value (₦)"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-80 text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No NAV history available yet</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="space-y-6">
            <Card data-testid="card-portfolio-table">
              <CardHeader>
                <CardTitle>Token Holdings</CardTitle>
                <CardDescription>Your project tokens split by liquid and locked status</CardDescription>
              </CardHeader>
              <CardContent>
                {portfolioLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </div>
                ) : portfolio && portfolio.holdings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Project</th>
                          <th className="text-right py-3 px-4 font-medium">Total Tokens</th>
                          <th className="text-right py-3 px-4 font-medium">Liquid Tokens</th>
                          <th className="text-right py-3 px-4 font-medium">Locked Tokens</th>
                          <th className="text-right py-3 px-4 font-medium">NAV/Token</th>
                          <th className="text-right py-3 px-4 font-medium">Total Value</th>
                          <th className="text-center py-3 px-4 font-medium">Status</th>
                          <th className="text-center py-3 px-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolio.holdings.map((holding) => (
                          <tr key={holding.id} className="border-b hover:bg-muted/50" data-testid={`row-holding-${holding.projectId}`}>
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium" data-testid={`text-project-${holding.projectId}`}>{holding.projectName}</div>
                                <div className="text-sm text-muted-foreground">{holding.tokenSymbol}</div>
                              </div>
                            </td>
                            <td className="text-right py-3 px-4" data-testid={`text-total-tokens-${holding.projectId}`}>
                              {parseFloat(holding.tokenAmount).toLocaleString()}
                            </td>
                            <td className="text-right py-3 px-4">
                              <span className="text-green-600 font-medium" data-testid={`text-liquid-tokens-${holding.projectId}`}>
                                {parseFloat(holding.liquidTokens).toLocaleString()}
                              </span>
                            </td>
                            <td className="text-right py-3 px-4">
                              <span className="text-gray-600" data-testid={`text-locked-tokens-${holding.projectId}`}>
                                {parseFloat(holding.lockedTokens).toLocaleString()}
                              </span>
                            </td>
                            <td className="text-right py-3 px-4" data-testid={`text-nav-${holding.projectId}`}>
                              ₦{parseFloat(holding.navPerToken).toLocaleString()}
                            </td>
                            <td className="text-right py-3 px-4 font-medium" data-testid={`text-total-value-${holding.projectId}`}>
                              ₦{parseFloat(holding.totalValue).toLocaleString()}
                            </td>
                            <td className="text-center py-3 px-4">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="inline-flex">
                                      {getLockBadge(holding.lockType, holding.unlockDate)}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{holding.lockReason || "No lock reason specified"}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                            <td className="text-center py-3 px-4">
                              <Button
                                size="sm"
                                onClick={() => handleRedeemClick(holding)}
                                disabled={parseFloat(holding.liquidTokens) === 0}
                                data-testid={`button-redeem-${holding.projectId}`}
                              >
                                Redeem
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/50">
                        <tr>
                          <td colSpan={5} className="py-3 px-4 font-medium text-right">Portfolio Totals:</td>
                          <td className="py-3 px-4 font-bold text-right" data-testid="text-portfolio-total">
                            ₦{parseFloat(portfolio.summary.totalPortfolioValue).toLocaleString()}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Coins className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No token holdings found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Warning about locked tokens */}
            {portfolio && parseFloat(portfolio.summary.totalLockedValue) > 0 && (
              <Card className="border-yellow-500" data-testid="card-locked-warning">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <CardTitle>Locked Tokens Notice</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    You have ₦{parseFloat(portfolio.summary.totalLockedValue).toLocaleString()} in locked tokens that cannot be redeemed. 
                    These tokens may be grants, vesting schedules, or time-locked investments. 
                    Check the "Status" column for details about each lock type.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Cashflows Tab */}
          <TabsContent value="cashflows" className="space-y-6">
            <Card data-testid="card-cashflow-summary">
              <CardHeader>
                <CardTitle>LP Cashflow Earnings Summary</CardTitle>
                <CardDescription>Your 20% share of project revenue allocations</CardDescription>
              </CardHeader>
              <CardContent>
                {cashflowLoading ? (
                  <Skeleton className="h-20" />
                ) : cashflowData ? (
                  <div className="text-center py-4">
                    <div className="text-4xl font-bold text-primary" data-testid="text-total-earnings">
                      ₦{parseFloat(cashflowData.totalEarnings).toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Total LP Earnings</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card data-testid="card-cashflow-table">
              <CardHeader>
                <CardTitle>Cashflow History</CardTitle>
                <CardDescription>Revenue allocations from invested projects</CardDescription>
              </CardHeader>
              <CardContent>
                {cashflowLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </div>
                ) : cashflowData && cashflowData.cashflowEarnings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Date</th>
                          <th className="text-left py-3 px-4 font-medium">Project</th>
                          <th className="text-right py-3 px-4 font-medium">Total Revenue</th>
                          <th className="text-right py-3 px-4 font-medium">LP Share (20%)</th>
                          <th className="text-center py-3 px-4 font-medium">Status</th>
                          <th className="text-left py-3 px-4 font-medium">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashflowData.cashflowEarnings.map((cashflow) => (
                          <tr key={cashflow.id} className="border-b hover:bg-muted/50" data-testid={`row-cashflow-${cashflow.id}`}>
                            <td className="py-3 px-4 text-sm" data-testid={`text-date-${cashflow.id}`}>
                              {new Date(cashflow.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4" data-testid={`text-project-cashflow-${cashflow.id}`}>
                              {cashflow.projectName}
                            </td>
                            <td className="text-right py-3 px-4" data-testid={`text-revenue-${cashflow.id}`}>
                              ₦{parseFloat(cashflow.amountNgnts).toLocaleString()}
                            </td>
                            <td className="text-right py-3 px-4 font-medium text-green-600" data-testid={`text-lp-share-${cashflow.id}`}>
                              ₦{parseFloat(cashflow.lpPortionAmount).toLocaleString()}
                            </td>
                            <td className="text-center py-3 px-4">
                              {cashflow.status === "verified" ? (
                                <Badge variant="default" className="flex items-center gap-1 justify-center" data-testid={`badge-status-${cashflow.id}`}>
                                  <CheckCircle className="w-3 h-3" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge variant="secondary" data-testid={`badge-status-${cashflow.id}`}>
                                  {cashflow.status}
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground" data-testid={`text-source-${cashflow.id}`}>
                              {cashflow.source || "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No cashflow earnings recorded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card data-testid="card-personal-info">
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Your LP investor profile details</CardDescription>
                </CardHeader>
                <CardContent>
                  {profileLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                    </div>
                  ) : profileData ? (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Full Name</Label>
                        <p className="font-medium" data-testid="text-full-name">
                          {profileData.profile.firstName} {profileData.profile.lastName}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Email</Label>
                        <p className="font-medium" data-testid="text-email">{profileData.profile.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">KYC Status</Label>
                        <div className="mt-1">
                          <Badge
                            variant={profileData.profile.kycStatus === "approved" ? "default" : "secondary"}
                            data-testid="badge-kyc-status"
                          >
                            {profileData.profile.kycStatus}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Investor Type</Label>
                        <div className="mt-1">
                          <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" data-testid="badge-investor-type">
                            Primer
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card data-testid="card-investment-metrics">
                <CardHeader>
                  <CardTitle>Investment Metrics</CardTitle>
                  <CardDescription>Your portfolio performance overview</CardDescription>
                </CardHeader>
                <CardContent>
                  {profileLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                    </div>
                  ) : profileData ? (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Overall NAV Growth</Label>
                        <p className="text-2xl font-bold text-green-600" data-testid="text-nav-growth">
                          {profileData.metrics.overallNavGrowth}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Projects</Label>
                          <p className="text-lg font-medium" data-testid="text-projects-count">
                            {profileData.metrics.projectsInvestedIn}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Investments</Label>
                          <p className="text-lg font-medium" data-testid="text-investments-count">
                            {profileData.metrics.totalInvestments}
                          </p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Redeemable vs Locked</Label>
                        <div className="flex gap-2 mt-2">
                          <div className="flex-1 bg-green-100 dark:bg-green-900/20 p-2 rounded-lg">
                            <p className="text-xs text-green-800 dark:text-green-100">Redeemable</p>
                            <p className="font-medium text-green-600" data-testid="text-redeemable-metric">
                              ₦{parseFloat(profileData.metrics.redeemableBalance).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex-1 bg-gray-100 dark:bg-gray-900/20 p-2 rounded-lg">
                            <p className="text-xs text-gray-800 dark:text-gray-100">Locked</p>
                            <p className="font-medium text-gray-600" data-testid="text-locked-metric">
                              ₦{parseFloat(profileData.metrics.lockedGrantBalance).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Redemption Dialog */}
      <Dialog open={redemptionDialogOpen} onOpenChange={setRedemptionDialogOpen}>
        <DialogContent data-testid="dialog-redemption">
          <DialogHeader>
            <DialogTitle>Redeem Liquid Tokens</DialogTitle>
            <DialogDescription>
              Convert your liquid project tokens to NGNTS. Only liquid tokens can be redeemed.
            </DialogDescription>
          </DialogHeader>
          
          {selectedHolding && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Project</span>
                  <span className="font-medium" data-testid="text-redemption-project">{selectedHolding.projectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Liquid Tokens Available</span>
                  <span className="font-medium text-green-600" data-testid="text-redemption-available">
                    {parseFloat(selectedHolding.liquidTokens).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">NAV per Token</span>
                  <span className="font-medium" data-testid="text-redemption-nav">₦{parseFloat(selectedHolding.navPerToken).toLocaleString()}</span>
                </div>
                {parseFloat(selectedHolding.lockedTokens) > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Info className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-600">
                      You have {parseFloat(selectedHolding.lockedTokens).toLocaleString()} locked tokens that cannot be redeemed
                    </span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="tokens-amount">Tokens to Redeem</Label>
                <Input
                  id="tokens-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={tokensToRedeem}
                  onChange={(e) => setTokensToRedeem(e.target.value)}
                  max={parseFloat(selectedHolding.liquidTokens)}
                  data-testid="input-redeem-amount"
                />
              </div>

              {tokensToRedeem && (
                <div className="bg-primary/5 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Estimated Value:</span>
                    <span className="text-2xl font-bold text-primary" data-testid="text-redemption-value">
                      ₦{(parseFloat(tokensToRedeem) * parseFloat(selectedHolding.navPerToken)).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Subject to admin approval and final NAV calculation
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRedemptionDialogOpen(false)}
              data-testid="button-cancel-redemption"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRedemptionSubmit}
              disabled={!tokensToRedeem || redemptionMutation.isPending}
              data-testid="button-confirm-redemption"
            >
              {redemptionMutation.isPending ? "Submitting..." : "Submit Redemption Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
