import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface NAVCardProps {
  currentNAV: number;
  previousNAV?: number;
  currency?: string;
  showChart?: boolean;
  history?: Array<{ date: string; value: number }>;
}

export function NAVCard({ 
  currentNAV, 
  previousNAV, 
  currency = "NGN",
  showChart = false,
  history = []
}: NAVCardProps) {
  const hasGrowth = previousNAV !== undefined;
  const growthAmount = hasGrowth ? currentNAV - previousNAV : 0;
  const growthPercent = hasGrowth && previousNAV > 0 
    ? ((growthAmount / previousNAV) * 100) 
    : 0;
  const isPositive = growthAmount >= 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden bg-white/5 backdrop-blur-md border-white/10">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/60 via-emerald-500/60 to-blue-500/60" />
        
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-400">
              NAV per Token
            </CardTitle>
            <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
              <Sparkles className="w-3 h-3 mr-1" />
              Live
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white" data-testid="text-current-nav">
              {formatCurrency(currentNAV)}
            </span>
            {hasGrowth && (
              <div className={`flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? (
                  <TrendingUp className="w-4 h-4" data-testid="icon-nav-up" />
                ) : (
                  <TrendingDown className="w-4 h-4" data-testid="icon-nav-down" />
                )}
                <span className="text-sm font-medium" data-testid="text-nav-change">
                  {isPositive ? '+' : ''}{growthPercent.toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          {hasGrowth && (
            <div className="text-xs text-slate-400" data-testid="text-nav-previous">
              Previous: {formatCurrency(previousNAV)}
            </div>
          )}

          {showChart && history.length > 0 && (
            <div className="h-16 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={isPositive ? "#10b981" : "#ef4444"}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface NAVHistoryChartProps {
  history: Array<{ date: string; value: number }>;
  currency?: string;
}

export function NAVHistoryChart({ history, currency = "NGN" }: NAVHistoryChartProps) {
  if (history.length === 0) {
    return (
      <Card className="bg-white/5 backdrop-blur-md border-white/10">
        <CardContent className="pt-6 text-center text-slate-400">
          <p>No NAV history available yet</p>
        </CardContent>
      </Card>
    );
  }

  const currentValue = history[history.length - 1]?.value || 0;
  const firstValue = history[0]?.value || 0;
  const totalGrowth = currentValue - firstValue;
  const totalGrowthPercent = firstValue > 0 ? ((totalGrowth / firstValue) * 100) : 0;
  const isPositive = totalGrowth >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="relative overflow-hidden bg-white/5 backdrop-blur-md border-white/10">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/60 via-blue-500/60 to-emerald-500/60" />
        
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">NAV Performance</CardTitle>
            <div className={`flex items-center gap-2 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              <span className="text-lg font-bold" data-testid="text-total-growth">
                {isPositive ? '+' : ''}{totalGrowthPercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={isPositive ? "#10b981" : "#ef4444"}
                  strokeWidth={3}
                  dot={{ fill: isPositive ? "#10b981" : "#ef4444", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
            <div>
              <p className="text-xs text-slate-400 mb-1">First Recorded</p>
              <p className="text-lg font-semibold text-white" data-testid="text-first-nav">
                {new Intl.NumberFormat('en-NG', {
                  style: 'currency',
                  currency: currency,
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 8,
                }).format(firstValue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Current NAV</p>
              <p className="text-lg font-semibold text-white" data-testid="text-last-nav">
                {new Intl.NumberFormat('en-NG', {
                  style: 'currency',
                  currency: currency,
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 8,
                }).format(currentValue)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
