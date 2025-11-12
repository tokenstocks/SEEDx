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
  FileText,
  History,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Primer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  kycStatus: string;
  walletActivationStatus: string | null;
  stellarPublicKey: string | null;
  createdAt: string;
  totalContributed: string;
  pendingContributions: number;
  approvedContributions: number;
  rejectedContributions: number;
}

interface PrimerDetail {
  primer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    kycStatus: string;
    kycDocuments: string[] | null;
    stellarPublicKey: string | null;
    createdAt: string;
  };
  wallet: {
    id: string;
    activationStatus: string;
    ngnBalance: string;
    usdcBalance: string;
    xlmBalance: string;
  } | null;
  stats: {
    totalContributed: string;
    pendingContributions: number;
    approvedContributions: number;
    rejectedContributions: number;
    totalAllocations: number;
  };
  contributions: Array<{
    id: string;
    amountNgnts: string;
    status: string;
    paymentProof: string | null;
    txHash: string | null;
    lpPoolShareSnapshot: string | null;
    createdAt: string;
    approvedAt: string | null;
    approvedBy: string | null;
    rejectedReason: string | null;
    approverEmail: string | null;
  }>;
  allocations: Array<{
    id: string;
    projectId: string;
    projectName: string | null;
    shareAmountNgnts: string;
    sharePercent: string;
    poolOwnershipPercent: string;
    allocationDate: string | null;
    totalAllocated: string;
    createdAt: string;
  }>;
  kycHistory: Array<{
    id: string;
    decision: string;
    notes: string | null;
    processedAt: string;
    adminEmail: string | null;
    adminName: string | null;
  }>;
}

interface PrimerDetailDrawerProps {
  primer: Primer;
  onClose: () => void;
}

