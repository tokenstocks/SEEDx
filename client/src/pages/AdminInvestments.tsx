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
import { TrendingUp, Search, ChevronLeft, ChevronRight, ArrowUpDown, Download, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { InvestmentDetailDrawer } from "@/components/InvestmentDetailDrawer";
import { Link } from "wouter";

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

interface InvestmentStats {
  allTime: {
    totalInvested: number;
    investmentCount: number;
    avgInvestment: number;
  };
  today: {
    totalInvested: number;
    count: number;
  };
  last24h: {
    totalInvested: number;
    count: number;
  };
  byCurrency: Array<{
    currency: string;
    totalAmount: number;
    count: number;
  }>;
}

export default function AdminInvestments() {
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [search, setSearch] = useState("");
  const [currency, setCurrency] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 50;

  // Build query string
  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    if (search) params.append("search", search);
    if (currency !== "all") params.append("currency", currency);
    return params.toString();
  };

  // Fetch investment stats
  const { data: stats } = useQuery<InvestmentStats>({
    queryKey: ["/api/admin/investments/stats"],
  });

  // Fetch investments list
  const { data: investmentsData, isLoading } = useQuery<{
    investments: Investment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: [`/api/admin/investments?${buildQueryString()}`],
  });

  const formatCurrency = (amount: string, curr: string) => {
    const num = parseFloat(amount);
    if (curr === "NGN" || curr === "NGNTS") {
      return `₦${num.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (curr === "USDC") {
      return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (curr === "XLM") {
      return `${num.toLocaleString("en-US", { minimumFractionDigits: 7, maximumFractionDigits: 7 })} XLM`;
    }
    return amount;
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "MMM dd, yyyy HH:mm");
  };

  const handleExportCSV = () => {
    if (!investmentsData || investmentsData.investments.length === 0) {
      return;
    }

    // CSV headers
    const headers = [
      "Date",
      "User Email",
      "Project",
      "Amount",
      "Currency",
      "Tokens",
      "TX Hash",
      "Status"
    ];

    // CSV rows
    const rows = investmentsData.investments.map((inv) => [
      format(new Date(inv.createdAt), "yyyy-MM-dd HH:mm:ss"),
      inv.userEmail,
      inv.projectName,
      inv.amount,
      inv.currency,
      inv.tokensReceived,
      inv.txHash || "N/A",
      inv.transactionId ? "Completed" : "Pending"
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => {
          // Escape commas and quotes
          const cellStr = String(cell);
          if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(",")
      ),
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `investments-export-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                Investment Dashboard
              </h1>
              <p className="text-slate-400 mt-1">Monitor all Regenerator investments across projects</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExportCSV}
              disabled={!investmentsData || investmentsData.investments.length === 0}
              className="bg-white/10 border border-white/20 text-white hover:bg-white/20"
              data-testid="button-export-csv"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm text-emerald-400 font-medium">Live</span>
            </div>
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
                    Total Invested (All-Time)
                  </CardTitle>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-total-all-time">
                    ₦{stats.allTime.totalInvested.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {stats.allTime.investmentCount.toLocaleString()} investments
                  </p>
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
                    Today's Investments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-total-today">
                    ₦{stats.today.totalInvested.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {stats.today.count} investments
                  </p>
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
                    Last 24 Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-total-24h">
                    ₦{stats.last24h.totalInvested.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {stats.last24h.count} investments
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
                    Average Investment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-avg-investment">
                    ₦{stats.allTime.avgInvestment.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Per transaction
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Filters */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by user email or project name..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                  data-testid="input-search"
                />
              </div>
              <Select value={currency} onValueChange={(val) => { setCurrency(val); setPage(1); }}>
                <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white" data-testid="select-currency">
                  <SelectValue placeholder="All Currencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Currencies</SelectItem>
                  <SelectItem value="NGN">NGN</SelectItem>
                  <SelectItem value="NGNTS">NGNTS</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="XLM">XLM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Investments Table */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5" />
              Investment Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-400">Loading investments...</div>
            ) : investmentsData && investmentsData.investments.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableHead className="text-slate-400">Timestamp</TableHead>
                        <TableHead className="text-slate-400">User</TableHead>
                        <TableHead className="text-slate-400">Project</TableHead>
                        <TableHead className="text-slate-400">Amount</TableHead>
                        <TableHead className="text-slate-400">Tokens</TableHead>
                        <TableHead className="text-slate-400">Currency</TableHead>
                        <TableHead className="text-slate-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {investmentsData.investments.map((investment) => (
                        <TableRow
                          key={investment.id}
                          className="border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
                          onClick={() => setSelectedInvestment(investment)}
                          data-testid={`row-investment-${investment.id}`}
                        >
                          <TableCell className="text-slate-300 text-sm">
                            {formatDate(investment.createdAt)}
                          </TableCell>
                          <TableCell className="text-white font-medium">
                            {investment.userEmail}
                          </TableCell>
                          <TableCell className="text-white">
                            {investment.projectName}
                          </TableCell>
                          <TableCell className="text-emerald-400 font-mono">
                            {formatCurrency(investment.amount, investment.currency)}
                          </TableCell>
                          <TableCell className="text-slate-300 font-mono">
                            {parseFloat(investment.tokensReceived).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-white/20 text-white">
                              {investment.currency}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInvestment(investment);
                              }}
                              data-testid={`button-view-${investment.id}`}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                  <div className="text-sm text-slate-400">
                    Showing {((page - 1) * limit) + 1} to{" "}
                    {Math.min(page * limit, investmentsData.pagination.total)} of{" "}
                    {investmentsData.pagination.total} investments
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="bg-white/5 border-white/10 text-white disabled:opacity-50"
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <div className="text-sm text-slate-400">
                      Page {page} of {investmentsData.pagination.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= investmentsData.pagination.totalPages}
                      className="bg-white/5 border-white/10 text-white disabled:opacity-50"
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400">
                No investments found matching your filters.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Investment Detail Drawer */}
      <InvestmentDetailDrawer
        investment={selectedInvestment}
        open={selectedInvestment !== null}
        onClose={() => setSelectedInvestment(null)}
      />
    </div>
  );
}
