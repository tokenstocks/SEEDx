import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import RegeneratorHeader from "@/components/RegeneratorHeader";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function RegeneratorProfile() {
  const [, navigate] = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const prefersReducedMotion = useReducedMotion();
  const { toast } = useToast();
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const { data: kycData } = useQuery<{
    status: string;
    rejectionReason?: string;
  }>({
    queryKey: ["/api/users/me/kyc"],
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
  });

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
      <RegeneratorHeader />

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
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl" data-testid="dialog-deposit-funds">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Wallet className="w-6 h-6 text-emerald-400" />
              How to Deposit Funds
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Fund your Stellar wallet to start participating in tokenized agricultural projects
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
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

            {/* Action Buttons */}
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
