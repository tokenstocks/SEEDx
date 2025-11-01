import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Package, DollarSign, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface Investment {
  id: string;
  projectId: string;
  amount: string;
  tokensReceived: string;
  currency: string;
  createdAt: string;
  project: {
    name: string;
    tokenSymbol: string;
    pricePerToken: string;
    status: string;
  };
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

  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ["/api/investments"],
    enabled: !!user,
  });

  const formatCurrency = (amount: string, currency: string = "NGN") => {
    const symbol = currency === "NGN" ? "₦" : currency === "USDC" ? "$" : "";
    return `${symbol}${parseFloat(amount).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculateCurrentValue = (tokens: string, pricePerToken: string) => {
    return parseFloat(tokens) * parseFloat(pricePerToken);
  };

  const calculateTotalValue = () => {
    if (!investments) return 0;
    return investments.reduce((total, inv) => {
      return total + calculateCurrentValue(inv.tokensReceived, inv.project.pricePerToken);
    }, 0);
  };

  const calculateTotalInvested = () => {
    if (!investments) return 0;
    return investments.reduce((total, inv) => total + parseFloat(inv.amount), 0);
  };

  const calculateGainLoss = () => {
    const current = calculateTotalValue();
    const invested = calculateTotalInvested();
    return current - invested;
  };

  const calculateGainLossPercentage = () => {
    const invested = calculateTotalInvested();
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
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(calculateTotalInvested().toFixed(2))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {investments?.length || 0} {investments?.length === 1 ? 'project' : 'projects'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Value</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(calculateTotalValue().toFixed(2))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Based on current token prices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
        </div>

        {/* Investments List */}
        <Card>
          <CardHeader>
            <CardTitle>Investments</CardTitle>
            <CardDescription>
              Your tokenized agricultural asset holdings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
              <div className="space-y-4">
                {investments.map((investment) => {
                  const currentValue = calculateCurrentValue(
                    investment.tokensReceived,
                    investment.project.pricePerToken
                  );
                  const gainLoss = currentValue - parseFloat(investment.amount);
                  const gainLossPercent = (gainLoss / parseFloat(investment.amount)) * 100;

                  return (
                    <div
                      key={investment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                      data-testid={`investment-${investment.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                          <Package className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{investment.project.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {parseFloat(investment.tokensReceived).toLocaleString()} {investment.project.tokenSymbol}
                          </p>
                          <Badge variant="outline" className="mt-1 capitalize">
                            {investment.project.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatCurrency(currentValue.toFixed(2))}
                        </div>
                        <div className={`text-sm ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss.toFixed(2))}
                          <span className="ml-1">({gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%)</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Invested: {formatCurrency(investment.amount)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No investments yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start investing in agricultural projects to build your portfolio
                </p>
                <Link href="/projects">
                  <Button data-testid="button-browse-projects">Browse Projects</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
