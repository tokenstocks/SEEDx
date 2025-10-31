import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Wallet, 
  TrendingUp, 
  History, 
  Upload, 
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  XCircle,
  Clock,
  LogOut
} from "lucide-react";

export default function Dashboard() {
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLocation("/");
  };

  if (!user) {
    return null;
  }

  const wallets = [
    { currency: "NGN", balance: "0.00", symbol: "₦" },
    { currency: "USDC", balance: "0.00", symbol: "$" },
    { currency: "XLM", balance: "0.00", symbol: "XLM" },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">TS</span>
            </div>
            <h1 className="text-xl font-bold" data-testid="text-title">TokenStocks Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarFallback data-testid="avatar-user">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <p className="text-sm font-medium" data-testid="text-username">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted-foreground" data-testid="text-email">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {wallets.map((wallet) => (
            <Card key={wallet.currency}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{wallet.currency} Wallet</CardTitle>
                <Wallet className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`balance-${wallet.currency}`}>
                  {wallet.symbol}{wallet.balance}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Available balance</p>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" className="flex-1" data-testid={`button-deposit-${wallet.currency}`}>
                    <ArrowDownLeft className="w-4 h-4 mr-1" />
                    Deposit
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" disabled data-testid={`button-withdraw-${wallet.currency}`}>
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                    Withdraw
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>KYC Verification</CardTitle>
                <CardDescription>Complete your KYC to start investing</CardDescription>
              </div>
              <Badge variant="outline" className="gap-2" data-testid="badge-kyc-status">
                <Clock className="w-3 h-3" />
                Pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              To comply with regulations and secure your account, we need to verify your identity.
              Upload your ID card, selfie, and proof of address.
            </p>
            <Button data-testid="button-complete-kyc">
              <Upload className="w-4 h-4 mr-2" />
              Complete KYC Verification
            </Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="investments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="investments" data-testid="tab-investments">
              <TrendingUp className="w-4 h-4 mr-2" />
              My Investments
            </TabsTrigger>
            <TabsTrigger value="transactions" data-testid="tab-transactions">
              <History className="w-4 h-4 mr-2" />
              Transactions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="investments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Investments</CardTitle>
                <CardDescription>Track your agricultural investment portfolio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4" data-testid="text-no-investments">
                    You haven't made any investments yet
                  </p>
                  <Button onClick={() => setLocation("/browse")} data-testid="button-browse-investments">
                    Browse Investment Opportunities
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>View all your wallet transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground" data-testid="text-no-transactions">
                    No transactions yet
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
