import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FileText,
  Eye,
  Lock,
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
    refetchInterval: 30000,
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
    refetchInterval: 60000,
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

  // All deposit history (sorted by date, newest first)
  const allDeposits = useMemo(() => {
    if (!depositHistory?.deposits) return [];
    return [...depositHistory.deposits].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [depositHistory]);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 border-orange-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
      case "completed":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="bg-red-500/10 text-red-400 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <UnifiedHeader />

        <div className="container mx-auto p-4 md:p-6 space-y-6">
          {/* Simplified Page Header */}
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white" data-testid="text-page-title">
                  Account Settings
                </h1>
                <p className="text-slate-400 mt-1">
                  Manage your account, wallet, and security settings
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

          {/* Tabbed Content */}
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Tabs defaultValue="account" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10">
                <TabsTrigger 
                  value="account" 
                  className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                  data-testid="tab-account"
                >
                  <User className="w-4 h-4 mr-2" />
                  Account
                </TabsTrigger>
                <TabsTrigger 
                  value="wallet" 
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                  data-testid="tab-wallet"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Wallet
                </TabsTrigger>
              </TabsList>

              {/* Account Tab */}
              <TabsContent value="account" className="space-y-6 mt-6">
                {/* Account Information Card */}
                <Card className="bg-white/5 backdrop-blur-md border-white/10">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500/60 via-pink-500/60 to-purple-500/60" />
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-purple-400" />
                      Account Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-blue-400" />
                          <Label className="text-slate-400 text-sm">Email Address</Label>
                        </div>
                        <p className="text-white font-medium" data-testid="text-user-email">
                          {user.email || "Not available"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-orange-400" />
                          <Label className="text-slate-400 text-sm">Member Since</Label>
                        </div>
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
                  </CardContent>
                </Card>

                {/* KYC Status Card */}
                <Card className="bg-white/5 backdrop-blur-md border-white/10">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-400" />
                      KYC Verification Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-sm mb-1">Current Status</p>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(kycData?.kycStatus || "pending")}
                          <p className="text-white text-sm">
                            {accountLifecycleStatus.callToAction}
                          </p>
                        </div>
                      </div>
                      {kycData?.kycStatus !== "approved" && (
                        <Button
                          onClick={() => navigate("/kyc")}
                          className="bg-emerald-600 hover:bg-emerald-700"
                          data-testid="button-complete-kyc"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          {kycData?.kycStatus === "rejected" ? "Resubmit KYC" : "Complete KYC"}
                        </Button>
                      )}
                    </div>

                    {kycData?.kycStatus === "approved" && kycData?.kycDocuments && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 space-y-3">
                        <p className="text-sm font-medium text-emerald-300 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Verified Documents
                        </p>
                        <div className="space-y-2">
                          {Object.entries(kycData.kycDocuments).map(([key, url]) => (
                            <div key={key} className="flex items-center justify-between bg-black/20 p-2 rounded">
                              <span className="text-white text-sm capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(url as string, '_blank')}
                                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                data-testid={`button-view-${key}`}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {kycData?.kycStatus === "rejected" && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <p className="text-sm font-medium text-red-300 mb-2">Rejection Reason:</p>
                        <p className="text-sm text-red-200">
                          Your KYC documents require resubmission. Please check the provided feedback and upload corrected documents.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Security Settings Placeholder */}
                <Card className="bg-white/5 backdrop-blur-md border-white/10">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/60 via-indigo-500/60 to-blue-500/60" />
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Lock className="w-5 h-5 text-blue-400" />
                      Security Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 text-center">
                      <Lock className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                      <p className="text-white font-medium mb-2">Coming Soon</p>
                      <p className="text-slate-400 text-sm">
                        Two-factor authentication, password management, and additional security features will be available here.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Wallet Tab */}
              <TabsContent value="wallet" className="space-y-6 mt-6">
                {/* Wallet Details Card */}
                <Card className="bg-white/5 backdrop-blur-md border-white/10">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-emerald-400" />
                        Stellar Wallet Details
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={
                            walletData?.activated 
                              ? "border-emerald-400/30 text-emerald-400"
                              : "border-orange-400/30 text-orange-400"
                          }
                          data-testid="badge-wallet-status"
                        >
                          {walletData?.activated ? "Activated" : "Not Activated"}
                        </Badge>
                        <span className="text-xs text-slate-400">Updated {lastUpdated}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Wallet Address */}
                    <div className="space-y-2">
                      <Label className="text-slate-400 text-sm">Wallet Address</Label>
                      <div className="bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-blue-300">Public Key</p>
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
                        <p className="text-sm font-mono text-slate-300 break-all bg-black/20 p-3 rounded border border-white/5" data-testid="text-public-key">
                          {walletData?.publicKey || "Loading..."}
                        </p>
                      </div>
                    </div>

                    {/* Balances */}
                    <div className="space-y-2">
                      <Label className="text-slate-400 text-sm">Current Balances</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* NGNTS */}
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                              <span className="text-emerald-400 font-bold text-xs">N</span>
                            </div>
                            <div>
                              <p className="text-xs text-emerald-300">NGNTS</p>
                              <p className="text-xs text-slate-400">Nigerian Naira Token</p>
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-white" data-testid="text-balance-ngnts">
                            {parseFloat(walletData?.balances?.ngnts || "0").toLocaleString('en-NG', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </p>
                        </div>

                        {/* USDC */}
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                              <span className="text-blue-400 font-bold text-xs">U</span>
                            </div>
                            <div>
                              <p className="text-xs text-blue-300">USDC</p>
                              <p className="text-xs text-slate-400">USD Coin</p>
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-white" data-testid="text-balance-usdc">
                            {parseFloat(walletData?.balances?.usdc || "0").toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </p>
                        </div>

                        {/* XLM (Gas) */}
                        <div className="bg-slate-600/10 border border-slate-500/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Fuel className="w-5 h-5 text-slate-400" />
                            <div>
                              <p className="text-xs text-slate-300">XLM (Gas)</p>
                              <p className="text-xs text-slate-500">Network Fees</p>
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-white" data-testid="text-balance-xlm">
                            {parseFloat(walletData?.balances?.xlm || "0").toFixed(4)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Add Capital Button */}
                    <div className="pt-4">
                      <Button
                        onClick={() => accountLifecycleStatus.canDeposit && setDepositDialogOpen(true)}
                        disabled={!accountLifecycleStatus.canDeposit}
                        className={
                          accountLifecycleStatus.canDeposit
                            ? "w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "w-full bg-slate-700 text-slate-400 cursor-not-allowed"
                        }
                        size="lg"
                        data-testid="button-add-capital"
                      >
                        <Coins className="w-5 h-5 mr-2" />
                        Add Capital to Wallet
                      </Button>
                      {!accountLifecycleStatus.canDeposit && (
                        <p className="text-xs text-orange-400 mt-2 text-center">
                          {accountLifecycleStatus.callToAction}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Full Transaction History */}
                <Card className="bg-white/5 backdrop-blur-md border-white/10">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/60 via-purple-500/60 to-blue-500/60" />
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-400" />
                      Transaction History
                      {allDeposits.length > 0 && (
                        <Badge variant="outline" className="border-blue-400/30 text-blue-400 ml-2">
                          {allDeposits.length} {allDeposits.length === 1 ? "transaction" : "transactions"}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {allDeposits.length > 0 ? (
                      <div className="space-y-3" data-testid="list-transaction-history">
                        {allDeposits.map((deposit) => (
                          <div
                            key={deposit.id}
                            className="bg-white/5 border border-white/10 rounded-lg p-4 hover-elevate"
                            data-testid={`transaction-${deposit.id}`}
                          >
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <p className="text-sm font-mono text-blue-300" data-testid={`ref-${deposit.id}`}>
                                    {deposit.referenceCode}
                                  </p>
                                  {getStatusBadge(deposit.status)}
                                </div>
                                <p className="text-xs text-slate-500">
                                  {new Date(deposit.createdAt).toLocaleString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-white" data-testid={`amount-${deposit.id}`}>
                                  ₦{parseFloat(deposit.amountNGN).toLocaleString('en-NG', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </p>
                                {(deposit.status === "approved" || deposit.status === "completed") && (
                                  <p className="text-sm text-emerald-400">
                                    +{parseFloat(deposit.ngntsAmount).toLocaleString()} NGNTS
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Fee Details */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3 bg-black/20 p-3 rounded">
                              <div>
                                <p className="text-xs text-slate-500">Platform Fee</p>
                                <p className="text-sm text-white">₦{parseFloat(deposit.platformFee).toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Gas Fee</p>
                                <p className="text-sm text-white">₦{parseFloat(deposit.gasFee).toFixed(2)}</p>
                              </div>
                              {(deposit.status === "approved" || deposit.status === "completed") && (
                                <div>
                                  <p className="text-xs text-slate-500">Received</p>
                                  <p className="text-sm text-emerald-400">{parseFloat(deposit.ngntsAmount).toFixed(2)} NGNTS</p>
                                </div>
                              )}
                            </div>

                            {/* Additional Info */}
                            <div className="flex flex-wrap items-center gap-3">
                              {deposit.txHash && (
                                <a
                                  href={`https://stellar.expert/explorer/${
                                    import.meta.env.VITE_STELLAR_HORIZON_URL?.includes("testnet") ? "testnet" : "public"
                                  }/tx/${deposit.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                                  data-testid={`tx-link-${deposit.id}`}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  View on Stellar
                                </a>
                              )}
                              {deposit.proofUrl && (
                                <a
                                  href={deposit.proofUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
                                >
                                  <FileText className="w-3 h-3" />
                                  View Proof
                                </a>
                              )}
                              {deposit.status === "rejected" && deposit.rejectedReason && (
                                <p className="text-xs text-red-400">
                                  Reason: {deposit.rejectedReason}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12" data-testid="empty-transactions">
                        <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 text-lg font-medium mb-2">No Transactions Yet</p>
                        <p className="text-slate-500 text-sm mb-6">
                          Your capital deposit history will appear here
                        </p>
                        {accountLifecycleStatus.canDeposit && (
                          <Button
                            onClick={() => setDepositDialogOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Coins className="w-4 h-4 mr-2" />
                            Make Your First Deposit
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>

        {/* Deposit Funds Dialog - Keep existing 4-step wizard */}
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
                        Your deposit request is now pending admin approval. You'll be notified once it's processed.
                      </p>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-left">
                      <h4 className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        What happens next?
                      </h4>
                      <ul className="space-y-2 text-sm text-slate-300">
                        <li className="flex gap-2">
                          <span className="text-blue-400">1.</span>
                          <span>Admin reviews your proof of payment</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-blue-400">2.</span>
                          <span>NGNTS tokens are minted to your wallet</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-blue-400">3.</span>
                          <span>Your wallet is activated (if this is your first deposit)</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-blue-400">4.</span>
                          <span>You can start participating in agricultural cooperatives</span>
                        </li>
                      </ul>
                    </div>

                    <Button
                      onClick={handleCloseWizard}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      data-testid="button-finish"
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
    </TooltipProvider>
  );
}
