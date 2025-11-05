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
import { TrendingUp, Package, DollarSign, ArrowLeft, ExternalLink, Coins, RefreshCw, Clock, CheckCircle, XCircle } from "lucide-react";
import { Link } from "wouter";
import type { RedemptionRequest } from "@/types/phase4";

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

  const { data: portfolio, isLoading: portfolioLoading } = useQuery<Portfolio>({
    queryKey: ["/api/investments/portfolio"],
    enabled: !!user,
  });

  const { data: investments, isLoading: investmentsLoading } = useQuery<Investment[]>({
    queryKey: ["/api/investments"],
    enabled: !!user,
  });

  const { data: stats } = useQuery<{
    totalInvested: string;
    totalTokensReceived: string;
    projectsInvestedIn: number;
    investmentsCount: number;
  }>({
    queryKey: ["/api/investments/stats"],
    enabled: !!user,
  });

  const { data: redemptions, isLoading: redemptionsLoading } = useQuery<{ redemptions: RedemptionRequest[] }>({
    queryKey: ["/api/investments/redemptions/list"],
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

  const formatCurrency = (amount: string, currency: string = "NGN") => {
    const symbol = currency === "NGN" ? "₦" : currency === "USDC" ? "$" : "";
    return `${symbol}${parseFloat(amount).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getTotalInvested = () => {
    return parseFloat(stats?.totalInvested || "0");
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-7xl mx-auto p-4 py-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            data-testid="link-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Portfolio</h1>
              <p className="text-muted-foreground">
                Track your agricultural investment performance
              </p>
            </div>
            {user?.isLpInvestor && (
              <Link href="/lp-dashboard" data-testid="link-lp-dashboard">
                <Button variant="default" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  LP Dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(getTotalInvested().toFixed(2))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.investmentsCount || 0} investments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(getTotalValue().toFixed(2))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Current market value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gain/Loss</CardTitle>
              <Package className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${calculateGainLoss() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {calculateGainLoss() >= 0 ? '+' : ''}{formatCurrency(calculateGainLoss().toFixed(2))}
              </div>
              <p className={`text-xs mt-1 ${calculateGainLoss() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {calculateGainLoss() >= 0 ? '+' : ''}{calculateGainLossPercentage().toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projects</CardTitle>
              <Coins className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.projectsInvestedIn || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Unique projects
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Token Holdings, Investment History & Redemptions */}
        <Tabs defaultValue="holdings" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="holdings" data-testid="tab-holdings">Token Holdings</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">Investment History</TabsTrigger>
            <TabsTrigger value="redemptions" data-testid="tab-redemptions">Redemptions</TabsTrigger>
          </TabsList>

          {/* Token Holdings Tab */}
          <TabsContent value="holdings">
            <Card>
              <CardHeader>
                <CardTitle>Token Holdings</CardTitle>
                <CardDescription>
                  Consolidated view of your token holdings by project
                </CardDescription>
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
                  <div className="space-y-4">
                    {portfolio.holdings.map((holding) => {
                      const currentValue = parseFloat(holding.tokenAmount) * parseFloat(holding.pricePerToken);
                      return (
                        <div
                          key={holding.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                          data-testid={`holding-${holding.projectId}`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                              <Coins className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold">{holding.projectName}</h4>
                              <p className="text-sm text-muted-foreground">
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
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
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
                              <div className="font-semibold">
                                {formatCurrency(currentValue.toFixed(2))}
                              </div>
                              <div className="text-sm text-muted-foreground">
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
                    <Coins className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No token holdings yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start investing in agricultural projects to receive tokens
                    </p>
                    <Link href="/projects" data-testid="link-browse-projects-holdings">
                      <Button>Browse Projects</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Investment History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Investment History</CardTitle>
                <CardDescription>
                  Complete history of all your investments
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                        className="flex items-center justify-between p-4 border rounded-lg"
                        data-testid={`investment-${investment.id}`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium">{investment.projectName}</h4>
                            <p className="text-xs text-muted-foreground">
                              {new Date(investment.createdAt).toLocaleDateString()} at {new Date(investment.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-semibold">
                            {formatCurrency(investment.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            +{parseFloat(investment.tokensReceived).toLocaleString(undefined, { maximumFractionDigits: 2 })} {investment.projectTokenSymbol}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No investments yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start investing in agricultural projects to build your portfolio
                    </p>
                    <Link href="/projects" data-testid="link-browse-projects-history">
                      <Button>Browse Projects</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Redemptions Tab */}
          <TabsContent value="redemptions">
            <Card>
              <CardHeader>
                <CardTitle>Redemption History</CardTitle>
                <CardDescription>
                  Track your token redemption requests and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                        className="flex items-center justify-between p-4 border rounded-lg"
                        data-testid={`redemption-${redemption.id}`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                            <RefreshCw className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium">{redemption.projectName || `Project ${redemption.projectId.slice(0, 8)}...`}</h4>
                            <p className="text-xs text-muted-foreground">
                              {parseFloat(redemption.tokensAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens → {formatCurrency(redemption.redemptionValueNgnts)} NGNTS
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Requested: {new Date(redemption.createdAt).toLocaleDateString()}
                            </p>
                            {redemption.adminNotes && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Note: {redemption.adminNotes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {getRedemptionStatusBadge(redemption.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <RefreshCw className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No redemption requests yet</h3>
                    <p className="text-muted-foreground mb-4">
                      You can redeem your project tokens for NGNTS anytime from the Token Holdings tab
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Redemption Dialog */}
        <Dialog open={redemptionDialogOpen} onOpenChange={setRedemptionDialogOpen}>
          <DialogContent data-testid="dialog-redemption">
            <DialogHeader>
              <DialogTitle>Redeem Tokens</DialogTitle>
              <DialogDescription>
                Submit a request to sell your tokens back to the platform for NGNTS
              </DialogDescription>
            </DialogHeader>
            {selectedHolding && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Project</Label>
                  <p className="font-semibold">{selectedHolding.projectName}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Available to Redeem</Label>
                  <p className="font-semibold">
                    {parseFloat(selectedHolding.tokenAmount).toLocaleString(undefined, { maximumFractionDigits: 7 })} {selectedHolding.tokenSymbol}
                  </p>
                </div>
                <div>
                  <Label htmlFor="tokensToRedeem">Tokens to Redeem</Label>
                  <Input
                    id="tokensToRedeem"
                    type="number"
                    step="0.0001"
                    placeholder="Enter amount"
                    value={tokensToRedeem}
                    onChange={(e) => setTokensToRedeem(e.target.value)}
                    data-testid="input-tokens-to-redeem"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTokensToRedeem(selectedHolding.tokenAmount)}
                    className="mt-1 text-xs"
                    data-testid="button-redeem-max"
                  >
                    Redeem All
                  </Button>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Estimated Value</div>
                  <div className="text-lg font-semibold">
                    {tokensToRedeem && !isNaN(parseFloat(tokensToRedeem))
                      ? formatCurrency((parseFloat(tokensToRedeem) * parseFloat(selectedHolding.pricePerToken)).toFixed(2))
                      : formatCurrency("0.00")} NGNTS
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Based on current NAV of {formatCurrency(selectedHolding.pricePerToken)}/token
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Your redemption request will be reviewed by an admin</p>
                  <p>• NAV is locked at request time to prevent manipulation</p>
                  <p>• Funds are transferred from project cashflow, treasury, or LP pool based on availability</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRedemptionDialogOpen(false);
                  setSelectedHolding(null);
                  setTokensToRedeem("");
                }}
                data-testid="button-cancel-redemption"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRedemptionSubmit}
                disabled={createRedemptionMutation.isPending}
                data-testid="button-submit-redemption"
              >
                {createRedemptionMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
