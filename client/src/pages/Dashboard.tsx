import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  LogOut,
  Briefcase,
  Receipt,
  FileCheck
} from "lucide-react";
import { Link } from "wouter";

const withdrawalSchema = z.object({
  currency: z.enum(["NGN", "USDC", "XLM"]),
  amount: z.string().min(1, "Amount is required"),
  destinationType: z.enum(["bank_account", "crypto_wallet"]),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  cryptoAddress: z.string().optional(),
}).refine((data) => {
  if (data.destinationType === "bank_account") {
    return !!data.accountName && !!data.accountNumber && !!data.bankName;
  }
  if (data.destinationType === "crypto_wallet") {
    return !!data.cryptoAddress;
  }
  return false;
}, {
  message: "Please provide all required bank details or crypto address",
  path: ["destinationType"],
});

type WithdrawalForm = z.infer<typeof withdrawalSchema>;

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("NGN");
  const { toast } = useToast();

  const form = useForm<WithdrawalForm>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      currency: "NGN",
      amount: "",
      destinationType: "bank_account",
      accountName: "",
      accountNumber: "",
      bankName: "",
      cryptoAddress: "",
    },
  });

  const withdrawalMutation = useMutation({
    mutationFn: async (data: WithdrawalForm) => {
      const payload = {
        amount: data.amount,
        currency: data.currency,
        destinationType: data.destinationType,
        ...(data.destinationType === "bank_account" 
          ? { 
              bankDetails: {
                accountName: data.accountName,
                accountNumber: data.accountNumber,
                bankName: data.bankName,
              }
            }
          : { cryptoAddress: data.cryptoAddress }
        ),
      };
      
      const res = await apiRequest("POST", "/api/wallets/withdraw", payload);
      return await res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Withdrawal Requested",
        description: `Your withdrawal request for ${data.withdrawalRequest.amount} ${data.withdrawalRequest.currency} has been submitted successfully. It will be processed by an admin.`,
      });
      setWithdrawalDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to process withdrawal request",
        variant: "destructive",
      });
    },
  });

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

  const handleWithdrawClick = (currency: string) => {
    setSelectedCurrency(currency);
    form.setValue("currency", currency as any);
    setWithdrawalDialogOpen(true);
  };

  const onWithdrawalSubmit = (data: WithdrawalForm) => {
    withdrawalMutation.mutate(data);
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
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
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
          
          <nav className="flex gap-2 overflow-x-auto">
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="link-projects">
                <Briefcase className="w-4 h-4" />
                Projects
              </Button>
            </Link>
            <Link href="/portfolio">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="link-portfolio">
                <TrendingUp className="w-4 h-4" />
                Portfolio
              </Button>
            </Link>
            <Link href="/transactions">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="link-transactions">
                <Receipt className="w-4 h-4" />
                Transactions
              </Button>
            </Link>
            <Link href="/kyc">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="link-kyc">
                <FileCheck className="w-4 h-4" />
                KYC
              </Button>
            </Link>
          </nav>
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
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => handleWithdrawClick(wallet.currency)}
                    data-testid={`button-withdraw-${wallet.currency}`}
                  >
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
            <Link href="/kyc">
              <Button data-testid="button-complete-kyc">
                <Upload className="w-4 h-4 mr-2" />
                Complete KYC Verification
              </Button>
            </Link>
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
                  <Link href="/projects">
                    <Button data-testid="button-browse-investments">
                      Browse Investment Opportunities
                    </Button>
                  </Link>
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

      <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Withdraw {selectedCurrency}</DialogTitle>
            <DialogDescription>
              Request a withdrawal from your {selectedCurrency} wallet
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onWithdrawalSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="Enter amount" 
                        {...field}
                        data-testid="input-withdrawal-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destinationType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Withdrawal Destination</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="bank_account" data-testid="radio-bank-account" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Bank Account (NGN only)
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="crypto_wallet" data-testid="radio-crypto-wallet" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Crypto Wallet (USDC/XLM)
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("destinationType") === "bank_account" && (
                <>
                  <FormField
                    control={form.control}
                    name="accountName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter account name" {...field} data-testid="input-account-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter account number" {...field} data-testid="input-account-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter bank name" {...field} data-testid="input-bank-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {form.watch("destinationType") === "crypto_wallet" && (
                <FormField
                  control={form.control}
                  name="cryptoAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Crypto Wallet Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter Stellar address" 
                          {...field} 
                          data-testid="input-crypto-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Withdrawal requests are manually processed by our team. 
                  You will receive a notification once your request is approved.
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setWithdrawalDialogOpen(false)}
                  data-testid="button-cancel-withdrawal"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={withdrawalMutation.isPending}
                  data-testid="button-submit-withdrawal"
                >
                  {withdrawalMutation.isPending ? "Processing..." : "Request Withdrawal"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
