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
  ExternalLink,
  Zap,
  Info,
  PlusCircle,
  Sparkles
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";
import { WalletActivationStatus } from "@/components/WalletActivationStatus";
import { useQuery } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";

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

const depositAmountSchema = z.object({
  desiredAmount: z.string().min(1, "Amount is required").refine((val) => parseFloat(val) >= 100, {
    message: "Minimum deposit is 100 NGNTS",
  }),
});

const depositConfirmSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
});

type DepositAmountForm = z.infer<typeof depositAmountSchema>;
type DepositConfirmForm = z.infer<typeof depositConfirmSchema>;

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("NGN");
  
  // Deposit dialog states
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositStep, setDepositStep] = useState<"amount" | "instructions" | "confirm">("amount");
  const [depositInstructions, setDepositInstructions] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [desiredNgntsAmount, setDesiredNgntsAmount] = useState<number>(0);
  const [totalNgnToDeposit, setTotalNgnToDeposit] = useState<number>(0);
  const [calculatedFees, setCalculatedFees] = useState<number>(0);
  
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      setLocation("/login");
      return;
    }
  }, [setLocation]);

  // Fetch user data from API with auto-refetch
  const { data: user } = useQuery<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    kycStatus: string;
    role: string;
    totalInvestedNGN: string;
    isLpInvestor?: boolean;
  }>({
    queryKey: ["/api/users/me"],
    refetchInterval: 10000, // Refetch every 10 seconds to catch KYC updates
  });

  // Sync user data to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
  }, [user]);

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

  const depositAmountForm = useForm<DepositAmountForm>({
    resolver: zodResolver(depositAmountSchema),
    defaultValues: {
      desiredAmount: "",
    },
  });

  const depositConfirmForm = useForm<DepositConfirmForm>({
    resolver: zodResolver(depositConfirmSchema),
    defaultValues: {
      amount: "",
    },
  });

  const initiateDepositMutation = useMutation({
    mutationFn: async (data: { currency: string; desiredAmount?: number }) => {
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
      setDepositStep("amount");
      setDepositInstructions(null);
      setSelectedFile(null);
      depositAmountForm.reset();
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLocation("/");
  };

  const handleWithdrawClick = (currency: string) => {
    // Block XLM withdrawals - XLM is for gas fees only
    if (currency === "XLM") {
      toast({
        title: "XLM Not Withdrawable",
        description: "XLM is used for gas fees only and is managed automatically by the platform.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedCurrency(currency);
    form.setValue("currency", currency as any);
    setWithdrawalDialogOpen(true);
  };

  const handleDepositClick = (currency: string) => {
    // Block XLM deposits - XLM is for gas fees only
    if (currency === "XLM") {
      toast({
        title: "XLM Not Depositable",
        description: "XLM is used for gas fees only and is managed automatically by the platform.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedCurrency(currency);
    setDepositDialogOpen(true);
    setDepositStep("amount");
    setDepositInstructions(null);
    setSelectedFile(null);
  };

  const onWithdrawalSubmit = (data: WithdrawalForm) => {
    withdrawalMutation.mutate(data);
  };

  const onDepositAmountSubmit = (data: DepositAmountForm) => {
    const desired = parseFloat(data.desiredAmount);
    setDesiredNgntsAmount(desired);
    
    // Calculate fees (10 NGN platform fee + 2 XLM gas ~= 20 NGN)
    const fees = 30; // Simplified: 10 NGN platform + ~20 NGN gas
    const total = desired + fees;
    
    setCalculatedFees(fees);
    setTotalNgnToDeposit(total);
    
    // Get payment instructions with desired amount
    initiateDepositMutation.mutate({ 
      currency: selectedCurrency,
      desiredAmount: desired 
    });
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

  // Fetch blockchain balances - SOURCE OF TRUTH (queries Stellar network)
  // This also syncs balances to database for integrity
  const { data: blockchainData, isLoading: isBlockchainLoading } = useQuery({
    queryKey: ["/api/wallets/blockchain-balances"],
    enabled: !!user,
    refetchInterval: 10000, // Refresh every 10 seconds to show live blockchain data
    refetchOnWindowFocus: true, // Refetch when window regains focus
    staleTime: 0, // Always consider data stale, force refetch
  });

  // Fetch wallet metadata (public key, network info)
  const { data: walletData } = useQuery({
    queryKey: ["/api/wallets"],
    enabled: !!user,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  if (!user) {
    return null;
  }

  const wallet = walletData as any;
  
  // BLOCKCHAIN IS SOURCE OF TRUTH - Get all balances from Stellar network
  const blockchainBalances = blockchainData ? (blockchainData as any).balances : null;
  const ngntsBalance = blockchainBalances?.NGNTS || "0";
  const usdcBalance = blockchainBalances?.USDC || "0";
  const xlmBalance = blockchainBalances?.XLM || "0.00";
  const explorerUrl = blockchainData ? (blockchainData as any).explorerUrl : "";
  const blockchainMessage = blockchainData ? (blockchainData as any).message : null;
  
  // Check if wallet has been funded
  const ngntsBalanceNum = parseFloat(ngntsBalance);
  const usdcBalanceNum = parseFloat(usdcBalance);
  const isWalletFunded = ngntsBalanceNum > 0 || usdcBalanceNum > 0;
  
  // USDC wallet
  const usdcWallet = {
    currency: "USDC",
    balance: usdcBalance,
    symbol: "$",
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader />
      
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold" data-testid="text-title">Dashboard</h1>
            <div className="flex items-center gap-4">
              {/* XLM Gas Fees - Subtle display */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md cursor-help" data-testid="xlm-gas-info">
                    <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">{xlmBalance} XLM</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Gas Fees Balance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    XLM is automatically managed for Stellar blockchain transactions
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Actions - Keep these for convenience */}
      <div className="bg-background/50 border-b">
        <div className="max-w-7xl mx-auto px-4 py-2">
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
            {user?.isLpInvestor && (
              <Link href="/lp-dashboard">
                <Button variant="ghost" size="sm" className="gap-2 bg-primary/10" data-testid="link-lp-dashboard">
                  <Sparkles className="w-4 h-4" />
                  LP Dashboard
                </Button>
              </Link>
            )}
            <Link href="/marketplace">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="link-marketplace">
                <TrendingUp className="w-4 h-4" />
                Marketplace
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
      </div>

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
            </CardContent>
          </Card>
        )}

        {/* Show welcome state if wallet is not funded, otherwise show balance cards */}
        {!isWalletFunded ? (
          /* Pre-funding Welcome State */
          <Card className="mb-8">
            <CardContent className="pt-16 pb-16">
              <div className="max-w-2xl mx-auto text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                
                <h2 className="text-4xl font-bold mb-4" data-testid="welcome-title">
                  Welcome to SEEDx
                </h2>
                
                <p className="text-muted-foreground text-lg mb-10 max-w-lg mx-auto">
                  Plant capital. Grow impact. Invest in regenerative agriculture with as little as 100 NGNTS (₦100).
                </p>

                <Button 
                  size="lg" 
                  className="gap-2 h-12 px-8"
                  onClick={() => {
                    setDepositDialogOpen(true);
                    setDepositStep("amount");
                  }}
                  data-testid="button-fund-wallet"
                >
                  <PlusCircle className="w-5 h-5" />
                  Fund Wallet with NGNTS
                </Button>

                <div className="mt-16 grid md:grid-cols-3 gap-6 text-left">
                  <div className="p-6 bg-muted/30 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-primary mb-3" />
                    <h3 className="font-semibold mb-2">Blockchain Verified</h3>
                    <p className="text-sm text-muted-foreground">
                      Every NGNTS token is verifiable on Stellar blockchain
                    </p>
                  </div>
                  <div className="p-6 bg-muted/30 rounded-xl">
                    <DollarSign className="w-6 h-6 text-primary mb-3" />
                    <h3 className="font-semibold mb-2">Low Entry Point</h3>
                    <p className="text-sm text-muted-foreground">
                      Start investing in agriculture with just 100 NGNTS
                    </p>
                  </div>
                  <div className="p-6 bg-muted/30 rounded-xl">
                    <Wallet className="w-6 h-6 text-primary mb-3" />
                    <h3 className="font-semibold mb-2">1:1 Pegged</h3>
                    <p className="text-sm text-muted-foreground">
                      1 NGNTS = ₦1.00 - Stable and transparent value
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Funded State - Primary NGNTS Balance */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* NGNTS Balance - Primary Card (Takes 2 columns) */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold mb-1">NGNTS Balance</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        Naira Token Stellar (1 NGNTS = ₦1.00)
                        {explorerUrl && (
                          <a 
                            href={explorerUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            data-testid="link-ngnts-explorer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Verify on Stellar
                          </a>
                        )}
                      </CardDescription>
                    </div>
                    <Wallet className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-bold mb-6" data-testid="balance-NGNTS">
                    {isBlockchainLoading ? (
                      <span className="text-muted-foreground">...</span>
                    ) : (
                      <>
                        {parseFloat(ngntsBalance).toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        <span className="text-2xl text-muted-foreground ml-2">NGNTS</span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      size="lg" 
                      className="flex-1 gap-2" 
                      onClick={() => handleDepositClick("NGN")}
                      data-testid="button-deposit-NGNTS"
                    >
                      <ArrowDownLeft className="w-5 h-5" />
                      Add Funds
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="flex-1 gap-2" 
                      onClick={() => handleWithdrawClick("NGN")}
                      data-testid="button-withdraw-NGNTS"
                    >
                      <ArrowUpRight className="w-5 h-5" />
                      Withdraw
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* USDC Balance - Secondary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">USDC</CardTitle>
                  <CardDescription>USD Coin</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-6" data-testid="balance-USDC">
                    ${usdcWallet.balance}
                  </div>
                  
                  <div className="space-y-2">
                    <Button 
                      size="sm" 
                      className="w-full gap-2" 
                      onClick={() => handleDepositClick("USDC")}
                      data-testid="button-deposit-USDC"
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      Deposit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full gap-2" 
                      onClick={() => handleWithdrawClick("USDC")}
                      data-testid="button-withdraw-USDC"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Withdraw
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

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
            <DialogTitle>
              {depositStep === "amount" ? "Fund Wallet with NGNTS" : `Deposit NGNTS`}
            </DialogTitle>
            <DialogDescription>
              {depositStep === "amount" && "Enter the amount of NGNTS you want to receive"}
              {depositStep === "instructions" && "Follow the instructions to make your payment"}
              {depositStep === "confirm" && "Confirm your deposit with payment proof"}
            </DialogDescription>
          </DialogHeader>

          {depositStep === "amount" && (
            <Form {...depositAmountForm}>
              <form onSubmit={depositAmountForm.handleSubmit(onDepositAmountSubmit)} className="space-y-6">
                <FormField
                  control={depositAmountForm.control}
                  name="desiredAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desired NGNTS Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="e.g., 1000" 
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              const value = parseFloat(e.target.value) || 0;
                              if (value > 0) {
                                const fees = 30;
                                setCalculatedFees(fees);
                                setTotalNgnToDeposit(value + fees);
                                setDesiredNgntsAmount(value);
                              }
                            }}
                            data-testid="input-desired-amount"
                            className="text-2xl font-semibold h-16 pr-20"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                            NGNTS
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {desiredNgntsAmount > 0 && (
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-6 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Est. Received</span>
                        <span className="text-lg font-semibold">
                          {desiredNgntsAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })} NGNTS
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Network Fee + Platform Fee</span>
                        <span className="text-lg font-semibold text-primary">
                          +{calculatedFees.toLocaleString("en-NG", { minimumFractionDigits: 2 })} NGN
                        </span>
                      </div>
                      <div className="pt-3 border-t flex justify-between items-center">
                        <span className="font-semibold">Total to Deposit</span>
                        <span className="text-2xl font-bold">
                          ₦{totalNgnToDeposit.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        <strong>Note:</strong> You'll receive exactly {desiredNgntsAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })} NGNTS after depositing ₦{totalNgnToDeposit.toLocaleString("en-NG", { minimumFractionDigits: 2 })} NGN via bank transfer.
                      </p>
                    </div>
                  </div>
                )}

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
                    disabled={initiateDepositMutation.isPending || desiredNgntsAmount < 100}
                    data-testid="button-get-instructions"
                  >
                    {initiateDepositMutation.isPending ? "Loading..." : "Continue"}
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
                    setDepositStep("amount");
                    setDepositInstructions(null);
                  }}
                  data-testid="button-back-to-amount"
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
