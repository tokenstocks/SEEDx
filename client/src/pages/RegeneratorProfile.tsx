import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  FileText,
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
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import UnifiedHeader from "@/components/UnifiedHeader";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BankDepositFeePreview, PlatformBankAccount, PlatformSetting } from "@shared/schema";
import { useMemo } from "react";

export default function RegeneratorProfile() {
  const [, navigate] = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const prefersReducedMotion = useReducedMotion();
  const { toast } = useToast();
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedReference, setCopiedReference] = useState(false);
  
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
    activeProjects: number;
  }>({
    queryKey: ["/api/regenerator/stats"],
  });

  const { data: walletData } = useQuery<{
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
    staleTime: 0,
  });

  const { data: activeAccount, isLoading: bankAccountsLoading } = useQuery<PlatformBankAccount>({
    queryKey: ["/api/regenerator/bank-account/active"],
  });

  const { data: platformSettings, isLoading: settingsLoading } = useQuery<{
    depositFeePercent: number;
    withdrawalFeePercent: number;
  }>({
    queryKey: ["/api/regenerator/platform-fees"],
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

  // Account lifecycle status helper (computed after queries are declared)
  const accountLifecycleStatus = useMemo(() => {
    const kycStatus = kycData?.kycStatus || user.kycStatus || "pending";
    const walletActivated = walletData?.activated || walletData?.activationStatus === "active";
    
    // Decision tree for account lifecycle
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
        label: "Active",
        badgeClass: "bg-emerald-600 text-white",
        icon: CheckCircle2,
        callToAction: "Account fully active",
        canDeposit: true,
      };
    }
    
    // Default fallback
    return {
      label: "Pending KYC",
      badgeClass: "bg-slate-600 text-white",
      icon: AlertCircle,
      callToAction: "Complete KYC to continue",
      canDeposit: false,
    };
  }, [kycData, walletData, user.kycStatus]);

  // Fee preview effect (debounced)
  useEffect(() => {
    // Reset preview and error state
    setPreviewError(null);
    
    // Validate amount
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

    if (numAmount > 10000000) { // 10 million NGN max
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

  // Step 2: Initiate deposit mutation
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

  // Step 3: Upload proof mutation
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

  const getKycStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-600 text-white" data-testid="badge-kyc-approved">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="text-orange-400 border-orange-400" data-testid="badge-kyc-pending">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" data-testid="badge-kyc-rejected">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-slate-400 border-slate-600" data-testid="badge-kyc-not-submitted">
            <AlertCircle className="w-3 h-3 mr-1" />
            Not Submitted
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <UnifiedHeader />

      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">
            Profile & Account
          </h1>
          <p className="text-slate-400 mt-1">
            Manage your Regenerator account information and verification status
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Information Card */}
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
                <div className="p-6">
                  <div className="mb-4">
                    <h2 className="text-white text-xl font-semibold flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-400" />
                      Account Information
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      Your Regenerator account details
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between p-4 bg-white/5 rounded-lg border border-white/10" data-testid="card-email-info">
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-slate-400">Email Address</p>
                          <p className="text-white font-medium" data-testid="text-user-email-value">
                            {user.email || "Not available"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start justify-between p-4 bg-white/5 rounded-lg border border-white/10" data-testid="card-account-type">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-purple-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-slate-400">Account Status</p>
                          <p className="text-white font-medium" data-testid="text-account-type">
                            {accountLifecycleStatus.label}
                          </p>
                          {accountLifecycleStatus.callToAction !== "Account fully active" && (
                            <p className="text-xs text-slate-400 mt-1">{accountLifecycleStatus.callToAction}</p>
                          )}
                        </div>
                      </div>
                      <Badge className={accountLifecycleStatus.badgeClass} data-testid="badge-account-status">
                        {(() => {
                          const StatusIcon = accountLifecycleStatus.icon;
                          return <StatusIcon className="w-3 h-3 mr-1" />;
                        })()}
                        {accountLifecycleStatus.label}
                      </Badge>
                    </div>

                    <div className="flex items-start justify-between p-4 bg-white/5 rounded-lg border border-white/10" data-testid="card-member-since">
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-orange-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-slate-400">Member Since</p>
                          <p className="text-white font-medium" data-testid="text-member-since">
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              : "Recently joined"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Portfolio Summary */}
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
                <div className="p-6">
                  <div className="mb-4">
                    <h2 className="text-white text-xl font-semibold flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                      Portfolio Summary
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      Your investment overview
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10" data-testid="card-total-invested">
                      <p className="text-sm text-slate-400 mb-1">Total Invested</p>
                      <p className="text-2xl font-bold text-white" data-testid="text-total-invested">
                        ₦{stats?.totalInvested?.toLocaleString() || "0"}
                      </p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10" data-testid="card-tokens-owned">
                      <p className="text-sm text-slate-400 mb-1">Tokens Owned</p>
                      <p className="text-2xl font-bold text-white" data-testid="text-tokens-owned">
                        {stats?.totalTokensOwned?.toLocaleString() || "0"}
                      </p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10" data-testid="card-active-projects">
                      <p className="text-sm text-slate-400 mb-1">Active Projects</p>
                      <p className="text-2xl font-bold text-white" data-testid="text-active-projects">
                        {stats?.activeProjectsCount || "0"}
                      </p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10" data-testid="card-total-cashflow">
                      <p className="text-sm text-slate-400 mb-1">Total Cashflow</p>
                      <p className="text-2xl font-bold text-emerald-400" data-testid="text-total-cashflow">
                        ₦{stats?.totalCashflowReceived?.toLocaleString() || "0"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Wallet Balances */}
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-white text-xl font-semibold flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-yellow-400" />
                        Wallet Balances
                      </h2>
                      <p className="text-slate-400 text-sm mt-1">
                        Your multi-currency Stellar wallet
                      </p>
                    </div>
                    {walletData?.activationStatus && (
                      <Badge
                        className={
                          walletData.activated
                            ? "bg-emerald-600 text-white"
                            : walletData.activationStatus === "pending"
                            ? "bg-orange-500 text-white"
                            : "bg-slate-600 text-white"
                        }
                        data-testid="badge-wallet-status"
                      >
                        {walletData.activated ? "Active" : walletData.activationStatus === "pending" ? "Funding Pending" : "Not Activated"}
                      </Badge>
                    )}
                  </div>

                  {!walletData?.activated && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4" data-testid="alert-wallet-not-activated">
                      <p className="text-sm text-blue-300 mb-2">
                        <AlertCircle className="w-4 h-4 inline mr-2" />
                        Your Stellar wallet will be automatically activated when you make your first deposit
                      </p>
                      <p className="text-xs text-slate-400">
                        Complete KYC verification, then deposit funds to activate your wallet and start investing in projects
                      </p>
                    </div>
                  )}
                  
                  {/* Wallet Address */}
                  <div className="p-4 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/20 rounded-lg" data-testid="card-wallet-address">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-blue-300">Your Stellar Wallet Address</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => walletData?.publicKey && copyToClipboard(walletData.publicKey)}
                        className="h-7 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        data-testid="button-copy-address"
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
                    <p className="text-xs font-mono text-slate-300 break-all bg-black/20 p-2 rounded border border-white/5" data-testid="text-public-key">
                      {walletData?.publicKey || "Loading..."}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDepositDialogOpen(true)}
                      className="w-full mt-3 border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                      data-testid="button-deposit-instructions"
                    >
                      <Download className="w-3 h-3 mr-2" />
                      How to Deposit Funds
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10" data-testid="balance-xlm">
                      <p className="text-xs text-slate-400">XLM</p>
                      <p className="text-lg font-semibold text-white">
                        {parseFloat(walletData?.balances?.xlm || "0").toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10" data-testid="balance-usdc">
                      <p className="text-xs text-slate-400">USDC</p>
                      <p className="text-lg font-semibold text-white">
                        {parseFloat(walletData?.balances?.usdc || "0").toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10" data-testid="balance-ngnts">
                      <p className="text-xs text-slate-400">NGNTS</p>
                      <p className="text-lg font-semibold text-white">
                        {parseFloat(walletData?.balances?.ngnts || "0").toFixed(0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* KYC Information */}
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
                <div className="p-6 space-y-4">
                  <div className="mb-4">
                    <h2 className="text-white text-xl font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-400" />
                      KYC Verification
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      Identity verification for compliance
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10" data-testid="card-kyc-status">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Verification Status</p>
                      {getKycStatusBadge(kycData?.kycStatus || "not_submitted")}
                    </div>
                    {kycData?.kycStatus !== "approved" && (
                      <Button
                        onClick={() => navigate("/kyc")}
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid="button-kyc-action"
                      >
                        {kycData?.kycStatus === "pending" ? "View Status" : "Complete KYC"}
                      </Button>
                    )}
                  </div>

                  {kycData?.kycStatus === "pending" && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4" data-testid="alert-kyc-pending">
                      <p className="text-sm text-blue-300">
                        <Clock className="w-4 h-4 inline mr-2" />
                        Your KYC documents are being reviewed by our compliance team. This
                        typically takes 1-2 business days.
                      </p>
                    </div>
                  )}

                  {kycData?.kycStatus === "rejected" && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4" data-testid="alert-kyc-rejected">
                      <p className="text-sm text-red-300">
                        <XCircle className="w-4 h-4 inline mr-2" />
                        Your KYC submission was rejected. Please review the feedback and
                        resubmit with updated documents.
                      </p>
                      {/* Rejection reason not available in /api/users/kyc-status response */}
                    </div>
                  )}

                  {kycData?.kycStatus === "approved" && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4" data-testid="alert-kyc-approved">
                      <p className="text-sm text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 inline mr-2" />
                        Your identity has been verified. You have full access to all platform features.
                      </p>
                    </div>
                  )}

                  {!kycData?.kycStatus && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4" data-testid="alert-kyc-not-submitted">
                      <p className="text-sm text-orange-300">
                        <AlertCircle className="w-4 h-4 inline mr-2" />
                        Complete KYC verification to unlock token purchasing and full platform access.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Bank Deposit History */}
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
                <div className="p-6">
                  <div className="mb-4">
                    <h2 className="text-white text-xl font-semibold flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-400" />
                      Bank Deposit History
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      Track your NGN deposit requests and NGNTS credits
                    </p>
                  </div>

                  {depositHistory?.deposits && depositHistory.deposits.length > 0 ? (
                    <div className="space-y-3" data-testid="list-deposit-history">
                      {depositHistory.deposits.map((deposit) => (
                        <div
                          key={deposit.id}
                          className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-3"
                          data-testid={`deposit-${deposit.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs font-mono text-blue-300" data-testid={`ref-${deposit.id}`}>
                                  {deposit.referenceCode}
                                </p>
                                {deposit.status === "pending" && (
                                  <Badge variant="secondary" className="text-orange-400 border-orange-400" data-testid={`status-${deposit.id}`}>
                                    <Clock className="w-3 h-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                                {deposit.status === "approved" && (
                                  <Badge className="bg-emerald-600 text-white" data-testid={`status-${deposit.id}`}>
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Approved
                                  </Badge>
                                )}
                                {deposit.status === "rejected" && (
                                  <Badge variant="destructive" data-testid={`status-${deposit.id}`}>
                                    <XCircle className="w-3 h-3 mr-1" />
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
                              <p className="text-lg font-semibold text-white" data-testid={`amount-${deposit.id}`}>
                                ₦{parseFloat(deposit.amountNGN).toLocaleString()}
                              </p>
                              {deposit.status === "approved" && (
                                <p className="text-xs text-emerald-400">
                                  +{parseFloat(deposit.ngntsAmount).toLocaleString()} NGNTS
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Fee breakdown */}
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="bg-black/20 p-2 rounded">
                              <p className="text-slate-500">Platform Fee</p>
                              <p className="text-slate-300">₦{parseFloat(deposit.platformFee).toFixed(2)}</p>
                            </div>
                            <div className="bg-black/20 p-2 rounded">
                              <p className="text-slate-500">Gas Fee</p>
                              <p className="text-slate-300">₦{parseFloat(deposit.gasFee).toFixed(2)}</p>
                            </div>
                            <div className="bg-black/20 p-2 rounded">
                              <p className="text-slate-500">Net NGNTS</p>
                              <p className="text-emerald-400">{parseFloat(deposit.ngntsAmount).toLocaleString()}</p>
                            </div>
                          </div>

                          {/* Additional info */}
                          {deposit.notes && (
                            <div className="text-xs text-slate-400 bg-black/20 p-2 rounded" data-testid={`notes-${deposit.id}`}>
                              <p className="text-slate-500 mb-1">Notes:</p>
                              {deposit.notes}
                            </div>
                          )}

                          {deposit.rejectedReason && (
                            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded" data-testid={`rejection-${deposit.id}`}>
                              <p className="text-red-300 mb-1">Rejection Reason:</p>
                              {deposit.rejectedReason}
                            </div>
                          )}

                          {deposit.txHash && (
                            <div className="flex items-center gap-2 text-xs">
                              <a
                                href={`https://stellar.expert/explorer/${
                                  import.meta.env.VITE_STELLAR_HORIZON_URL?.includes("testnet") ? "testnet" : "public"
                                }/tx/${deposit.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                                data-testid={`tx-link-${deposit.id}`}
                              >
                                <ExternalLink className="w-3 h-3" />
                                View Transaction
                              </a>
                            </div>
                          )}

                          {deposit.approvedAt && (
                            <p className="text-xs text-slate-500">
                              Approved on {new Date(deposit.approvedAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8" data-testid="empty-deposit-history">
                      <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">No deposit history yet</p>
                      <p className="text-slate-500 text-xs mt-1">
                        Your bank deposit requests will appear here
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
                <div className="p-6 space-y-3">
                  <h2 className="text-white text-xl font-semibold mb-4">Quick Actions</h2>
                  
                  {/* KYC Not Approved - Show warning banner */}
                  {!accountLifecycleStatus.canDeposit && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-3" data-testid="alert-kyc-required">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-orange-300">KYC Verification Required</p>
                          <p className="text-xs text-orange-200/80 mt-1">
                            Complete your KYC to unlock deposits and project investments
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button
                    onClick={() => navigate("/regenerator-dashboard")}
                    variant={accountLifecycleStatus.label === "Active" ? "default" : "outline"}
                    className={accountLifecycleStatus.label === "Active" ? "w-full bg-blue-600 hover:bg-blue-700" : "w-full border-white/10 text-white hover:bg-white/5"}
                    data-testid="button-go-to-dashboard"
                  >
                    View Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/portfolio")}
                    className="w-full border-white/10 text-white hover:bg-white/5"
                    data-testid="button-go-to-portfolio"
                  >
                    View Portfolio
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/projects")}
                    className="w-full border-white/10 text-white hover:bg-white/5"
                    data-testid="button-browse-projects"
                  >
                    Browse Projects
                  </Button>
                  
                  {/* Complete KYC Button - Primary when KYC not approved */}
                  <Button
                    onClick={() => navigate("/kyc")}
                    variant={!accountLifecycleStatus.canDeposit ? "default" : "outline"}
                    className={
                      !accountLifecycleStatus.canDeposit
                        ? "w-full bg-orange-600 hover:bg-orange-700"
                        : "w-full border-white/10 text-white hover:bg-white/5"
                    }
                    data-testid="button-go-to-kyc"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {kycData?.kycStatus === "approved" ? "View KYC" : "Complete KYC"}
                  </Button>
                  
                  {/* Deposit Funds Button - Disabled when KYC not approved */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      onClick={() => accountLifecycleStatus.canDeposit && setDepositDialogOpen(true)}
                      disabled={!accountLifecycleStatus.canDeposit}
                      className={
                        accountLifecycleStatus.canDeposit
                          ? "w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          : "w-full border-slate-700 text-slate-500 cursor-not-allowed"
                      }
                      data-testid="button-deposit-funds"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Deposit Funds
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
                <div className="p-6 space-y-3">
                  <h2 className="text-white text-sm font-semibold mb-4" data-testid="text-benefits-title">
                    Platform Benefits
                  </h2>
                  <div className="flex items-start gap-2" data-testid="benefit-tokenized-projects">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-300">
                      Access tokenized agricultural projects
                    </p>
                  </div>
                  <div className="flex items-start gap-2" data-testid="benefit-cashflow">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-300">
                      Receive regular cashflow distributions
                    </p>
                  </div>
                  <div className="flex items-start gap-2" data-testid="benefit-marketplace">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-300">
                      Trade tokens on secondary marketplace
                    </p>
                  </div>
                  <div className="flex items-start gap-2" data-testid="benefit-transparency">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-300">
                      Full blockchain transparency
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Deposit Funds Dialog */}
      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-deposit-funds">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Wallet className="w-6 h-6 text-emerald-400" />
              How to Deposit Funds
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
            {/* Wallet Address */}
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
              <p className="text-xs font-mono text-slate-300 break-all bg-black/20 p-3 rounded border border-white/5">
                {walletData?.publicKey || "Loading..."}
              </p>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Deposit Options</h3>
              
              {/* Option 1: External Wallet */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-500/20 p-2 rounded-lg">
                    <Wallet className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">From External Stellar Wallet</h4>
                    <p className="text-sm text-slate-400 mb-3">
                      Send XLM, USDC, or NGNTS from any Stellar wallet (Lobstr, Freighter, etc.)
                    </p>
                    <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                      <li>Copy your wallet address above</li>
                      <li>Open your external Stellar wallet app</li>
                      <li>Select "Send" or "Transfer"</li>
                      <li>Paste your SEEDx wallet address</li>
                      <li>Enter amount and confirm transaction</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Option 2: Exchange */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                    <ExternalLink className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">From Cryptocurrency Exchange</h4>
                    <p className="text-sm text-slate-400 mb-3">
                      Withdraw directly from exchanges like Binance, Coinbase, or Kraken
                    </p>
                    <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                      <li>Log into your exchange account</li>
                      <li>Go to "Withdraw" or "Send"</li>
                      <li>Select XLM, USDC, or NGNTS</li>
                      <li>Choose "Stellar Network" as the network</li>
                      <li>Paste your SEEDx wallet address</li>
                      <li>Enter amount and confirm withdrawal</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-orange-300">Important Notes:</p>
                    <ul className="text-sm text-orange-200 space-y-1 list-disc list-inside">
                      <li>Always use the <strong>Stellar network</strong> when sending assets</li>
                      <li>Minimum 1 XLM balance required for wallet activation</li>
                      <li>Deposits typically appear within 5-10 seconds</li>
                      <li>Double-check the address before sending</li>
                      <li>NGNTS tokens must be acquired from the platform after depositing XLM or USDC</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Crypto Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => walletData?.publicKey && copyToClipboard(walletData.publicKey)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                data-testid="button-copy-and-close"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Address
              </Button>
              <Button
                variant="outline"
                onClick={() => setDepositDialogOpen(false)}
                className="flex-1 border-white/10 text-white hover:bg-white/5"
                data-testid="button-close-dialog"
              >
                Close
              </Button>
            </div>
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

                    {/* Fee Breakdown */}
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

                  {/* Reference Code Display */}
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

                  {/* Bank Account Details - Enhanced Visibility */}
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

                  {/* Fee Breakdown & Amount You'll Receive */}
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
                              -₦{wizardFeeBreakdown.gasFeeNGN.toLocaleString('en-NG', {minimumFractionDigits: 2})}
                            </p>
                          </div>
                          
                          {wizardFeeBreakdown.walletActivationFee > 0 && (
                            <div className="flex justify-between items-center">
                              <p className="text-sm text-slate-300">Wallet Activation Fee (one-time)</p>
                              <p className="text-sm font-semibold text-red-300">
                                -₦{wizardFeeBreakdown.walletActivationFee.toLocaleString('en-NG', {minimumFractionDigits: 2})}
                              </p>
                            </div>
                          )}
                          
                          <div className="border-t border-white/20 pt-3 mt-3">
                            <div className="flex justify-between items-center">
                              <p className="text-base font-semibold text-white">Total Fees</p>
                              <p className="text-base font-bold text-red-300">
                                -₦{wizardFeeBreakdown.totalFeesNGN.toLocaleString('en-NG', {minimumFractionDigits: 2})}
                              </p>
                            </div>
                          </div>
                          
                          <div className="bg-emerald-600/20 border-2 border-emerald-500/50 rounded-lg p-4 mt-4">
                            <div className="flex justify-between items-center">
                              <p className="text-base font-bold text-emerald-200">You Will Receive</p>
                              <p className="text-2xl font-bold text-emerald-300">
                                {wizardFeeBreakdown.ngntsAmount.toLocaleString('en-NG', {minimumFractionDigits: 2})} NGNTS
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-orange-300">Important:</p>
                        <ul className="text-sm text-orange-200 space-y-1 list-disc list-inside">
                          <li>Use the reference code above when making your transfer</li>
                          <li>Transfer the exact amount shown</li>
                          <li>Save your transaction receipt for the next step</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => setCurrentStep(3)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      I've Made the Transfer - Continue
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

              {/* Step 3: Upload Proof */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Step 3: Upload Proof of Payment</h3>
                    <p className="text-sm text-slate-400">Upload your bank transfer receipt or screenshot</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proof-upload" className="text-slate-300">
                      Proof of Payment *
                    </Label>
                    <div
                      className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                      onClick={() => document.getElementById("proof-upload")?.click()}
                    >
                      {depositProof ? (
                        <div className="space-y-3">
                          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                          <div>
                            <p className="text-sm font-semibold text-white">{depositProof.name}</p>
                            <p className="text-xs text-slate-400">
                              {(depositProof.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDepositProof(null);
                            }}
                            className="border-white/10 text-white hover:bg-white/5"
                          >
                            Remove File
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Upload className="w-12 h-12 text-slate-400 mx-auto" />
                          <div>
                            <p className="text-sm font-semibold text-white">Click to upload or drag and drop</p>
                            <p className="text-xs text-slate-400">PNG, JPG, PDF up to 5MB</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <Input
                      id="proof-upload"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setDepositProof(e.target.files?.[0] || null)}
                      className="hidden"
                      data-testid="input-proof-upload"
                    />
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-blue-300 mb-1">Upload Tips:</p>
                        <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                          <li>Ensure all transfer details are clearly visible</li>
                          <li>Include transaction reference and amount</li>
                          <li>Good lighting if taking a photo</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleStep3Submit}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={uploadProofMutation.isPending || !depositProof}
                      data-testid="button-submit-proof"
                    >
                      {uploadProofMutation.isPending ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Submit Proof
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(2)}
                      className="border-white/10 text-white hover:bg-white/5"
                    >
                      Back
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Success Modal */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="text-center space-y-4 py-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600/20 rounded-full">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">Deposit Request Submitted!</h3>
                      <p className="text-slate-400">
                        Your deposit request has been received and is pending admin approval.
                      </p>
                    </div>
                  </div>

                  {/* Reference Code */}
                  <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-500/20">
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-emerald-300">Your Reference Code</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(depositReference, "reference")}
                          className="h-7 text-emerald-400 hover:bg-emerald-500/10"
                          data-testid="button-copy-reference"
                        >
                          {copiedReference ? (
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
                      <div className="bg-black/40 p-4 rounded-lg border border-white/10">
                        <p className="text-2xl font-mono font-bold text-white text-center" data-testid="text-reference-code">
                          {depositReference}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400 text-center">
                        Save this reference code for tracking your deposit
                      </p>
                    </CardContent>
                  </Card>

                  {/* Next Steps */}
                  <Card className="bg-blue-500/10 border-blue-500/20">
                    <CardContent className="p-6">
                      <p className="text-sm font-semibold text-blue-300 mb-3">What Happens Next:</p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="bg-blue-500/20 text-blue-400 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                            1
                          </div>
                          <p className="text-sm text-slate-300">Admin will review your deposit proof</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="bg-blue-500/20 text-blue-400 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                            2
                          </div>
                          <p className="text-sm text-slate-300">You'll receive an email notification once approved</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="bg-blue-500/20 text-blue-400 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                            3
                          </div>
                          <p className="text-sm text-slate-300">NGNTS tokens will be credited to your wallet automatically</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleCloseWizard}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      data-testid="button-done"
                    >
                      Done
                    </Button>
                    <Button
                      variant="outline"
                      onClick={resetDepositWizard}
                      className="flex-1 border-white/10 text-white hover:bg-white/5"
                      data-testid="button-new-deposit"
                    >
                      New Deposit
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
