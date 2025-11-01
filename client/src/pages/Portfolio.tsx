import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Package, DollarSign, ArrowLeft, ExternalLink, Coins } from "lucide-react";
import { Link } from "wouter";

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
          <h1 className="text-3xl font-bold mb-2">My Portfolio</h1>
          <p className="text-muted-foreground">
            Track your agricultural investment performance
          </p>
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

        {/* Token Holdings & Investment History */}
        <Tabs defaultValue="holdings" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="holdings" data-testid="tab-holdings">Token Holdings</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">Investment History</TabsTrigger>
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
                          <div className="text-right flex-shrink-0">
                            <div className="font-semibold">
                              {formatCurrency(currentValue.toFixed(2))}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              @ {formatCurrency(holding.pricePerToken)}/token
                            </div>
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
        </Tabs>
      </div>
    </div>
  );
}
