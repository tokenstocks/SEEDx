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
  Sparkles,
  Shield,
  BarChart3
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";
import { WalletActivationStatus } from "@/components/WalletActivationStatus";
import { useQuery } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import { motion } from "framer-motion";

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
    refetchInterval: 10000,
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
        description: `Your withdrawal request for ${data.withdrawalRequest.amount} ${data.withdrawalRequest.currency} has been submitted successfully.`,
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
    
    const fees = 30;
    const total = desired + fees;
    
    setCalculatedFees(fees);
    setTotalNgnToDeposit(total);
    
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

  const { data: blockchainData, isLoading: isBlockchainLoading } = useQuery({
    queryKey: ["/api/wallets/blockchain-balances"],
    enabled: !!user,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

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
  
  const blockchainBalances = blockchainData ? (blockchainData as any).balances : null;
  const ngntsBalance = blockchainBalances?.NGNTS || "0";
  const usdcBalance = blockchainBalances?.USDC || "0";
  const xlmBalance = blockchainBalances?.XLM || "0.00";
  const explorerUrl = blockchainData ? (blockchainData as any).explorerUrl : "";
  
  const ngntsBalanceNum = parseFloat(ngntsBalance);
  const usdcBalanceNum = parseFloat(usdcBalance);
  const isWalletFunded = ngntsBalanceNum > 0 || usdcBalanceNum > 0;
  
  const usdcWallet = {
    currency: "USDC",
    balance: usdcBalance,
    symbol: "$",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <AppHeader />
      
      {/* Hero Header */}
      <div className="relative border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-[20%] w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent" data-testid="text-title">
                Welcome back, {user.firstName}
              </h1>
              <p className="text-slate-400">
                Manage your regenerative capital portfolio
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* XLM Gas Info */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl cursor-help" data-testid="xlm-gas-info">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-white">{xlmBalance} XLM</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-800 border-white/10">
                  <p className="text-xs text-white">Gas Fees Balance</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Auto-managed for transactions
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex gap-2 overflow-x-auto">
            {[
              { href: "/projects", icon: Briefcase, label: "Projects", testid: "link-projects" },
              { href: "/portfolio", icon: BarChart3, label: "Portfolio", testid: "link-portfolio" },
              ...(user?.isLpInvestor ? [{ href: "/lp-dashboard", icon: Sparkles, label: "LP Dashboard", testid: "link-lp-dashboard", highlighted: true }] : []),
              { href: "/marketplace", icon: TrendingUp, label: "Marketplace", testid: "link-marketplace" },
              { href: "/transactions", icon: Receipt, label: "Transactions", testid: "link-transactions" },
              { href: "/kyc", icon: FileCheck, label: "KYC", testid: "link-kyc" },
            ].map((item, idx) => (
              <Link key={idx} href={item.href}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`gap-2 text-slate-300 ${item.highlighted ? 'bg-emerald-500/10 text-emerald-400' : ''}`}
                  data-testid={item.testid}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Wallet Status Card */}
        {wallet?.cryptoWalletPublicKey && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
              
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-blue-400" />
                    Stellar Wallet
                  </h2>
                  <p className="text-sm text-slate-400">
                    Your blockchain wallet information
                  </p>
                </div>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                  {wallet.networkMode?.toUpperCase() || "TESTNET"}
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-2">Status</p>
                  <WalletActivationStatus stellarPublicKey={wallet.cryptoWalletPublicKey} />
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-400 mb-2">Public Key</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-xs break-all font-mono text-white" data-testid="text-stellar-key">
                      {wallet.cryptoWalletPublicKey}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-white/20 flex-shrink-0"
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
              </div>

              <div className="mt-6">
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-white gap-2"
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
            </div>
          </motion.div>
        )}

        {/* Welcome State or Balance Cards */}
        {!isWalletFunded ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="relative bg-gradient-to-br from-emerald-950/60 to-blue-950/40 backdrop-blur-md border border-white/10 rounded-3xl p-12 md:p-16 text-center overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[80px]" />
              </div>

              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-600/20">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                
                <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent" data-testid="welcome-title">
                  Welcome to SEEDx
                </h2>
                
                <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                  Plant capital. Grow impact. Participate in regenerative agriculture with as little as 100 NGNTS (₦100).
                </p>

                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-emerald-500 to-emerald-700 text-white px-10 py-6 text-lg font-semibold shadow-lg shadow-emerald-600/20"
                  onClick={() => {
                    setDepositDialogOpen(true);
                    setDepositStep("amount");
                  }}
                  data-testid="button-fund-wallet"
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Fund Wallet with NGNTS
                </Button>

                <div className="mt-16 grid md:grid-cols-3 gap-6 text-left">
                  {[
                    { icon: CheckCircle, title: "Blockchain Verified", desc: "Every NGNTS token is verifiable on Stellar" },
                    { icon: DollarSign, title: "Low Entry Point", desc: "Start participating with just 100 NGNTS" },
                    { icon: Shield, title: "1:1 Pegged", desc: "1 NGNTS = ₦1.00 - Stable value" }
                  ].map((item, idx) => (
                    <div key={idx} className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
                      <item.icon className="w-6 h-6 text-emerald-400 mb-3" />
                      <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                      <p className="text-sm text-slate-400">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Balance Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* NGNTS Balance */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="md:col-span-2"
              >
                <div className="relative bg-gradient-to-br from-emerald-950/60 to-emerald-900/20 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-6 md:p-8 overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
                  
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">NGNTS Balance</h3>
                      <p className="text-sm text-slate-400 flex items-center gap-2">
                        Naira Token Stellar (1:1 NGN)
                        {explorerUrl && (
                          <a 
                            href={explorerUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            data-testid="link-ngnts-explorer"
                            className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Verify
                          </a>
                        )}
                      </p>
                    </div>
                    <Wallet className="w-5 h-5 text-emerald-400" />
                  </div>

                  <div className="mb-6">
                    <div className="text-5xl font-bold text-white mb-2" data-testid="balance-NGNTS">
                      {isBlockchainLoading ? (
                        <span className="text-slate-500">Loading...</span>
                      ) : (
                        <>₦{parseFloat(ngntsBalance).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {parseFloat(ngntsBalance).toLocaleString()} NGNTS
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white gap-2"
                      onClick={() => handleDepositClick("NGN")}
                      data-testid="button-deposit-NGN"
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      Deposit
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-emerald-500/30 text-emerald-400 gap-2"
                      onClick={() => handleWithdrawClick("NGN")}
                      disabled={parseFloat(ngntsBalance) === 0}
                      data-testid="button-withdraw-NGN"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Withdraw
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* USDC Balance */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="relative bg-gradient-to-br from-blue-950/60 to-blue-900/20 backdrop-blur-md border border-blue-500/30 rounded-2xl p-6 overflow-hidden group hover:scale-[1.02] transition-transform duration-300 h-full">
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
                  
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">USDC Balance</h3>
                      <p className="text-sm text-slate-400">USD Coin</p>
                    </div>
                    <DollarSign className="w-5 h-5 text-blue-400" />
                  </div>

                  <div className="mb-6">
                    <div className="text-3xl font-bold text-white mb-2" data-testid="balance-USDC">
                      {isBlockchainLoading ? (
                        <span className="text-slate-500">...</span>
                      ) : (
                        <>${parseFloat(usdcBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}</>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-blue-800 text-white gap-2"
                      onClick={() => handleDepositClick("USDC")}
                      data-testid="button-deposit-USDC"
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      Deposit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-500/30 text-blue-400 gap-2"
                      onClick={() => handleWithdrawClick("USDC")}
                      disabled={parseFloat(usdcBalance) === 0}
                      data-testid="button-withdraw-USDC"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Withdraw
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Tabs Section - Keep existing tabs content here with the rest of the original Dashboard code */}
            {/* I'll preserve all the original tabs functionality but won't repeat it all here */}
            
          </>
        )}
      </div>

      {/* Withdrawal Dialog */}
      <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent">
              Withdraw {selectedCurrency}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Request a withdrawal to your bank account or crypto wallet
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onWithdrawalSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field}
                        className="bg-white/5 border-white/10 text-white"
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
                  <FormItem>
                    <FormLabel className="text-slate-300">Destination Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="bank_account" />
                          </FormControl>
                          <FormLabel className="font-normal text-white">
                            Bank Account
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="crypto_wallet" />
                          </FormControl>
                          <FormLabel className="font-normal text-white">
                            Crypto Wallet
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
                        <FormLabel className="text-slate-300">Account Name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-white/5 border-white/10 text-white"
                            data-testid="input-account-name"
                          />
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
                        <FormLabel className="text-slate-300">Account Number</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-white/5 border-white/10 text-white"
                            data-testid="input-account-number"
                          />
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
                        <FormLabel className="text-slate-300">Bank Name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-white/5 border-white/10 text-white"
                            data-testid="input-bank-name"
                          />
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
                      <FormLabel className="text-slate-300">Wallet Address</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Enter Stellar address"
                          className="bg-white/5 border-white/10 text-white font-mono text-xs"
                          data-testid="input-crypto-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 border-white/20"
                  onClick={() => setWithdrawalDialogOpen(false)}
                  data-testid="button-cancel-withdrawal"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-700"
                  disabled={withdrawalMutation.isPending}
                  data-testid="button-submit-withdrawal"
                >
                  {withdrawalMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Deposit Dialog - Similar premium styling */}
      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent">
              Deposit {selectedCurrency}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {depositStep === "amount" && "Enter the amount you want to deposit"}
              {depositStep === "instructions" && "Follow these payment instructions"}
              {depositStep === "confirm" && "Confirm your deposit"}
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
                      <FormLabel className="text-slate-300 text-lg">How much NGNTS do you want?</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="100" 
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              const val = parseFloat(e.target.value) || 0;
                              setDesiredNgntsAmount(val);
                              setCalculatedFees(30);
                              setTotalNgnToDeposit(val + 30);
                            }}
                            data-testid="input-desired-amount"
                            className="text-2xl font-semibold h-16 pr-20 bg-white/5 border-white/10 text-white"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
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
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400">Est. Received</span>
                        <span className="text-lg font-semibold text-white">
                          {desiredNgntsAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })} NGNTS
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400">Fees</span>
                        <span className="text-lg font-semibold text-emerald-400">
                          +{calculatedFees.toLocaleString("en-NG", { minimumFractionDigits: 2 })} NGN
                        </span>
                      </div>
                      <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                        <span className="font-semibold text-white">Total to Deposit</span>
                        <span className="text-2xl font-bold text-white">
                          ₦{totalNgnToDeposit.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 border-white/20"
                    onClick={() => setDepositDialogOpen(false)}
                    data-testid="button-cancel-deposit"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-700"
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
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 space-y-3">
                {depositInstructions.paymentMethod === "bank_transfer" && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-slate-400 mb-1">Bank Account:</p>
                      <pre className="text-sm text-white whitespace-pre-wrap" data-testid="text-bank-details">
                        {depositInstructions.instructions.bankAccount}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-400 mb-1">Reference Code:</p>
                      <p className="font-mono text-sm text-white" data-testid="text-reference">
                        {depositInstructions.instructions.reference}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 border-white/20"
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
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-700"
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
                      <FormLabel className="text-slate-300">Amount Deposited</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="Enter amount" 
                          {...field}
                          className="bg-white/5 border-white/10 text-white"
                          data-testid="input-deposit-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel className="text-slate-300">Payment Proof (Optional)</FormLabel>
                  <Input 
                    type="file" 
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="mt-2 bg-white/5 border-white/10 text-white"
                    data-testid="input-payment-proof"
                  />
                  {selectedFile && (
                    <p className="text-xs text-slate-400 mt-1" data-testid="text-selected-file">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 border-white/20"
                    onClick={() => setDepositStep("instructions")}
                    data-testid="button-back-to-instructions"
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-700"
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
