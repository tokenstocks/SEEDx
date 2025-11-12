import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, TrendingUp, UserCheck, Search, ChevronLeft, ChevronRight, ArrowLeft, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Link } from "wouter";
import { PrimerDetailDrawer } from "@/components/PrimerDetailDrawer";

interface Primer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  kycStatus: "pending" | "approved" | "rejected" | "unverified";
  walletActivationStatus: "pending" | "active" | "failed" | "created" | "activating" | null;
  stellarPublicKey: string | null;
  createdAt: string;
  totalContributed: string;
  pendingContributions: number;
  approvedContributions: number;
  rejectedContributions: number;
}

interface PrimerStats {
  totalPrimers: number;
  activePrimers: number;
  totalContributed: string;
  avgContribution: string;
  totalApprovedContributions: number;
}

export default function AdminPrimers() {
  const [selectedPrimer, setSelectedPrimer] = useState<Primer | null>(null);
  const [search, setSearch] = useState("");
  const [kycStatus, setKycStatus] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  // Build query string
  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    if (search) params.append("search", search);
    if (kycStatus !== "all") params.append("kycStatus", kycStatus);
    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);
    return params.toString();
  };

  // Fetch primer stats
  const { data: stats } = useQuery<PrimerStats>({
    queryKey: ["/api/admin/primers/stats"],
  });

  // Fetch primers list
  const { data: primersData, isLoading } = useQuery<{
    primers: Primer[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: [`/api/admin/primers?${buildQueryString()}`],
  });

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return `₦${num.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "MMM dd, yyyy HH:mm");
  };

  const getKycBadge = (status: string, id?: string) => {
    const config = {
      approved: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", label: "Approved" },
      pending: { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", label: "Pending" },
      rejected: { color: "bg-red-500/10 text-red-400 border-red-500/30", label: "Rejected" },
      unverified: { color: "bg-slate-500/10 text-slate-400 border-slate-500/30", label: "Unverified" },
    };
    const cfg = config[status as keyof typeof config] || config.unverified;
    const testId = id ? `badge-kyc-${status}-${id}` : `badge-kyc-${status}`;
    return <Badge className={`${cfg.color} border`} data-testid={testId}>{cfg.label}</Badge>;
  };

  const getWalletBadge = (status: string | null, id?: string) => {
    const testId = id ? `badge-wallet-${status || 'none'}-${id}` : `badge-wallet-${status || 'none'}`;
    if (!status) return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/30 border" data-testid={testId}>No Wallet</Badge>;
    const config = {
      active: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", label: "Active" },
      pending: { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", label: "Pending" },
      failed: { color: "bg-red-500/10 text-red-400 border-red-500/30", label: "Failed" },
      created: { color: "bg-blue-500/10 text-blue-400 border-blue-500/30", label: "Created" },
      activating: { color: "bg-purple-500/10 text-purple-400 border-purple-500/30", label: "Activating" },
    };
    const cfg = config[status as keyof typeof config] || { color: "bg-slate-500/10 text-slate-400 border-slate-500/30", label: status };
    return <Badge className={`${cfg.color} border`} data-testid={testId}>{cfg.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button 
                variant="ghost" 
                size="icon"
                className="text-slate-400 hover:text-white"
                data-testid="button-back-to-admin"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">
                Primer Management
              </h1>
              <p className="text-slate-400 mt-1">Monitor liquidity providers and their contributions</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm text-emerald-400 font-medium">Live</span>
          </div>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">
                    Total Primers
                  </CardTitle>
                  <Users className="w-4 h-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-total-primers">
                    {stats.totalPrimers.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">
                    Active Primers
                  </CardTitle>
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-active-primers">
                    {stats.activePrimers.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">
                    Total Contributed
                  </CardTitle>
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-total-contributed">
                    {formatCurrency(stats.totalContributed)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {stats.totalApprovedContributions} approved contributions
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">
                    Avg Contribution
                  </CardTitle>
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-avg-contribution">
                    {formatCurrency(stats.avgContribution)}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Filters */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by email or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                  data-testid="input-search"
                />
              </div>

              <Select value={kycStatus} onValueChange={setKycStatus}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-kyc-filter">
                  <SelectValue placeholder="KYC Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All KYC Statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <Input
                  type="date"
                  placeholder="From Date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                  data-testid="input-date-from"
                />
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <Input
                  type="date"
                  placeholder="To Date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                  data-testid="input-date-to"
                />
              </div>

              <Button
                onClick={() => {
                  setSearch("");
                  setKycStatus("all");
                  setFromDate("");
                  setToDate("");
                  setPage(1);
                }}
                variant="outline"
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Primers Table */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Primers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : !primersData || primersData.primers.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No primers found</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead className="text-slate-400">Name</TableHead>
                      <TableHead className="text-slate-400">Email</TableHead>
                      <TableHead className="text-slate-400">KYC Status</TableHead>
                      <TableHead className="text-slate-400">Wallet</TableHead>
                      <TableHead className="text-slate-400">Total Contributed</TableHead>
                      <TableHead className="text-slate-400">Contributions</TableHead>
                      <TableHead className="text-slate-400">Joined</TableHead>
                      <TableHead className="text-slate-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {primersData.primers.map((primer) => (
                      <TableRow
                        key={primer.id}
                        className="border-white/10 hover:bg-white/5 cursor-pointer"
                        onClick={() => setSelectedPrimer(primer)}
                        data-testid={`row-primer-${primer.id}`}
                      >
                        <TableCell className="text-white font-medium" data-testid={`text-primer-name-${primer.id}`}>
                          {primer.firstName} {primer.lastName}
                        </TableCell>
                        <TableCell className="text-slate-300" data-testid={`text-primer-email-${primer.id}`}>
                          {primer.email}
                        </TableCell>
                        <TableCell data-testid={`cell-kyc-status-${primer.id}`}>
                          {getKycBadge(primer.kycStatus, primer.id.toString())}
                        </TableCell>
                        <TableCell data-testid={`cell-wallet-status-${primer.id}`}>
                          {getWalletBadge(primer.walletActivationStatus, primer.id.toString())}
                        </TableCell>
                        <TableCell className="text-white font-medium" data-testid={`text-contributed-${primer.id}`}>
                          {formatCurrency(primer.totalContributed)}
                        </TableCell>
                        <TableCell data-testid={`cell-contributions-${primer.id}`}>
                          <div className="flex gap-2">
                            {primer.approvedContributions > 0 && (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 border" data-testid={`badge-approved-count-${primer.id}`}>
                                {primer.approvedContributions} Approved
                              </Badge>
                            )}
                            {primer.pendingContributions > 0 && (
                              <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 border" data-testid={`badge-pending-count-${primer.id}`}>
                                {primer.pendingContributions} Pending
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300" data-testid={`text-joined-date-${primer.id}`}>
                          {formatDate(primer.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-400 hover:text-blue-300"
                            data-testid={`button-view-primer-${primer.id}`}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {primersData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-slate-400">
                      Showing {((primersData.pagination.page - 1) * primersData.pagination.limit) + 1} to{" "}
                      {Math.min(primersData.pagination.page * primersData.pagination.limit, primersData.pagination.total)} of{" "}
                      {primersData.pagination.total} primers
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>
                      <span className="text-sm text-slate-400">
                        Page {primersData.pagination.page} of {primersData.pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= primersData.pagination.totalPages}
                        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                        data-testid="button-next-page"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Drawer */}
      {selectedPrimer && (
        <PrimerDetailDrawer
          primer={selectedPrimer}
          onClose={() => setSelectedPrimer(null)}
        />
      )}
    </div>
  );
}
