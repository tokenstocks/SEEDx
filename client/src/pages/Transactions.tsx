import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, TrendingUp, DollarSign, Clock } from "lucide-react";
import { Link } from "wouter";
import UnifiedHeader from "@/components/UnifiedHeader";
import { motion, useReducedMotion } from "framer-motion";

interface Transaction {
  id: string;
  type: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
}

export default function Transactions() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      setLocation("/login");
      return;
    }

    setUser(JSON.parse(userData));
  }, [setLocation]);

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });

  const filteredTransactions = transactions?.filter((tx) => {
    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    return matchesType && matchesStatus;
  });

  const formatCurrency = (amount: string, currency: string) => {
    const symbol = currency === "NGN" ? "₦" : currency === "USDC" ? "$" : "";
    return `${symbol}${parseFloat(amount).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case "withdrawal":
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      case "investment":
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case "return":
        return <DollarSign className="w-4 h-4 text-purple-600" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: "default",
      pending: "secondary",
      processing: "outline",
      failed: "destructive",
      cancelled: "secondary",
    };
    return <Badge variant={variants[status] || "outline"} className="capitalize">{status}</Badge>;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <UnifiedHeader />
      <div className="max-w-5xl mx-auto p-4 py-8 space-y-6">
        {/* Header Section */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link
            href="/regenerator-dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
            data-testid="link-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Transaction History</h1>
          <p className="text-slate-400">
            View all your deposits, withdrawals, and investments
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger data-testid="select-type-filter" className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="deposit">Deposits</SelectItem>
                      <SelectItem value="withdrawal">Withdrawals</SelectItem>
                      <SelectItem value="investment">Investments</SelectItem>
                      <SelectItem value="return">Returns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status-filter" className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Transactions List */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-2">Transactions</h2>
              <p className="text-slate-400 mb-6">
                {filteredTransactions?.length || 0} {filteredTransactions?.length === 1 ? 'transaction' : 'transactions'}
              </p>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : filteredTransactions && filteredTransactions.length > 0 ? (
                <div className="space-y-3">
                  {filteredTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover-elevate transition-all duration-300"
                      data-testid={`transaction-${tx.id}`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                          {getTypeIcon(tx.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium capitalize text-white">{tx.type}</h4>
                            {getStatusBadge(tx.status)}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-400 mt-1 flex-wrap">
                            <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                            {tx.reference && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-xs">{tx.reference}</span>
                              </>
                            )}
                          </div>
                          {tx.notes && (
                            <p className="text-xs text-slate-400 mt-1">{tx.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <div className={`font-semibold ${
                          tx.type === "deposit" || tx.type === "return" ? "text-emerald-400" : 
                          tx.type === "withdrawal" ? "text-red-400" : "text-white"
                        }`}>
                          {tx.type === "deposit" || tx.type === "return" ? "+" : "-"}
                          {formatCurrency(tx.amount, tx.currency)}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {tx.currency}
                          {tx.paymentMethod && ` • ${tx.paymentMethod.replace('_', ' ')}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No transactions yet</h3>
                  <p className="text-slate-400">
                    Your transaction history will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
