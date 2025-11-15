import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp,
  Calendar,
  Package,
  ArrowDownCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import UnifiedHeader from "@/components/UnifiedHeader";

interface UserDistribution {
  id: string;
  cashflowId: string;
  projectId: string;
  regeneratorId: string;
  amountNGNTS: string;
  projectTokensHeld: string;
  distributedAt: string;
  projectName: string;
  projectSymbol: string;
  cashflowAmountNGNTS: string;
  cashflowRecordedAt: string;
}

export default function MyDistributions() {
  const { data: distributions, isLoading } = useQuery<UserDistribution[]>({
    queryKey: ["/api/regenerator/my-distributions"],
  });

  const totalDistributions = distributions?.reduce(
    (sum, dist) => sum + (parseFloat(dist.amountNGNTS || "0") || 0),
    0
  ) || 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: string | number) => {
    const numValue = parseFloat(amount?.toString() || "0") || 0;
    return `₦${numValue.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <UnifiedHeader />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2" data-testid="text-page-title">
            My Distributions
          </h1>
          <p className="text-slate-400">
            Track your RCX cashflow distributions from project revenue
          </p>
        </div>

        {/* Summary Card */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Total Distributions Received
            </CardTitle>
            <CardDescription className="text-slate-400">
              Cumulative cashflow from all projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-emerald-400" data-testid="text-total-distributions">
              {formatCurrency(totalDistributions)}
            </div>
            <p className="text-sm text-slate-400 mt-2">
              {distributions?.length || 0} distribution{distributions?.length !== 1 ? 's' : ''} received
            </p>
          </CardContent>
        </Card>

        {/* Distributions List */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <ArrowDownCircle className="w-5 h-5 text-blue-400" />
              Distribution History
            </CardTitle>
            <CardDescription className="text-slate-400">
              All cashflow distributions from project revenue sharing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-slate-400">
                <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
                <p>Loading distributions...</p>
              </div>
            ) : distributions && distributions.length > 0 ? (
              <div className="space-y-4">
                {distributions.map((dist, index) => (
                  <motion.div
                    key={dist.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    data-testid={`distribution-${dist.id}`}
                  >
                    <Card className="bg-white/5 border-white/10 hover-elevate">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          {/* Left: Project Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Package className="w-5 h-5 text-purple-400" />
                              <h3 className="font-semibold text-white" data-testid={`text-project-name-${dist.id}`}>
                                {dist.projectName}
                              </h3>
                              <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                                {dist.projectSymbol}
                              </Badge>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span data-testid={`text-date-${dist.id}`}>{formatDate(dist.distributedAt)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Package className="w-4 h-4" />
                                <span data-testid={`text-tokens-${dist.id}`}>{(parseFloat(dist.projectTokensHeld || "0") || 0).toLocaleString()} tokens held</span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Distribution Amount */}
                          <div className="text-right">
                            <div className="text-2xl font-bold text-emerald-400" data-testid={`text-amount-${dist.id}`}>
                              {formatCurrency(dist.amountNGNTS)}
                            </div>
                            <p className="text-xs text-slate-500 mt-1" data-testid={`text-revenue-${dist.id}`}>
                              From ₦{(parseFloat(dist.cashflowAmountNGNTS || "0") || 0).toLocaleString()} revenue
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No distributions yet</p>
                <p className="text-sm mt-2">
                  You'll receive distributions when projects generate revenue and execute RCX profit sharing
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
