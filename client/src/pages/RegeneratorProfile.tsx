import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Mail,
  Calendar,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Wallet,
  TrendingUp,
  Coins,
  Copy,
  Check,
  Download,
  ExternalLink,
  Building2,
  Upload,
  Info,
  Calculator,
  Fuel,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import UnifiedHeader from "@/components/UnifiedHeader";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BankDepositFeePreview, PlatformBankAccount } from "@shared/schema";

export default function RegeneratorProfile() {
  const [, navigate] = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const prefersReducedMotion = useReducedMotion();
  const { toast } = useToast();
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedReference, setCopiedReference] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  
  // Multi-step wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [depositReference, setDepositReference] = useState("");
  const [wizardBankAccount, setWizardBankAccount] = useState<PlatformBankAccount | null>(null);
  const [wizardFeeBreakdown, setWizardFeeBreakdown] = useState<BankDepositFeePreview | null>(null);
  
  // Bank deposit form state
  const [depositAmount, setDepositAmount] = useState("");
  const [depositProof, setDepositProof] = useState<File | null>(null);
  const [feePreview, setFeePreview] = useState<BankDepositFeePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Queries with auto-refresh for real-time updates
  const { data: kycData } = useQuery<{
    kycStatus: string;
    kycDocuments?: any;
  }>({
    queryKey: ["/api/users/kyc-status"],
    refetchOnMount: "always",
    staleTime: 0,
  });

  const { data: stats } = useQuery<{
    totalInvested: number;
    totalCashflowReceived: number;
    totalTokensOwned: number;
    activeProjectsCount: number;
  }>({
    queryKey: ["/api/regenerator/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: walletData, dataUpdatedAt: walletUpdatedAt } = useQuery<{
    activated: boolean;
    activationStatus: string;
    publicKey: string;
    balances: {
      xlm: string;
      usdc: string;
      ngnts: string;
    };
  }>({
    queryKey: ["/api/regenerator/wallet/balances"],
    refetchOnMount: "always",
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 0,
  });

  const { data: exchangeRates } = useQuery<{
    rates: {
      xlmNgn: string;
      usdcNgn: string;
      ngntsNgn: string;
      xlmUsd: string;
      usdNgn: string;
    };
    lastFetchedAt: string;
    isStale: boolean;
  }>({
    queryKey: ["/api/exchange-rates"],
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: depositHistory } = useQuery<{
    deposits: Array<{
      id: string;
      amountNGN: string;
      platformFee: string;
      gasFee: string;
      ngntsAmount: string;
      status: "pending" | "approved" | "rejected" | "completed";
      referenceCode: string;
      proofUrl: string | null;
      notes: string | null;
      rejectedReason: string | null;
      approvedBy: string | null;
      approvedAt: string | null;
      txHash: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
  }>({
    queryKey: ["/api/regenerator/bank-deposits"],
  });

  // Calculate total capital value (NGNTS + USDC converted to NGN, excluding XLM)
  const totalCapitalValue = useMemo(() => {
    if (!walletData?.balances || !exchangeRates?.rates) {
      return { total: 0, ngnts: 0, usdcNgn: 0, ngntsPercent: 0, usdcPercent: 0 };
    }

    const ngntsBalance = parseFloat(walletData.balances.ngnts || "0");
    const usdcBalance = parseFloat(walletData.balances.usdc || "0");
    const usdcToNgnRate = parseFloat(exchangeRates.rates.usdcNgn || "1650");

    const ngntsValue = ngntsBalance; // 1:1 with NGN
    const usdcValue = usdcBalance * usdcToNgnRate;
    const total = ngntsValue + usdcValue;

    return {
      total,
      ngnts: ngntsValue,
      usdcNgn: usdcValue,
      ngntsPercent: total > 0 ? (ngntsValue / total) * 100 : 0,
      usdcPercent: total > 0 ? (usdcValue / total) * 100 : 0,
    };
  }, [walletData, exchangeRates]);

  // XLM gas balance
  const xlmGasBalance = useMemo(() => {
    return parseFloat(walletData?.balances?.xlm || "0");
  }, [walletData]);

  // Account lifecycle status helper
  const accountLifecycleStatus = useMemo(() => {
    const kycStatus = kycData?.kycStatus || user.kycStatus || "pending";
    const walletActivated = walletData?.activated || walletData?.activationStatus === "active";
    
    if (kycStatus === "rejected") {
      return {
        label: "KYC Rejected",
        badgeClass: "bg-red-600 text-white",
        icon: XCircle,
        callToAction: "Resubmit KYC documents",
        canDeposit: false,
      };
    }
    
    if (kycStatus === "pending" || kycStatus === "submitted") {
      return {
        label: kycStatus === "submitted" ? "KYC Under Review" : "Pending KYC",
        badgeClass: "bg-orange-500 text-white",
        icon: Clock,
        callToAction: kycStatus === "submitted" ? "Awaiting KYC approval" : "Complete KYC to continue",
        canDeposit: false,
      };
    }
    
    if (kycStatus === "approved" && !walletActivated) {
      return {
        label: "KYC Approved",
        badgeClass: "bg-blue-600 text-white",
        icon: CheckCircle2,
        callToAction: "Make your first deposit to activate wallet",
        canDeposit: true,
      };
    }
    
    if (kycStatus === "approved" && walletActivated) {
      return {
        label: "Active Member",
        badgeClass: "bg-emerald-600 text-white",
        icon: CheckCircle2,
        callToAction: "Account fully active",
        canDeposit: true,
      };
    }
    
    return {
      label: "Pending KYC",
      badgeClass: "bg-slate-600 text-white",
      icon: AlertCircle,
      callToAction: "Complete KYC to continue",
      canDeposit: false,
    };
  }, [kycData, walletData, user.kycStatus]);

  // Last updated timestamp
  const lastUpdated = useMemo(() => {
    if (!walletUpdatedAt) return "Just now";
    const secondsAgo = Math.floor((Date.now() - walletUpdatedAt) / 1000);
    if (secondsAgo < 10) return "Just now";
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
    return `${Math.floor(secondsAgo / 3600)}h ago`;
  }, [walletUpdatedAt]);

  // Activity timeline (last 5-7 items)
  const recentActivity = useMemo(() => {
    if (!depositHistory?.deposits) return [];
    const sorted = [...depositHistory.deposits].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return showAllHistory ? sorted : sorted.slice(0, 5);
  }, [depositHistory, showAllHistory]);

  // Fee preview effect (debounced)
  useEffect(() => {
    setPreviewError(null);
    
    const numAmount = parseFloat(depositAmount);
    if (!depositAmount || isNaN(numAmount)) {
      setFeePreview(null);
      return;
    }

    if (numAmount <= 0) {
      setPreviewError("Amount must be greater than 0");
      setFeePreview(null);
      return;
    }

    if (numAmount > 10000000) {
      setPreviewError("Amount exceeds maximum deposit limit (₦10,000,000)");
      setFeePreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const response = await fetch("/api/regenerator/bank-deposits/preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ amountNGN: depositAmount }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to calculate fees");
        }

        const preview = await response.json();
        setFeePreview(preview as BankDepositFeePreview);
      } catch (error: any) {
        console.error("Fee preview error:", error);
        setPreviewError(error.message || "Unable to calculate fees. Please try again.");
        setFeePreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [depositAmount]);

  // Mutations
  const initiateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/regenerator/bank-deposits/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ amountNGN: depositAmount }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to initiate deposit");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setDepositId(data.depositId);
      setDepositReference(data.referenceCode);
      setWizardBankAccount(data.bankAccount);
      setWizardFeeBreakdown(data.feeBreakdown);
      setCurrentStep(2);
      toast({
        title: "Reference Code Generated",
        description: `Your reference code: ${data.referenceCode}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Initiation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadProofMutation = useMutation({
    mutationFn: async () => {
      if (!depositProof || !depositId) throw new Error("Missing deposit proof or ID");
      
      const formData = new FormData();
      formData.append("proof", depositProof);

      const response = await fetch(`/api/regenerator/bank-deposits/${depositId}/proof`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload proof");
      }

      return response.json();
    },
    onSuccess: () => {
      setCurrentStep(4);
      toast({
        title: "Proof Uploaded Successfully",
        description: "Your deposit request is now pending admin approval",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/regenerator/bank-deposits"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStep1Continue = () => {
    if (!depositAmount || !feePreview || previewError) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid deposit amount",
        variant: "destructive",
      });
      return;
    }
    initiateMutation.mutate();
  };

  const handleStep3Submit = () => {
    if (!depositProof) {
      toast({
        title: "Missing Proof",
        description: "Please upload proof of payment",
        variant: "destructive",
      });
      return;
    }
    uploadProofMutation.mutate();
  };

  const resetDepositWizard = () => {
    setCurrentStep(1);
    setDepositAmount("");
    setDepositProof(null);
    setDepositId(null);
    setDepositReference("");
    setWizardBankAccount(null);
    setWizardFeeBreakdown(null);
    setFeePreview(null);
    setPreviewError(null);
  };

  const handleCloseWizard = () => {
    setDepositDialogOpen(false);
    setTimeout(() => {
      resetDepositWizard();
    }, 300);
  };

  const copyToClipboard = async (text: string, type: "address" | "reference" = "address") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "address") {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } else {
        setCopiedReference(true);
        setTimeout(() => setCopiedReference(false), 2000);
      }
      toast({
        title: "Copied!",
        description: type === "address" ? "Wallet address copied to clipboard" : "Reference code copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <UnifiedHeader />

      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Page Header */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white" data-testid="text-page-title">
                Member Dashboard
              </h1>
              <p className="text-slate-400 mt-1">
                Manage your participation capital and cooperative memberships
              </p>
            </div>
            <Badge className={accountLifecycleStatus.badgeClass} data-testid="badge-account-status">
              {(() => {
                const StatusIcon = accountLifecycleStatus.icon;
                return <StatusIcon className="w-3 h-3 mr-1" />;
              })()}
              {accountLifecycleStatus.label}
            </Badge>
          </div>
        </motion.div>

        {/* HERO: Total Capital Value */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="relative bg-gradient-to-br from-emerald-600/20 via-blue-600/20 to-purple-600/20 backdrop-blur-md border-2 border-emerald-500/30 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-blue-500/10" />
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" />
            
            <div className="relative p-6 md:p-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-slate-300 text-sm md:text-base mb-2 flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Total Capital Value
                  </p>
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-4xl md:text-6xl font-bold text-white" data-testid="text-total-capital">
                      ₦{totalCapitalValue.total.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-5 h-5 text-slate-400 hover:text-slate-300" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-800 border-slate-600">
                          <p className="text-xs">NGNTS + USDC (converted to NGN)</p>
                          <p className="text-xs text-slate-400 mt-1">Excludes XLM (network gas)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="border-emerald-400/30 text-emerald-400 text-xs">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Live
                    </Badge>
                    <span className="text-xs text-slate-400">Updated {lastUpdated}</span>
                  </div>
                </div>
                <Button
                  onClick={() => accountLifecycleStatus.canDeposit && setDepositDialogOpen(true)}
                  disabled={!accountLifecycleStatus.canDeposit}
                  size="lg"
                  className={
                    accountLifecycleStatus.canDeposit
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                      : "bg-slate-700 text-slate-400 cursor-not-allowed"
                  }
                  data-testid="button-deposit-hero"
                >
                  <ArrowUpRight className="w-5 h-5 mr-2" />
                  Add Capital
                </Button>
              </div>

              {/* Capital Allocation Breakdown */}
              {totalCapitalValue.total > 0 && (
                <div className="space-y-3 bg-black/20 rounded-xl p-4 border border-white/10">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Capital Allocation</p>
                  
                  {/* NGNTS */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-slate-300">NGNTS</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-semibold">
                          ₦{totalCapitalValue.ngnts.toLocaleString('en-NG', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-xs text-slate-400 w-12 text-right">
                          {totalCapitalValue.ngntsPercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Progress value={totalCapitalValue.ngntsPercent} className="h-2 bg-white/5">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: `${totalCapitalValue.ngntsPercent}%` }} />
                    </Progress>
                  </div>

                  {/* USDC */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-slate-300">USDC</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-semibold">
                          ₦{totalCapitalValue.usdcNgn.toLocaleString('en-NG', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-xs text-slate-400 w-12 text-right">
                          {totalCapitalValue.usdcPercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Progress value={totalCapitalValue.usdcPercent} className="h-2 bg-white/5">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" style={{ width: `${totalCapitalValue.usdcPercent}%` }} />
                    </Progress>
                  </div>

                  {/* XLM Gas Badge */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-2 cursor-help">
                            <Fuel className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs text-slate-500">Network Gas</span>
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-800 border-slate-600 max-w-xs">
                            <p className="text-xs">XLM is used exclusively for Stellar network transaction fees (gas).</p>
                            <p className="text-xs text-slate-400 mt-1">It's not counted as participation capital.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                      {xlmGasBalance.toFixed(4)} XLM
                    </Badge>
                  </div>
                </div>
              )}

              {/* First-time user CTA */}
              {totalCapitalValue.total === 0 && accountLifecycleStatus.canDeposit && (
                <div className="bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-sm text-blue-300 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Ready to get started?
                  </p>
                  <p className="text-xs text-slate-400 mb-3">
                    Make your first capital contribution to activate your wallet and start participating in agricultural cooperatives
                  </p>
                  <Button
                    onClick={() => setDepositDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Make First Deposit
                  </Button>
                </div>
              )}

              {/* Pre-KYC State */}
              {!accountLifecycleStatus.canDeposit && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-orange-300 mb-1">
                        {accountLifecycleStatus.callToAction}
                      </p>
                      <p className="text-xs text-orange-200/80 mb-3">
                        Complete KYC verification to unlock capital contributions and cooperative participation
                      </p>
                      <Button
                        onClick={() => navigate("/kyc")}
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Complete KYC
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Portfolio Overview */}
          <motion.div
            className="lg:col-span-2 space-y-6"
            initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Participation Summary */}
            <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
              <div className="p-6">
                <div className="mb-4">
                  <h2 className="text-white text-xl font-semibold flex items-center gap-2">
                    <Coins className="w-5 h-5 text-emerald-400" />
                    Participation Summary
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Your cooperative membership overview
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10 hover-elevate" data-testid="card-total-contributed">
                    <p className="text-sm text-slate-400 mb-1">Total Contributed</p>
                    <p className="text-2xl md:text-3xl font-bold text-white" data-testid="text-total-contributed">
                      ₦{stats?.totalInvested?.toLocaleString() || "0"}
                    </p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10 hover-elevate" data-testid="card-participation-units">
                    <p className="text-sm text-slate-400 mb-1">Participation Units</p>
                    <p className="text-2xl md:text-3xl font-bold text-white" data-testid="text-participation-units">
                      {stats?.totalTokensOwned?.toLocaleString() || "0"}
                    </p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10 hover-elevate" data-testid="card-active-cooperatives">
                    <p className="text-sm text-slate-400 mb-1">Active Cooperatives</p>
                    <p className="text-2xl md:text-3xl font-bold text-white" data-testid="text-active-cooperatives">
                      {stats?.activeProjectsCount || "0"}
                    </p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10 hover-elevate" data-testid="card-total-distributions">
                    <p className="text-sm text-slate-400 mb-1">Total Distributions</p>
                    <p className="text-2xl md:text-3xl font-bold text-emerald-400" data-testid="text-total-distributions">
                      ₦{stats?.totalCashflowReceived?.toLocaleString() || "0"}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate("/portfolio")}
                  variant="outline"
                  className="w-full mt-4 border-white/10 text-white hover:bg-white/5"
                  data-testid="button-view-portfolio"
                >
                  View Full Portfolio
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/60 via-purple-500/60 to-blue-500/60" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-white text-xl font-semibold flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-400" />
                      Recent Activity
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      Your latest capital transactions
                    </p>
                  </div>
                  {depositHistory && depositHistory.deposits.length > 5 && (
                    <Button
                      onClick={() => setShowAllHistory(!showAllHistory)}
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    >
                      {showAllHistory ? "Show Less" : "View All"}
                    </Button>
                  )}
                </div>

                {recentActivity && recentActivity.length > 0 ? (
                  <div className="space-y-2" data-testid="list-activity-timeline">
                    {recentActivity.map((deposit) => (
                      <div
                        key={deposit.id}
                        className="p-3 bg-white/5 rounded-lg border border-white/10 hover-elevate"
                        data-testid={`activity-${deposit.id}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-mono text-blue-300 truncate" data-testid={`ref-${deposit.id}`}>
                                {deposit.referenceCode}
                              </p>
                              {deposit.status === "pending" && (
                                <Badge variant="secondary" className="text-orange-400 border-orange-400 text-xs">
                                  <Clock className="w-2.5 h-2.5 mr-1" />
                                  Pending
                                </Badge>
                              )}
                              {deposit.status === "approved" && (
                                <Badge className="bg-emerald-600 text-white text-xs">
                                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                  Approved
                                </Badge>
                              )}
                              {deposit.status === "rejected" && (
                                <Badge variant="destructive" className="text-xs">
                                  <XCircle className="w-2.5 h-2.5 mr-1" />
                                  Rejected
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">
                              {new Date(deposit.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-semibold text-white" data-testid={`amount-${deposit.id}`}>
                              ₦{parseFloat(deposit.amountNGN).toLocaleString()}
                            </p>
                            {deposit.status === "approved" && (
                              <p className="text-xs text-emerald-400">
                                +{parseFloat(deposit.ngntsAmount).toLocaleString()} NGNTS
                              </p>
                            )}
                          </div>
                        </div>

                        {deposit.txHash && (
                          <a
                            href={`https://stellar.expert/explorer/${
                              import.meta.env.VITE_STELLAR_HORIZON_URL?.includes("testnet") ? "testnet" : "public"
                            }/tx/${deposit.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2"
                            data-testid={`tx-link-${deposit.id}`}
                          >
                            <ExternalLink className="w-3 h-3" />
                            View on Blockchain
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8" data-testid="empty-activity">
                    <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">No activity yet</p>
                    <p className="text-slate-500 text-xs mt-1">
                      Your transactions will appear here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Sidebar: Account Info & Actions */}
          <motion.div
            className="space-y-6"
            initial={prefersReducedMotion ? {} : { opacity: 0, x: 20 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Account Information - Compact */}
            <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500/60 via-pink-500/60 to-purple-500/60" />
              <div className="p-5">
                <h2 className="text-white text-lg font-semibold flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-purple-400" />
                  Account Info
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500">Email</p>
                      <p className="text-white truncate" data-testid="text-user-email">
                        {user.email || "Not available"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Member Since</p>
                      <p className="text-white" data-testid="text-member-since">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Recently joined"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Address - Compact */}
            <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500/60 via-orange-500/60 to-yellow-500/60" />
              <div className="p-5">
                <h2 className="text-white text-lg font-semibold flex items-center gap-2 mb-3">
                  <Wallet className="w-4 h-4 text-yellow-400" />
                  Stellar Wallet
                </h2>
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/20 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-blue-300">Wallet Address</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => walletData?.publicKey && copyToClipboard(walletData.publicKey)}
                        className="h-6 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 p-1"
                        data-testid="button-copy-address"
                      >
                        {copiedAddress ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs font-mono text-slate-300 break-all bg-black/20 p-2 rounded border border-white/5" data-testid="text-public-key">
                      {walletData?.publicKey || "Loading..."}
                    </p>
                  </div>
                  <Button
                    onClick={() => setDepositDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="w-full border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                    data-testid="button-deposit-instructions"
                  >
                    <Download className="w-3 h-3 mr-2" />
                    Deposit Instructions
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
              <div className="p-5 space-y-2.5">
                <h2 className="text-white text-lg font-semibold mb-3">Quick Actions</h2>
                
                <Button
                  onClick={() => navigate("/regenerator-dashboard")}
                  variant="outline"
                  className="w-full border-white/10 text-white hover:bg-white/5 justify-start"
                  data-testid="button-go-to-dashboard"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Dashboard
                </Button>
                
                <Button
                  onClick={() => navigate("/projects")}
                  className="w-full bg-blue-600 hover:bg-blue-700 justify-start"
                  data-testid="button-browse-cooperatives"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Browse Cooperatives
                </Button>
                
                <Button
                  onClick={() => navigate("/kyc")}
                  variant="outline"
                  className="w-full border-white/10 text-white hover:bg-white/5 justify-start"
                  data-testid="button-go-to-kyc"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  {kycData?.kycStatus === "approved" ? "View KYC" : "Complete KYC"}
                </Button>
              </div>
            </div>

            {/* Platform Benefits - Compact */}
            <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500/60 via-emerald-500/60 to-green-500/60" />
              <div className="p-5">
                <h2 className="text-white text-sm font-semibold mb-3">Member Benefits</h2>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-300">
                      Access tokenized agricultural cooperatives
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-300">
                      Receive regular distribution payments
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-300">
                      Trade participation units on marketplace
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-300">
                      Full blockchain transparency
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Deposit Funds Dialog - Keep existing wizard */}
      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-deposit-funds">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Wallet className="w-6 h-6 text-emerald-400" />
              Add Capital to Your Wallet
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Fund your wallet using cryptocurrency or bank transfer
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="crypto" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2 bg-white/5">
              <TabsTrigger value="crypto" className="data-[state=active]:bg-emerald-600" data-testid="tab-crypto">
                <Coins className="w-4 h-4 mr-2" />
                Crypto Deposit
              </TabsTrigger>
              <TabsTrigger value="fiat" className="data-[state=active]:bg-blue-600" data-testid="tab-fiat">
                <Building2 className="w-4 h-4 mr-2" />
                Bank Transfer
              </TabsTrigger>
            </TabsList>

            {/* Crypto Deposit Tab */}
            <TabsContent value="crypto" className="space-y-6 mt-4">
              <div className="bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-blue-300">Your Stellar Wallet Address</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => walletData?.publicKey && copyToClipboard(walletData.publicKey)}
                    className="h-7 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    data-testid="button-copy-address-dialog"
                  >
                    {copiedAddress ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm font-mono text-slate-300 break-all bg-black/20 p-3 rounded border border-white/5">
                  {walletData?.publicKey || "Loading..."}
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-white font-semibold">Supported Assets</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                        <span className="text-emerald-400 font-bold text-xs">N</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">NGNTS</p>
                        <p className="text-xs text-slate-400">Nigerian Naira Token</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-600">Recommended</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <span className="text-blue-400 font-bold text-xs">U</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">USDC</p>
                        <p className="text-xs text-slate-400">USD Coin</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h3 className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Important Notes
                </h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Send only NGNTS or USDC to this address on the Stellar network</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Your wallet will be automatically activated on first deposit</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Deposits typically appear within 5-10 seconds</span>
                  </li>
                </ul>
              </div>

              <Button
                variant="outline"
                onClick={handleCloseWizard}
                className="w-full border-white/10 text-white hover:bg-white/5"
                data-testid="button-close-dialog"
              >
                Close
              </Button>
            </TabsContent>

            {/* Fiat Deposit Tab */}
            <TabsContent value="fiat" className="space-y-6 mt-4">
              {/* Step 1: Enter Amount */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Step 1: Enter Deposit Amount</h3>
                    <p className="text-sm text-slate-400">How much would you like to deposit?</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="deposit-amount" className="text-slate-300">
                        Deposit Amount (NGN) *
                      </Label>
                      <Input
                        id="deposit-amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="10000.00"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                        data-testid="input-deposit-amount"
                      />
                    </div>

                    {previewLoading && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <p className="text-sm text-blue-300">Calculating fees...</p>
                      </div>
                    )}
                    
                    {previewError && !previewLoading && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-red-300">{previewError}</p>
                        </div>
                      </div>
                    )}
                    
                    {feePreview && !previewLoading && !previewError && (
                      <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-emerald-400" />
                          <p className="text-sm font-medium text-emerald-300">Fee Breakdown</p>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Deposit Amount:</span>
                            <span className="font-semibold text-white">
                              ₦{feePreview.amountNGN.toLocaleString('en-NG', {minimumFractionDigits: 2})}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Platform Fee ({feePreview.platformFeePercent}%):</span>
                            <span className="text-orange-300">
                              -₦{feePreview.platformFee.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Gas Fee ({feePreview.gasFeeXLM} XLM):</span>
                            <span className="text-orange-300">
                              -₦{feePreview.gasFeeNGN.toFixed(2)}
                            </span>
                          </div>
                          {feePreview.needsWalletActivation && feePreview.walletActivationFee > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-400 flex items-center gap-1">
                                Wallet Activation (one-time):
                                <AlertCircle className="w-3 h-3" />
                              </span>
                              <span className="text-orange-300">
                                -₦{feePreview.walletActivationFee.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <Separator className="bg-white/10" />
                          <div className="flex justify-between text-base font-semibold">
                            <span className="text-emerald-300">You will receive:</span>
                            <span className="text-emerald-400">
                              {feePreview.ngntsAmount.toFixed(2)} NGNTS
                            </span>
                          </div>
                          {feePreview.needsWalletActivation && (
                            <p className="text-xs text-blue-300 mt-2">
                              ℹ️ Wallet activation fee is a one-time charge to set up your Stellar account.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleStep1Continue}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={initiateMutation.isPending || !depositAmount || !feePreview || !!previewError}
                      data-testid="button-get-reference"
                    >
                      {initiateMutation.isPending ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Continue to Get Reference Code"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseWizard}
                      className="border-white/10 text-white hover:bg-white/5"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Get Reference Code */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Step 2: Your Reference Code</h3>
                    <p className="text-sm text-slate-400">Use this reference code when making your bank transfer</p>
                  </div>

                  <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-500/20">
                    <CardContent className="p-6 space-y-4">
                      <div>
                        <p className="text-sm font-medium text-emerald-300 mb-2">Your Reference Code</p>
                        <div className="bg-black/40 p-4 rounded-lg border border-white/10">
                          <p className="text-3xl font-mono font-bold text-white text-center" data-testid="text-reference-code">
                            {depositReference}
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => copyToClipboard(depositReference, "reference")}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        data-testid="button-copy-reference"
                      >
                        {copiedReference ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Reference Code
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {wizardBankAccount && (
                    <Card className="bg-gradient-to-br from-blue-600/20 via-blue-500/15 to-indigo-500/20 border-blue-400/40 border-2">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-6 h-6 text-blue-300" />
                          <p className="text-base font-bold text-blue-200">Transfer to This Account</p>
                        </div>
                        
                        <div className="space-y-4 bg-black/30 p-5 rounded-lg border border-blue-400/20">
                          <div>
                            <p className="text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Account Title</p>
                            <p className="text-base font-bold text-white">{wizardBankAccount.title}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Bank Name</p>
                            <p className="text-base font-bold text-white">{wizardBankAccount.bankName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Account Number</p>
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-mono font-bold text-white flex-1">
                                {wizardBankAccount.accountNumber}
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  navigator.clipboard.writeText(wizardBankAccount.accountNumber);
                                  toast({ title: "Copied!", description: "Account number copied" });
                                }}
                                className="h-8 text-blue-300 hover:bg-blue-500/20"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t border-white/10">
                            <p className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Amount to Transfer</p>
                            <p className="text-3xl font-bold text-emerald-400">
                              ₦{parseFloat(depositAmount).toLocaleString('en-NG', {minimumFractionDigits: 2})}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {wizardFeeBreakdown && (
                    <Card className="bg-slate-800/50 border-slate-600/50">
                      <CardContent className="p-6 space-y-4">
                        <div>
                          <p className="text-base font-bold text-white mb-3 flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-slate-300" />
                            Fee Breakdown & NGNTS You'll Receive
                          </p>
                        </div>
                        
                        <div className="space-y-3 bg-black/40 p-4 rounded-lg border border-white/10">
                          <div className="flex justify-between items-center">
                            <p className="text-base text-white">Deposit Amount</p>
                            <p className="text-base font-bold text-white">
                              ₦{wizardFeeBreakdown.amountNGN.toLocaleString('en-NG', {minimumFractionDigits: 2})}
                            </p>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-slate-300">Platform Fee (2%)</p>
                            <p className="text-sm font-semibold text-red-300">
                              -₦{wizardFeeBreakdown.platformFee.toLocaleString('en-NG', {minimumFractionDigits: 2})}
                            </p>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-slate-300">Stellar Gas Fee</p>
                            <p className="text-sm font-semibold text-red-300">
                              -₦{wizardFeeBreakdown.gasFeeNGN.toFixed(2)}
                            </p>
                          </div>

                          {wizardFeeBreakdown.needsWalletActivation && wizardFeeBreakdown.walletActivationFee > 0 && (
                            <div className="flex justify-between items-center">
                              <p className="text-sm text-slate-300">Wallet Activation (one-time)</p>
                              <p className="text-sm font-semibold text-red-300">
                                -₦{wizardFeeBreakdown.walletActivationFee.toFixed(2)}
                              </p>
                            </div>
                          )}
                          
                          <Separator className="bg-white/20" />
                          
                          <div className="flex justify-between items-center pt-2">
                            <p className="text-lg font-bold text-emerald-300">You will receive</p>
                            <p className="text-xl font-bold text-emerald-400">
                              {wizardFeeBreakdown.ngntsAmount.toFixed(2)} NGNTS
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={() => setCurrentStep(3)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      Next: Upload Proof
                    </Button>
                    <Button
                      onClick={() => setCurrentStep(1)}
                      variant="outline"
                      className="border-white/10 text-white hover:bg-white/5"
                    >
                      Back
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Upload Proof */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Step 3: Upload Proof of Payment</h3>
                    <p className="text-sm text-slate-400">Upload your bank transfer receipt or screenshot</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="proof-upload" className="text-slate-300">
                        Proof of Payment *
                      </Label>
                      <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-blue-400/50 transition-colors">
                        <Input
                          id="proof-upload"
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setDepositProof(e.target.files?.[0] || null)}
                          className="hidden"
                          data-testid="input-proof-upload"
                        />
                        <label htmlFor="proof-upload" className="cursor-pointer">
                          <Upload className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                          <p className="text-white mb-1">
                            {depositProof ? depositProof.name : "Click to upload"}
                          </p>
                          <p className="text-xs text-slate-400">PNG, JPG or PDF (max 10MB)</p>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleStep3Submit}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={!depositProof || uploadProofMutation.isPending}
                      data-testid="button-submit-proof"
                    >
                      {uploadProofMutation.isPending ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        "Submit for Review"
                      )}
                    </Button>
                    <Button
                      onClick={() => setCurrentStep(2)}
                      variant="outline"
                      className="border-white/10 text-white hover:bg-white/5"
                    >
                      Back
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Success */}
              {currentStep === 4 && (
                <div className="space-y-6 text-center">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Proof Uploaded Successfully!</h3>
                    <p className="text-slate-400">
                      Your deposit request is now pending admin approval. We'll review it within 1-2 business days.
                    </p>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-left">
                    <h4 className="text-white font-semibold mb-2">What happens next?</h4>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex gap-2">
                        <span className="text-blue-400">1.</span>
                        <span>Our team will verify your bank transfer</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400">2.</span>
                        <span>Once approved, NGNTS will be credited to your wallet</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400">3.</span>
                        <span>You'll receive a notification when the deposit is processed</span>
                      </li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleCloseWizard}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Done
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
