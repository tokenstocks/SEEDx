import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Wallet,
  TrendingUp,
  ExternalLink,
  Copy,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Investment {
  id: string;
  userId: string;
  userEmail: string;
  projectId: string;
  projectName: string;
  amount: string;
  tokensReceived: string;
  currency: string;
  transactionId: string | null;
  createdAt: string;
  txHash: string | null;
}

interface InvestmentDetail {
  investment: {
    id: string;
    userId: string;
    userEmail: string;
    userKycStatus: string;
    userWalletAddress: string | null;
    projectId: string;
    projectName: string;
    projectTokenSymbol: string;
    amount: string;
    tokensReceived: string;
    currency: string;
    transactionId: string | null;
    createdAt: string;
    navAtPurchase: number;
    currentNav: number | null;
  };
  transaction: {
    id: string;
    reference: string;
    status: string;
    type: string;
  } | null;
}

interface InvestmentDetailDrawerProps {
  investment: Investment | null;
  open: boolean;
  onClose: () => void;
}

export function InvestmentDetailDrawer({
  investment,
  open,
  onClose,
}: InvestmentDetailDrawerProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const { data: detail } = useQuery<InvestmentDetail>({
    queryKey: investment?.id ? [`/api/admin/investments/${investment.id}`] : ["/api/admin/investments/null"],
    enabled: !!investment?.id && open,
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: string, curr: string) => {
    const num = parseFloat(amount);
    if (curr === "NGN" || curr === "NGNTS") {
      return `₦${num.toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    } else if (curr === "USDC") {
      return `$${num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    } else if (curr === "XLM") {
      return `${num.toLocaleString("en-US", {
        minimumFractionDigits: 7,
        maximumFractionDigits: 7,
      })} XLM`;
    }
    return amount;
  };

  const getKycStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      approved: {
        variant: "default",
        label: "KYC Approved",
      },
      pending: { variant: "secondary", label: "KYC Pending" },
      rejected: { variant: "destructive", label: "KYC Rejected" },
    };

    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStellarExpertLink = (txHash: string) => {
    // Use testnet for development, public for production
    const network = import.meta.env.MODE === "development" ? "testnet" : "public";
    return `https://stellar.expert/explorer/${network}/tx/${txHash}`;
  };

  const navChange = detail?.investment.currentNav && detail?.investment.navAtPurchase
    ? ((detail.investment.currentNav - detail.investment.navAtPurchase) /
        detail.investment.navAtPurchase) *
      100
    : 0;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="bg-slate-950 border-white/10 text-white w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white text-2xl">
            Investment Details
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            Comprehensive view of this Regenerator investment
          </SheetDescription>
        </SheetHeader>

        {detail ? (
          <div className="mt-6 space-y-6">
            {/* User Information */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-semibold text-white">
                  User Information
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-400">Email</p>
                  <p
                    className="text-white font-medium"
                    data-testid="text-user-email"
                  >
                    {detail.investment.userEmail}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-400">KYC Status</p>
                  <div data-testid="badge-kyc-status">
                    {getKycStatusBadge(detail.investment.userKycStatus)}
                  </div>
                </div>

                {detail.investment.userWalletAddress && (
                  <div>
                    <p className="text-sm text-slate-400">Wallet Address</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm bg-black/30 px-2 py-1 rounded flex-1 truncate">
                        {detail.investment.userWalletAddress}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(
                            detail.investment.userWalletAddress!,
                            "Wallet address"
                          )
                        }
                        data-testid="button-copy-wallet"
                      >
                        {copied === "Wallet address" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Investment Details */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-white">
                  Investment Details
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Amount Invested</p>
                  <p
                    className="text-lg font-bold text-emerald-400"
                    data-testid="text-amount"
                  >
                    {formatCurrency(
                      detail.investment.amount,
                      detail.investment.currency
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-400">Tokens Received</p>
                  <p
                    className="text-lg font-bold text-white"
                    data-testid="text-tokens"
                  >
                    {parseFloat(detail.investment.tokensReceived).toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}{" "}
                    {detail.investment.projectTokenSymbol}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-400">Currency</p>
                  <Badge variant="outline" className="border-white/20">
                    {detail.investment.currency}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm text-slate-400">Investment Date</p>
                  <p className="text-white">
                    {format(
                      new Date(detail.investment.createdAt),
                      "MMM dd, yyyy HH:mm"
                    )}
                  </p>
                </div>
              </div>

              <Separator className="my-4 bg-white/10" />

              {/* NAV Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">NAV at Purchase</p>
                  <p className="text-white font-medium">
                    {formatCurrency(
                      detail.investment.navAtPurchase.toFixed(2),
                      "NGN"
                    )}
                  </p>
                </div>

                {detail.investment.currentNav && (
                  <div>
                    <p className="text-sm text-slate-400">Current NAV</p>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">
                        {formatCurrency(
                          detail.investment.currentNav.toFixed(2),
                          "NGN"
                        )}
                      </p>
                      {navChange !== 0 && (
                        <Badge
                          variant={navChange > 0 ? "default" : "destructive"}
                          className={
                            navChange > 0 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""
                          }
                        >
                          {navChange > 0 ? "+" : ""}
                          {navChange.toFixed(2)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Project Information */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white mb-3">
                Project
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-slate-400">Project Name</p>
                  <p className="text-white font-medium" data-testid="text-project-name">
                    {detail.investment.projectName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Token Symbol</p>
                  <code className="text-sm bg-black/30 px-2 py-1 rounded">
                    {detail.investment.projectTokenSymbol}
                  </code>
                </div>
              </div>
            </div>

            {/* Payment Flow Visualization */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-semibold text-white">
                  Payment Flow
                </h3>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 text-center">
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">From</p>
                    <p className="text-white font-medium">User Wallet</p>
                    <p className="text-xs text-blue-400 mt-1">
                      {detail.investment.currency}
                    </p>
                  </div>
                </div>

                <ArrowRight className="w-6 h-6 text-emerald-500 flex-shrink-0" />

                <div className="flex-1 text-center">
                  <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">To</p>
                    <p className="text-white font-medium">LP Pool</p>
                    <p className="text-xs text-emerald-400 mt-1">Regeneration</p>
                  </div>
                </div>

                <ArrowRight className="w-6 h-6 text-purple-500 flex-shrink-0" />

                <div className="flex-1 text-center">
                  <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Received</p>
                    <p className="text-white font-medium">Project Tokens</p>
                    <p className="text-xs text-purple-400 mt-1">
                      {detail.investment.projectTokenSymbol}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stellar Transaction */}
            {detail.transaction?.reference && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Blockchain Transaction
                </h3>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-400">Transaction Hash</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm bg-black/30 px-2 py-1 rounded flex-1 truncate">
                        {detail.transaction.reference}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(
                            detail.transaction!.reference,
                            "TX hash"
                          )
                        }
                      >
                        {copied === "TX hash" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Button
                      variant="outline"
                      className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
                      onClick={() =>
                        window.open(
                          getStellarExpertLink(detail.transaction!.reference),
                          "_blank"
                        )
                      }
                      data-testid="button-stellar-expert"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on Stellar Expert
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400">Loading investment details...</div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
