import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Clock, DollarSign, Search, Filter, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import DepositDetailDrawer from "@/components/DepositDetailDrawer";

type DepositStatus = "pending" | "approved" | "rejected" | "completed";

interface BankDeposit {
  id: string;
  userId: string;
  userEmail: string;
  userFirstName: string | null;
  userLastName: string | null;
  referenceCode: string;
  paymentMethod: string;
  amountNGN: string;
  ngntsAmount: string;
  status: DepositStatus;
  proofUrl: string | null;
  createdAt: string;
  processedAt: string | null;
}

interface DepositsListResponse {
  deposits: BankDeposit[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    pendingCount: number;
    pendingTotal: string;
  };
}

export default function AdminFunding() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  // Build query string
  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.append("status", statusFilter);
    if (searchQuery) params.append("search", searchQuery);
    params.append("page", page.toString());
    params.append("limit", "50");
    return params.toString();
  };

  const queryString = buildQueryString();
  const queryUrl = `/api/admin/bank-deposits?${queryString}`;

  const { data, isLoading } = useQuery<DepositsListResponse>({
    queryKey: [queryUrl],
  });

  const deposits = data?.deposits || [];
  const pagination = data?.pagination;
  const stats = data?.stats || { pendingCount: 0, pendingTotal: "0.00" };

  const getStatusBadge = (status: DepositStatus) => {
    const variants: Record<DepositStatus, { variant: any; label: string }> = {
      pending: { variant: "default", label: "Pending" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
      completed: { variant: "default", label: "Completed" },
    };

    const { variant, label } = variants[status];
    return (
      <Badge 
        variant={variant}
        className={
          status === "pending" 
            ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
            : status === "approved"
            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            : status === "completed"
            ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
            : ""
        }
        data-testid={`badge-status-${status}`}
      >
        {label}
      </Badge>
    );
  };

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(parseFloat(amount));
  };

  const handleViewDeposit = (depositId: string) => {
    setSelectedDepositId(depositId);
    setShowDetailDrawer(true);
  };

  const handleCloseDrawer = () => {
    setShowDetailDrawer(false);
    setTimeout(() => setSelectedDepositId(null), 300); // Wait for animation
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">
              Bank Deposit Management
            </h1>
            <p className="text-slate-400 mt-1">
              Review and approve NGN bank deposits for NGNTS minting
            </p>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Pending Deposits
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-pending-count">
                {stats.pendingCount}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Awaiting admin review
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Total Pending Amount
              </CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-pending-total">
                {formatAmount(stats.pendingTotal)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                NGN awaiting approval
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search" className="text-slate-300">
                  Search by Email or Reference Code
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search deposits..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1); // Reset to first page on search
                    }}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    data-testid="input-search"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status-filter" className="text-slate-300">
                  Filter by Status
                </Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setPage(1); // Reset to first page on filter change
                  }}
                >
                  <SelectTrigger 
                    id="status-filter"
                    className="bg-white/5 border-white/10 text-white"
                    data-testid="select-status-filter"
                  >
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deposits Table */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">
              Deposits {pagination && `(${pagination.total} total)`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : deposits.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No deposits found matching your filters
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead className="text-slate-300">User</TableHead>
                      <TableHead className="text-slate-300">Amount (NGN)</TableHead>
                      <TableHead className="text-slate-300">NGNTS</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300">Reference Code</TableHead>
                      <TableHead className="text-slate-300">Created</TableHead>
                      <TableHead className="text-slate-300 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deposits.map((deposit) => (
                      <TableRow
                        key={deposit.id}
                        className="border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => handleViewDeposit(deposit.id)}
                        data-testid={`row-deposit-${deposit.id}`}
                      >
                        <TableCell className="text-white">
                          <div className="flex flex-col">
                            <span className="font-medium" data-testid={`text-user-email-${deposit.id}`}>
                              {deposit.userEmail}
                            </span>
                            {deposit.userFirstName && deposit.userLastName && (
                              <span className="text-xs text-slate-400">
                                {deposit.userFirstName} {deposit.userLastName}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-white font-medium" data-testid={`text-amount-${deposit.id}`}>
                          {formatAmount(deposit.amountNGN)}
                        </TableCell>
                        <TableCell className="text-emerald-400 font-medium" data-testid={`text-ngnts-${deposit.id}`}>
                          {parseFloat(deposit.ngntsAmount).toLocaleString()} NGNTS
                        </TableCell>
                        <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                        <TableCell className="text-slate-300 font-mono text-xs" data-testid={`text-reference-${deposit.id}`}>
                          {deposit.referenceCode}
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm" data-testid={`text-created-${deposit.id}`}>
                          {format(new Date(deposit.createdAt), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDeposit(deposit.id);
                            }}
                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                            data-testid={`button-view-${deposit.id}`}
                          >
                            View Details
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                <div className="text-sm text-slate-400">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    data-testid="button-prev-page"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.totalPages}
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deposit Detail Drawer */}
      <DepositDetailDrawer
        depositId={selectedDepositId}
        open={showDetailDrawer}
        onOpenChange={handleCloseDrawer}
      />
    </div>
  );
}
