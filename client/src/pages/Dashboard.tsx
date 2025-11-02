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
  FileCheck,
  Copy,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";
import { WalletActivationStatus } from "@/components/WalletActivationStatus";
import { useQuery } from "@tanstack/react-query";

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

const depositInitiateSchema = z.object({
  currency: z.enum(["NGN", "USDC", "XLM"]),
});

const depositConfirmSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
});

type DepositInitiateForm = z.infer<typeof depositInitiateSchema>;
type DepositConfirmForm = z.infer<typeof depositConfirmSchema>;

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("NGN");
  
  // Deposit dialog states
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositStep, setDepositStep] = useState<"select" | "instructions" | "confirm">("select");
  const [depositInstructions, setDepositInstructions] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
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

  const depositInitiateForm = useForm<DepositInitiateForm>({
    resolver: zodResolver(depositInitiateSchema),
    defaultValues: {
      currency: "NGN",
    },
  });

  const depositConfirmForm = useForm<DepositConfirmForm>({
    resolver: zodResolver(depositConfirmSchema),
    defaultValues: {
      amount: "",
    },
  });

  const initiateDepositMutation = useMutation({
    mutationFn: async (data: DepositInitiateForm) => {
      const res = await apiRequest("POST", "/api/wallets/deposit/initiate", data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      setDepositInstructions(data);
      setDepositStep("instructions");
      toast({
        title: "Payment Instructions Ready",
        description: "Please follow the instructions to complete your deposit.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Get Instructions",
        description: error.message || "Failed to initiate deposit",
        variant: "destructive",
      });
    },
  });

  const confirmDepositMutation = useMutation({
    mutationFn: async (data: DepositConfirmForm) => {
      if (!depositInstructions) {
        throw new Error("No deposit instructions available");
      }
      
      const formData = new FormData();
      formData.append("transactionReference", depositInstructions.reference);
      formData.append("amount", data.amount);
      formData.append("currency", selectedCurrency);
      
      if (selectedFile) {
        formData.append("paymentProof", selectedFile);
      }

      // Use fetch directly for FormData (apiRequest would JSON-stringify it)
      const token = localStorage.getItem("token");
      const res = await fetch("/api/wallets/deposit/confirm", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Deposit confirmation failed");
      }

      return await res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Deposit Submitted",
        description: `Your deposit of ${data.depositRequest.amount} ${data.depositRequest.currency} has been submitted and is pending admin approval.`,
      });
      setDepositDialogOpen(false);
      setDepositStep("select");
      setDepositInstructions(null);
      setSelectedFile(null);
      depositInitiateForm.reset();
      depositConfirmForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Deposit Confirmation Failed",
        description: error.message || "Failed to confirm deposit",
        variant: "destructive",
      });
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

  const handleDepositClick = (currency: string) => {
    setSelectedCurrency(currency);
    depositInitiateForm.setValue("currency", currency as any);
    setDepositDialogOpen(true);
    setDepositStep("select");
    setDepositInstructions(null);
    setSelectedFile(null);
  };

  const onWithdrawalSubmit = (data: WithdrawalForm) => {
    withdrawalMutation.mutate(data);
  };

  const onDepositInitiate = (data: DepositInitiateForm) => {
    initiateDepositMutation.mutate(data);
  };

  const onDepositConfirm = (data: DepositConfirmForm) => {
    confirmDepositMutation.mutate(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Fetch actual wallet data (before early return to avoid hook ordering issues)
  const { data: walletData } = useQuery({
    queryKey: ["/api/wallets"],
    enabled: !!user,
  });

  if (!user) {
    return null;
  }

  const wallet = walletData?.wallet;
  const cryptoBalances = wallet ? JSON.parse(wallet.cryptoBalances || "{}") : {};
  
  const wallets = [
    { currency: "NGN", balance: wallet?.fiatBalance || "0.00", symbol: "₦" },
    { currency: "USDC", balance: cryptoBalances.USDC || "0.00", symbol: "$" },
    { currency: "XLM", balance: cryptoBalances.XLM || "0.00", symbol: "XLM" },
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
        {/* Wallet Status Card */}
        {wallet?.cryptoWalletPublicKey && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Stellar Wallet Status
              </CardTitle>
              <CardDescription>
                Your blockchain wallet information and activation status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Activation Status */}
              <div>
                <p className="text-sm font-medium mb-2">Status</p>
                <WalletActivationStatus stellarPublicKey={wallet.cryptoWalletPublicKey} />
              </div>

              {/* Public Key */}
              <div>
                <p className="text-sm font-medium mb-2">Stellar Public Key</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded-md text-xs break-all font-mono" data-testid="text-stellar-key">
                    {wallet.cryptoWalletPublicKey}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(wallet.cryptoWalletPublicKey);
                      toast({
                        title: "Copied!",
                        description: "Public key copied to clipboard",
                      });
                    }}
                    data-testid="button-copy-key"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Explorer Link */}
              <div>
                <p className="text-sm font-medium mb-2">Verify on Blockchain</p>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    const horizonUrl = import.meta.env.VITE_STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org";
                    const isTestnet = horizonUrl.includes("testnet");
                    const explorerUrl = isTestnet
                      ? `https://stellar.expert/explorer/testnet/account/${wallet.cryptoWalletPublicKey}`
                      : `https://stellar.expert/explorer/public/account/${wallet.cryptoWalletPublicKey}`;
                    window.open(explorerUrl, "_blank");
                  }}
                  data-testid="button-view-explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Stellar Explorer
                </Button>
              </div>

              {/* Balances Summary */}
              <div>
                <p className="text-sm font-medium mb-2">Blockchain Balances</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground">XLM</p>
                    <p className="text-lg font-semibold" data-testid="wallet-status-xlm">
                      {cryptoBalances.XLM || "0.00"}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground">USDC</p>
                    <p className="text-lg font-semibold" data-testid="wallet-status-usdc">
                      {cryptoBalances.USDC || "0.00"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                
                {/* Show wallet activation status */}
                {walletData?.wallet?.stellarPublicKey && (
                  <div className="mt-2">
                    <WalletActivationStatus stellarPublicKey={walletData.wallet.stellarPublicKey} />
                  </div>
                )}
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    size="sm" 
                    className="flex-1" 
                    onClick={() => handleDepositClick(wallet.currency)}
                    data-testid={`button-deposit-${wallet.currency}`}
                  >
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

      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deposit {selectedCurrency}</DialogTitle>
            <DialogDescription>
              {depositStep === "select" && "Get payment instructions for your deposit"}
              {depositStep === "instructions" && "Follow the instructions to make your payment"}
              {depositStep === "confirm" && "Confirm your deposit with payment proof"}
            </DialogDescription>
          </DialogHeader>

          {depositStep === "select" && (
            <Form {...depositInitiateForm}>
              <form onSubmit={depositInitiateForm.handleSubmit(onDepositInitiate)} className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Selected Currency:</strong> {selectedCurrency}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Click below to get payment instructions for your {selectedCurrency} deposit.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setDepositDialogOpen(false)}
                    data-testid="button-cancel-deposit"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={initiateDepositMutation.isPending}
                    data-testid="button-get-instructions"
                  >
                    {initiateDepositMutation.isPending ? "Loading..." : "Get Payment Instructions"}
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {depositStep === "instructions" && depositInstructions && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Payment Method:</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-payment-method">
                    {depositInstructions.paymentMethod === "bank_transfer" ? "Bank Transfer" : "Stellar Network"}
                  </p>
                </div>

                {depositInstructions.paymentMethod === "bank_transfer" && (
                  <>
                    <div>
                      <p className="text-sm font-medium mb-1">Bank Account Details:</p>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap" data-testid="text-bank-details">
                        {depositInstructions.instructions.bankAccount}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Reference Code:</p>
                      <p className="font-mono text-sm" data-testid="text-reference">
                        {depositInstructions.instructions.reference}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {depositInstructions.instructions.note}
                      </p>
                    </div>
                  </>
                )}

                {depositInstructions.paymentMethod === "stellar" && (
                  <>
                    <div>
                      <p className="text-sm font-medium mb-1">Stellar Address:</p>
                      <p className="font-mono text-xs break-all" data-testid="text-stellar-address">
                        {depositInstructions.instructions.stellarAddress}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Memo (Required):</p>
                      <p className="font-mono text-sm" data-testid="text-memo">
                        {depositInstructions.instructions.memo}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Asset:</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-asset">
                        {depositInstructions.instructions.asset}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {depositInstructions.instructions.note}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Important:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Make sure to include the reference/memo in your payment</li>
                  <li>After making the payment, proceed to confirm your deposit</li>
                  <li>Upload proof of payment for verification</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setDepositStep("select");
                    setDepositInstructions(null);
                  }}
                  data-testid="button-back-to-select"
                >
                  Back
                </Button>
                <Button 
                  type="button" 
                  className="flex-1"
                  onClick={() => setDepositStep("confirm")}
                  data-testid="button-proceed-confirm"
                >
                  I've Made the Payment
                </Button>
              </div>
            </div>
          )}

          {depositStep === "confirm" && (
            <Form {...depositConfirmForm}>
              <form onSubmit={depositConfirmForm.handleSubmit(onDepositConfirm)} className="space-y-4">
                <FormField
                  control={depositConfirmForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Deposited</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="Enter the amount you deposited" 
                          {...field}
                          data-testid="input-deposit-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Payment Proof (Optional)</FormLabel>
                  <Input 
                    type="file" 
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="mt-2"
                    data-testid="input-payment-proof"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a screenshot or receipt of your payment
                  </p>
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground mt-1" data-testid="text-selected-file">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Your deposit will be reviewed and approved by an admin. 
                    This process typically takes 1-24 hours.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setDepositStep("instructions")}
                    data-testid="button-back-to-instructions"
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={confirmDepositMutation.isPending}
                    data-testid="button-submit-deposit"
                  >
                    {confirmDepositMutation.isPending ? "Submitting..." : "Confirm Deposit"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
