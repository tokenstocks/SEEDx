import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  User,
  Wallet,
  TrendingUp,
  DollarSign,
  Copy,
  History,
  ExternalLink,
  Package,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Regenerator {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  kycStatus: string;
  walletActivationStatus: string | null;
  totalInvested: string;
  investmentCount: number;
  createdAt: string;
}

interface RegeneratorDetailResponse {
  regenerator: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    kycStatus: string;
    kycDocuments: any;
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
    totalInvested: string;
    totalInvestments: number;
    uniqueProjects: number;
    totalTokensReceived: string;
  };
  investments: Array<{
    id: string;
    projectId: string;
    projectName: string | null;
    amount: string;
    tokensReceived: string;
    currency: string;
    transactionId: string | null;
    createdAt: string;
  }>;
  kycHistory: Array<{
    id: string;
    previousStatus: string;
    newStatus: string;
    adminNotes: string | null;
    processedAt: string;
    adminId: string | null;
    adminName: string | null;
    adminEmail: string | null;
  }>;
}

interface RegeneratorDetailDrawerProps {
  regenerator: Regenerator | null;
  open: boolean;
  onClose: () => void;
}

export function RegeneratorDetailDrawer({ regenerator, open, onClose }: RegeneratorDetailDrawerProps) {
  const { toast } = useToast();

  const { data: detail, isLoading } = useQuery<RegeneratorDetailResponse>({
    queryKey: [`/api/admin/regenerators/${regenerator?.id}`],
    enabled: !!regenerator,
  });

  // Guard against stale data from previous regenerator
  const isDataStale = !!(detail && regenerator?.id && detail.regenerator.id !== regenerator.id);

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return `₦${num.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
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

  const getWalletStatusBadge = (status: string, testId?: string) => {
    const config: Record<string, { color: string; label: string }> = {
      active: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", label: "Active" },
      pending: { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", label: "Pending" },
      failed: { color: "bg-red-500/10 text-red-400 border-red-500/30", label: "Failed" },
      created: { color: "bg-blue-500/10 text-blue-400 border-blue-500/30", label: "Created" },
      activating: { color: "bg-purple-500/10 text-purple-400 border-purple-500/30", label: "Activating" },
    };
    const cfg = config[status] || { color: "bg-slate-500/10 text-slate-400 border-slate-500/30", label: status };
    return <Badge className={`${cfg.color} border`} data-testid={testId}>{cfg.label}</Badge>;
  };

  const getCurrencyBadge = (currency: string, testId?: string) => {
    const config: Record<string, { color: string }> = {
      NGNTS: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
      USDC: { color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
      XLM: { color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
    };
    const cfg = config[currency] || { color: "bg-slate-500/10 text-slate-400 border-slate-500/30" };
    return <Badge className={`${cfg.color} border`} data-testid={testId}>{currency}</Badge>;
  };

  const getStellarExpertLink = (txHash: string) => {
    const network = import.meta.env.MODE === "development" ? "testnet" : "public";
    return `https://stellar.expert/explorer/${network}/tx/${txHash}`;
  };

  if (!regenerator) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-white/10 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold text-white">
            Regenerator Details
          </SheetTitle>
        </SheetHeader>

        {isLoading || isDataStale ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-slate-400">Loading regenerator details...</p>
          </div>
        ) : detail ? (
          <div className="mt-6 space-y-6">
            {/* Personal Information */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-white">Personal Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Full Name</p>
                  <p className="text-white font-medium" data-testid="text-regenerator-name">
                    {detail.regenerator.firstName} {detail.regenerator.lastName}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-400">Email</p>
                  <p className="text-white font-medium" data-testid="text-regenerator-email">{detail.regenerator.email}</p>
                </div>

                {detail.regenerator.phone && (
                  <div>
                    <p className="text-sm text-slate-400">Phone</p>
                    <p className="text-white font-medium" data-testid="text-regenerator-phone">{detail.regenerator.phone}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-slate-400">KYC Status</p>
                  <div className="mt-1">{getKycStatusBadge(detail.regenerator.kycStatus, "badge-kyc-status")}</div>
                </div>

                {detail.regenerator.stellarPublicKey && (
                  <div className="col-span-2">
                    <p className="text-sm text-slate-400">Stellar Public Key</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-white font-mono text-xs bg-white/5 px-3 py-2 rounded border border-white/10 flex-1" data-testid="text-stellar-key">
                        {detail.regenerator.stellarPublicKey}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(detail.regenerator.stellarPublicKey!, "Stellar key")}
                        className="text-blue-400 hover:text-blue-300"
                        data-testid="button-copy-stellar"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-slate-400">Member Since</p>
                  <p className="text-white" data-testid="text-member-since">
                    {format(new Date(detail.regenerator.createdAt), "MMM dd, yyyy")}
                  </p>
                </div>
              </div>
            </div>

            {/* Wallet Information */}
            {detail.wallet && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-lg font-semibold text-white">Wallet</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Status</p>
                    <div className="mt-1">{getWalletStatusBadge(detail.wallet.activationStatus, "badge-wallet-status")}</div>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">NGNTS Balance</p>
                    <p className="text-emerald-400 font-medium" data-testid="text-ngnts-balance">
                      {formatCurrency(detail.wallet.ngnBalance)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">USDC Balance</p>
                    <p className="text-blue-400 font-medium" data-testid="text-usdc-balance">
                      ${parseFloat(detail.wallet.usdcBalance).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">XLM Balance</p>
                    <p className="text-purple-400 font-medium" data-testid="text-xlm-balance">
                      {parseFloat(detail.wallet.xlmBalance).toFixed(7)} XLM
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Investment Statistics */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-semibold text-white">Investment Statistics</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Total Invested</p>
                  <p className="text-2xl font-bold text-emerald-400" data-testid="text-total-invested">
                    {formatCurrency(detail.stats.totalInvested)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-400">Total Investments</p>
                  <p className="text-2xl font-bold text-white" data-testid="text-total-investments">
                    {detail.stats.totalInvestments}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-400">Unique Projects</p>
                  <p className="text-2xl font-bold text-white" data-testid="text-unique-projects">
                    {detail.stats.uniqueProjects}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-400">Total Tokens Received</p>
                  <p className="text-2xl font-bold text-blue-400" data-testid="text-total-tokens">
                    {parseFloat(detail.stats.totalTokensReceived).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Investment History */}
            {detail.investments.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-white">Investment History</h3>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-slate-400">Project</TableHead>
                      <TableHead className="text-slate-400">Amount</TableHead>
                      <TableHead className="text-slate-400">Currency</TableHead>
                      <TableHead className="text-slate-400">Tokens</TableHead>
                      <TableHead className="text-slate-400">Date</TableHead>
                      <TableHead className="text-slate-400">TX</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.investments.map((investment) => (
                      <TableRow key={investment.id} className="border-white/10" data-testid={`row-investment-${investment.id}`}>
                        <TableCell className="text-white font-medium" data-testid={`text-investment-project-${investment.id}`}>
                          {investment.projectName || "Unknown Project"}
                        </TableCell>
                        <TableCell className="text-white" data-testid={`text-investment-amount-${investment.id}`}>
                          {investment.currency === "NGNTS" 
                            ? formatCurrency(investment.amount)
                            : `$${parseFloat(investment.amount).toFixed(2)}`
                          }
                        </TableCell>
                        <TableCell data-testid={`cell-investment-currency-${investment.id}`}>
                          {getCurrencyBadge(investment.currency, `badge-currency-${investment.id}`)}
                        </TableCell>
                        <TableCell className="text-blue-400" data-testid={`text-investment-tokens-${investment.id}`}>
                          {parseFloat(investment.tokensReceived).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-slate-300" data-testid={`text-investment-date-${investment.id}`}>
                          {format(new Date(investment.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell data-testid={`cell-investment-tx-${investment.id}`}>
                          {investment.transactionId ? (
                            <a
                              href={getStellarExpertLink(investment.transactionId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                              data-testid={`link-tx-hash-${investment.id}`}
                            >
                              <span className="font-mono text-xs">
                                {investment.transactionId.slice(0, 8)}...
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
                        {getKycStatusBadge(record.newStatus, `badge-kyc-decision-${record.id}`)}
                        <span className="text-xs text-slate-400" data-testid={`text-kyc-date-${record.id}`}>
                          {format(new Date(record.processedAt), "MMM dd, yyyy HH:mm")}
                        </span>
                      </div>
                      {record.adminName && (
                        <p className="text-sm text-slate-400" data-testid={`text-kyc-admin-${record.id}`}>
                          Processed by: {record.adminName} ({record.adminEmail})
                        </p>
                      )}
                      {record.adminNotes && (
                        <p className="text-sm text-slate-300 mt-1" data-testid={`text-kyc-notes-${record.id}`}>{record.adminNotes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-slate-400">Failed to load regenerator details</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
