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
  
  // Bank deposit form state
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNotes, setDepositNotes] = useState("");
  const [depositProof, setDepositProof] = useState<File | null>(null);
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [depositReference, setDepositReference] = useState("");
  const [feePreview, setFeePreview] = useState<BankDepositFeePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const { data: kycData } = useQuery<{
    status: string;
    rejectionReason?: string;
  }>({
    queryKey: ["/api/users/me/kyc"],
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

  // Deposit submission mutation
  const depositMutation = useMutation({
    mutationFn: async () => {
      if (!depositProof) throw new Error("Proof of payment is required");
      
      const formData = new FormData();
      formData.append("amountNGN", depositAmount);
      if (depositNotes) formData.append("notes", depositNotes);
      formData.append("proof", depositProof);

      const response = await fetch("/api/regenerator/bank-deposits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit deposit request");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setDepositReference(data.deposit.referenceCode);
      setDepositSuccess(true);
      toast({
        title: "Deposit Request Submitted",
        description: `Reference code: ${data.deposit.referenceCode}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/regenerator/wallet/balances"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || !depositProof) {
      toast({
        title: "Missing Information",
        description: "Please enter amount and upload proof of payment",
        variant: "destructive",
      });
      return;
    }
    depositMutation.mutate();
  };

  const resetDepositForm = () => {
    setDepositAmount("");
    setDepositNotes("");
    setDepositProof(null);
    setDepositSuccess(false);
    setDepositReference("");
    setFeePreview(null);
    setPreviewError(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(true);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy address. Please try again.",
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
                          <p className="text-sm text-slate-400">Account Type</p>
                          <p className="text-white font-medium" data-testid="text-account-type">
                            Regenerator (Token Participant)
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-blue-600 text-white" data-testid="badge-account-status">
                        Active
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
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4" data-testid="alert-wallet-not-activated">
                      <p className="text-sm text-orange-300 mb-3">
                        <AlertCircle className="w-4 h-4 inline mr-2" />
                        Your Stellar wallet needs activation funding. Request funding from admin to enable blockchain transactions.
                      </p>
                      {walletData?.activationStatus !== "pending" && (
                        <Button
                          onClick={() => navigate("/wallet-funding-request")}
                          className="bg-orange-600 hover:bg-orange-700 w-full"
                          data-testid="button-request-funding"
                        >
                          Request Wallet Funding
                        </Button>
                      )}
                      {walletData?.activationStatus === "pending" && (
                        <p className="text-xs text-slate-400">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Funding request submitted. Awaiting admin approval.
                        </p>
                      )}
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
                      {getKycStatusBadge(kycData?.status || "not_submitted")}
                    </div>
                    {kycData?.status !== "approved" && (
                      <Button
                        onClick={() => navigate("/kyc")}
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid="button-kyc-action"
                      >
                        {kycData?.status === "pending" ? "View Status" : "Complete KYC"}
                      </Button>
                    )}
                  </div>

                  {kycData?.status === "pending" && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4" data-testid="alert-kyc-pending">
                      <p className="text-sm text-blue-300">
                        <Clock className="w-4 h-4 inline mr-2" />
                        Your KYC documents are being reviewed by our compliance team. This
                        typically takes 1-2 business days.
                      </p>
                    </div>
                  )}

                  {kycData?.status === "rejected" && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4" data-testid="alert-kyc-rejected">
                      <p className="text-sm text-red-300">
                        <XCircle className="w-4 h-4 inline mr-2" />
                        Your KYC submission was rejected. Please review the feedback and
                        resubmit with updated documents.
                      </p>
                      {kycData?.rejectionReason && (
                        <p className="text-sm text-slate-400 mt-2" data-testid="text-rejection-reason">
                          Reason: {kycData.rejectionReason}
                        </p>
                      )}
                    </div>
                  )}

                  {kycData?.status === "approved" && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4" data-testid="alert-kyc-approved">
                      <p className="text-sm text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 inline mr-2" />
                        Your identity has been verified. You have full access to all platform features.
                      </p>
                    </div>
                  )}

                  {!kycData?.status && (
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
                  <Button
                    onClick={() => navigate("/regenerator-dashboard")}
                    className="w-full bg-blue-600 hover:bg-blue-700"
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
                  <Button
                    variant="outline"
                    onClick={() => navigate("/kyc")}
                    className="w-full border-white/10 text-white hover:bg-white/5"
                    data-testid="button-go-to-kyc"
                  >
                    {kycData?.status === "approved" ? "View KYC" : "Complete KYC"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDepositDialogOpen(true)}
                    className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    data-testid="button-deposit-funds"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Deposit Funds
                  </Button>
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
              {/* Bank Account Details */}
              <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  <p className="text-sm font-medium text-blue-300">Transfer Funds to SEEDx</p>
                </div>
                
                {bankAccountsLoading ? (
                  <div className="text-center py-6">
                    <div className="animate-pulse space-y-3 bg-black/20 p-4 rounded border border-white/5">
                      <div className="h-4 bg-white/10 rounded w-1/4"></div>
                      <div className="h-4 bg-white/10 rounded w-2/3"></div>
                    </div>
                  </div>
                ) : activeAccount ? (
                  <div className="space-y-3 bg-black/20 p-4 rounded border border-white/5" data-testid="bank-account-details">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Account Title</p>
                      <p className="text-sm font-semibold text-white" data-testid="text-account-title">{activeAccount.title}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Company Name</p>
                      <p className="text-sm font-semibold text-white" data-testid="text-company-name">{activeAccount.companyName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Bank Name</p>
                      <p className="text-sm font-semibold text-white" data-testid="text-bank-name">{activeAccount.bankName}</p>
                    </div>
                    <div className="relative">
                      <p className="text-xs text-slate-400 mb-1">Account Number</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono font-semibold text-white flex-1" data-testid="text-account-number">
                          {activeAccount.accountNumber}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(activeAccount.accountNumber);
                            toast({ title: "Copied!", description: "Account number copied to clipboard" });
                          }}
                          className="h-7 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          data-testid="button-copy-account-number"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-destructive/10 border border-destructive/20 rounded p-4">
                    <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
                    <p className="text-sm font-semibold text-destructive mb-1">Bank Transfers Temporarily Unavailable</p>
                    <p className="text-xs text-destructive/80">Please contact support or try crypto deposit instead.</p>
                  </div>
                )}
              </div>

              {/* Paystack-Style Instructions */}
              {activeAccount && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">How to Complete Your Deposit</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Step 1 */}
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-blue-500/20 text-blue-400 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                          1
                        </div>
                        <h4 className="font-semibold text-white text-sm">Transfer Funds</h4>
                      </div>
                      <p className="text-xs text-slate-400">
                        Use your mobile banking app or visit your bank to transfer NGN to the account details above
                      </p>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-emerald-500/20 text-emerald-400 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                          2
                        </div>
                        <h4 className="font-semibold text-white text-sm">Upload Proof</h4>
                      </div>
                      <p className="text-xs text-slate-400">
                        Take a screenshot or download PDF of your transfer receipt and upload it below
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-purple-500/20 text-purple-400 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                          3
                        </div>
                        <h4 className="font-semibold text-white text-sm">Get NGNTS</h4>
                      </div>
                      <p className="text-xs text-slate-400">
                        After admin approval (1-2 days), receive NGNTS tokens in your wallet
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Deposit Request Form or Success Message */}
              {!depositSuccess ? (
                <form onSubmit={handleDepositSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Request Bank Deposit</h3>
                    
                    {/* Amount Input */}
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
                        required
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
                            <span className="font-semibold text-white" data-testid="text-deposit-amount">
                              ₦{feePreview.amountNGN.toLocaleString('en-NG', {minimumFractionDigits: 2})}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Platform Fee ({feePreview.platformFeePercent}%):</span>
                            <span className="text-orange-300" data-testid="text-platform-fee">
                              -₦{feePreview.platformFee.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Gas Fee ({feePreview.gasFeeXLM} XLM):</span>
                            <span className="text-orange-300" data-testid="text-gas-fee">
                              -₦{feePreview.gasFeeNGN.toFixed(2)}
                            </span>
                          </div>
                          {feePreview.needsWalletActivation && feePreview.walletActivationFee > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-400 flex items-center gap-1">
                                Wallet Activation (one-time):
                                <AlertCircle className="w-3 h-3" />
                              </span>
                              <span className="text-orange-300" data-testid="text-wallet-activation-fee">
                                -₦{feePreview.walletActivationFee.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <Separator className="bg-white/10" />
                          <div className="flex justify-between text-base font-semibold">
                            <span className="text-emerald-300">You will receive:</span>
                            <span className="text-emerald-400" data-testid="text-ngnts-amount">
                              {feePreview.ngntsAmount.toFixed(2)} NGNTS
                            </span>
                          </div>
                          {feePreview.needsWalletActivation && (
                            <p className="text-xs text-blue-300 mt-2">
                              ℹ️ Wallet activation fee is a one-time charge to set up your Stellar account. Future deposits won't include this fee.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Proof Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="deposit-proof" className="text-slate-300">
                        Proof of Payment *
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="deposit-proof"
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => setDepositProof(e.target.files?.[0] || null)}
                          className="bg-white/5 border-white/10 text-white"
                          data-testid="input-deposit-proof"
                          required
                        />
                        {depositProof && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400">Upload a screenshot or PDF of your bank transfer confirmation (max 5MB)</p>
                    </div>

                    {/* Optional Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="deposit-notes" className="text-slate-300">
                        Notes (Optional)
                      </Label>
                      <Textarea
                        id="deposit-notes"
                        placeholder="Add any additional information about this deposit..."
                        value={depositNotes}
                        onChange={(e) => setDepositNotes(e.target.value)}
                        className="bg-white/5 border-white/10 text-white min-h-20"
                        data-testid="input-deposit-notes"
                      />
                    </div>
                  </div>

                  {/* Important Notes */}
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-orange-300">Important:</p>
                        <ul className="text-sm text-orange-200 space-y-1 list-disc list-inside">
                          <li>Make sure you've transferred the exact amount to the bank account above</li>
                          <li>Upload clear proof of payment (screenshot or PDF)</li>
                          <li>Admin approval required - typically 1-2 business days</li>
                          <li>You'll receive a unique reference code after submission</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={depositMutation.isPending || !depositAmount || !depositProof || !feePreview || !!previewError}
                      data-testid="button-submit-deposit"
                    >
                      {depositMutation.isPending ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Submit Deposit Request
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDepositDialogOpen(false)}
                      className="border-white/10 text-white hover:bg-white/5"
                      data-testid="button-cancel-deposit"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                /* Success Confirmation */
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
                  <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-emerald-300">Your Reference Code</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(depositReference)}
                        className="h-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        data-testid="button-copy-reference"
                      >
                        {copiedAddress ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                    <p className="text-lg font-mono font-bold text-white bg-black/20 p-3 rounded border border-white/5">
                      {depositReference}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Save this reference code for tracking your deposit
                    </p>
                  </div>

                  {/* Next Steps */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-300 mb-2">Next Steps:</p>
                    <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
                      <li>Wait for admin to review your deposit proof</li>
                      <li>You'll receive an email notification once approved</li>
                      <li>NGNTS will be credited to your wallet automatically</li>
                    </ol>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        resetDepositForm();
                        setDepositDialogOpen(false);
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      data-testid="button-done"
                    >
                      Done
                    </Button>
                    <Button
                      variant="outline"
                      onClick={resetDepositForm}
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