export function PrimerDetailDrawer({ primer, onClose }: PrimerDetailDrawerProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const { data: detail, isLoading } = useQuery<PrimerDetail>({
    queryKey: [`/api/admin/primers/${primer.id}`],
    enabled: !!primer.id,
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

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return `₦${num.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getKycStatusBadge = (status: string, testId?: string) => {
    const config: Record<string, { color: string; label: string }> = {
      approved: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", label: "Approved" },
      pending: { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", label: "Pending" },
      rejected: { color: "bg-red-500/10 text-red-400 border-red-500/30", label: "Rejected" },
      unverified: { color: "bg-slate-500/10 text-slate-400 border-slate-500/30", label: "Unverified" },
    };
    const cfg = config[status] || config.unverified;
    return <Badge className={`${cfg.color} border`} data-testid={testId}>{cfg.label}</Badge>;
  };

  const getContributionStatusBadge = (status: string, testId?: string) => {
    const config: Record<string, { color: string; label: string }> = {
      approved: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", label: "Approved" },
      pending: { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", label: "Pending" },
      rejected: { color: "bg-red-500/10 text-red-400 border-red-500/30", label: "Rejected" },
    };
    const cfg = config[status] || config.pending;
    return <Badge className={`${cfg.color} border`} data-testid={testId}>{cfg.label}</Badge>;
  };

  const getStellarExpertLink = (txHash: string) => {
    const network = import.meta.env.MODE === "development" ? "testnet" : "public";
    return `https://stellar.expert/explorer/${network}/tx/${txHash}`;
  };

  return (
    <Sheet open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="bg-slate-950 border-white/10 text-white w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white text-2xl">
            Primer Details
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            Comprehensive view of this Primer's account and contributions
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-slate-400">Loading primer details...</p>
          </div>
        ) : detail ? (
          <div className="mt-6 space-y-6">
            {/* Primer Information */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-semibold text-white">Primer Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Name</p>
                  <p className="text-white font-medium" data-testid="text-primer-name">
                    {detail.primer.firstName} {detail.primer.lastName}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-400">Email</p>
                  <p className="text-white font-medium" data-testid="text-primer-email">
                    {detail.primer.email}
                  </p>
                </div>

                {detail.primer.phone && (
                  <div>
                    <p className="text-sm text-slate-400">Phone</p>
                    <p className="text-white font-medium" data-testid="text-primer-phone">{detail.primer.phone}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-slate-400">KYC Status</p>
                  <div className="mt-1">{getKycStatusBadge(detail.primer.kycStatus, "badge-kyc-status")}</div>
                </div>

                {detail.primer.stellarPublicKey && (
                  <div className="col-span-2">
                    <p className="text-sm text-slate-400">Stellar Public Key</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm bg-black/30 px-2 py-1 rounded flex-1 truncate text-slate-300" data-testid="text-stellar-key">
                        {detail.primer.stellarPublicKey}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(detail.primer.stellarPublicKey!, "Stellar address")}
                        data-testid="button-copy-stellar"
                      >
                        {copied === "Stellar address" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="col-span-2">
                  <p className="text-sm text-slate-400">Member Since</p>
                  <p className="text-white font-medium" data-testid="text-member-since">
                    {format(new Date(detail.primer.createdAt), "MMMM dd, yyyy")}
                  </p>
                </div>
              </div>
            </div>

            {/* Wallet Information */}
            {detail.wallet && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-white">Wallet</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Activation Status</p>
                    <Badge className="mt-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 border" data-testid="badge-wallet-status">
                      {detail.wallet.activationStatus}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">NGNTS Balance</p>
                    <p className="text-white font-medium" data-testid="text-ngnts-balance">
                      {formatCurrency(detail.wallet.ngnBalance)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">USDC Balance</p>
                    <p className="text-white font-medium" data-testid="text-usdc-balance">
                      ${parseFloat(detail.wallet.usdcBalance).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">XLM Balance</p>
                    <p className="text-white font-medium" data-testid="text-xlm-balance">
                      {parseFloat(detail.wallet.xlmBalance).toLocaleString()} XLM
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Contribution Statistics */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-semibold text-white">Contribution Stats</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Total Contributed</p>
                  <p className="text-lg font-bold text-emerald-400" data-testid="text-total-contributed">
                    {formatCurrency(detail.stats.totalContributed)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-400">Approved</p>
                  <p className="text-lg font-bold text-white" data-testid="text-approved-count">
                    {detail.stats.approvedContributions}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-400">Pending</p>
                  <p className="text-lg font-bold text-yellow-400" data-testid="text-pending-count">
                    {detail.stats.pendingContributions}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-400">Project Allocations</p>
                  <p className="text-lg font-bold text-white" data-testid="text-allocations-count">
                    {detail.stats.totalAllocations}
                  </p>
                </div>
              </div>
            </div>

            {/* Contribution History */}
            {detail.contributions.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-white">Contribution History</h3>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-slate-400">Amount</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                      <TableHead className="text-slate-400">Date</TableHead>
                      <TableHead className="text-slate-400">TX Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.contributions.map((contribution) => (
                      <TableRow key={contribution.id} className="border-white/10" data-testid={`row-contribution-${contribution.id}`}>
                        <TableCell className="text-white font-medium" data-testid={`text-contribution-amount-${contribution.id}`}>
                          {formatCurrency(contribution.amountNgnts)}
                        </TableCell>
                        <TableCell data-testid={`cell-contribution-status-${contribution.id}`}>
                          {getContributionStatusBadge(contribution.status, `badge-contribution-status-${contribution.id}`)}
                        </TableCell>
                        <TableCell className="text-slate-300" data-testid={`text-contribution-date-${contribution.id}`}>
                          {format(new Date(contribution.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell data-testid={`cell-contribution-tx-${contribution.id}`}>
                          {contribution.txHash ? (
                            <a
                              href={getStellarExpertLink(contribution.txHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                              data-testid={`link-tx-hash-${contribution.id}`}
                            >
                              <span className="font-mono text-xs">
                                {contribution.txHash.slice(0, 8)}...
                              </span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-500 text-xs">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Project Allocations */}
            {detail.allocations.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-lg font-semibold text-white">Project Allocations</h3>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-slate-400">Project</TableHead>
                      <TableHead className="text-slate-400">Share Amount</TableHead>
                      <TableHead className="text-slate-400">Share %</TableHead>
                      <TableHead className="text-slate-400">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.allocations.map((allocation) => (
                      <TableRow key={allocation.id} className="border-white/10" data-testid={`row-allocation-${allocation.id}`}>
                        <TableCell className="text-white font-medium" data-testid={`text-allocation-project-${allocation.id}`}>
                          {allocation.projectName || "Unknown Project"}
                        </TableCell>
                        <TableCell className="text-emerald-400" data-testid={`text-allocation-amount-${allocation.id}`}>
                          {formatCurrency(allocation.shareAmountNgnts)}
                        </TableCell>
                        <TableCell className="text-white" data-testid={`text-allocation-percent-${allocation.id}`}>
                          {parseFloat(allocation.sharePercent).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-slate-300" data-testid={`text-allocation-date-${allocation.id}`}>
                          {format(new Date(allocation.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* KYC History */}
            {detail.kycHistory.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-lg font-semibold text-white">KYC Audit Trail</h3>
                </div>

                <div className="space-y-3">
                  {detail.kycHistory.map((record) => (
                    <div key={record.id} className="border-l-2 border-white/20 pl-4 py-2" data-testid={`record-kyc-${record.id}`}>
                      <div className="flex items-center justify-between mb-1">
                        {getKycStatusBadge(record.decision, `badge-kyc-decision-${record.id}`)}
                        <span className="text-xs text-slate-400" data-testid={`text-kyc-date-${record.id}`}>
                          {format(new Date(record.processedAt), "MMM dd, yyyy HH:mm")}
                        </span>
                      </div>
                      {record.adminName && (
                        <p className="text-sm text-slate-400" data-testid={`text-kyc-admin-${record.id}`}>
                          Processed by: {record.adminName} ({record.adminEmail})
                        </p>
                      )}
                      {record.notes && (
                        <p className="text-sm text-slate-300 mt-1" data-testid={`text-kyc-notes-${record.id}`}>{record.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-slate-400">Failed to load primer details</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
