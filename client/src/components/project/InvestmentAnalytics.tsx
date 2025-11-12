import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, DollarSign, Target, Zap, Calendar } from "lucide-react";
import InvestmentTimelineChart from "./InvestmentTimelineChart";
import InvestorLeaderboard from "./InvestorLeaderboard";

interface InvestmentAnalyticsProps {
  projectId: string;
}

interface AnalyticsData {
  projectId: string;
  projectName: string;
  totalRaised: string;
  fundingTarget: string;
  fundingProgress: string;
  investorCount: number;
  totalInvestments: number;
  avgInvestment: string;
  largestInvestment: string;
  velocity: {
    dailyAvg: string;
    weeklyAvg: string;
    last30Days: number;
    last30DaysTotal: string;
  };
  projectedCompletion: {
    daysRemaining: number;
    estimatedDate: string;
  } | null;
}

export default function InvestmentAnalytics({ projectId }: InvestmentAnalyticsProps) {
  const [anonymize, setAnonymize] = useState(false);
  const [timelineInterval, setTimelineInterval] = useState<'daily' | 'weekly'>('daily');

  // Fetch analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/admin/projects', projectId, 'investment-analytics'],
    refetchInterval: 30000, // Refresh every 30s
  });

  // Fetch investors (with query parameter support)
  const { data: investorsData, isLoading: investorsLoading, refetch: refetchInvestors } = useQuery<{
    projectId: string;
    projectName: string;
    totalInvestors: number;
    anonymized: boolean;
    investors: any[];
  }>({
    queryKey: ['/api/admin/projects', projectId, 'investors', { anonymize }],
    queryFn: async () => {
      const url = `/api/admin/projects/${projectId}/investors?anonymize=${anonymize}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch investors');
      return response.json();
    },
  });

  // Fetch timeline (with query parameters)
  const { data: timelineData, isLoading: timelineLoading } = useQuery<{
    projectId: string;
    projectName: string;
    interval: string;
    days: number;
    dataPoints: number;
    timeline: any[];
  }>({
    queryKey: ['/api/admin/projects', projectId, 'investment-timeline', { interval: timelineInterval, days: 30 }],
    queryFn: async () => {
      const url = `/api/admin/projects/${projectId}/investment-timeline?interval=${timelineInterval}&days=30`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch timeline');
      return response.json();
    },
  });

  const handleToggleAnonymize = () => {
    setAnonymize(!anonymize);
    // Query key will change and trigger refetch automatically
  };

  const formatNGN = (value: string | undefined) => {
    if (!value) return "₦0.00";
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(parseFloat(value));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Metrics Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Raised */}
        <Card className="bg-white/5 backdrop-blur-md border-white/10" data-testid="card-total-raised">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Total Raised
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="space-y-1">
                <p className="text-2xl font-bold text-emerald-400" data-testid="text-total-raised">
                  {formatNGN(analytics?.totalRaised)}
                </p>
                <p className="text-xs text-slate-400">
                  {analytics?.fundingProgress}% of {formatNGN(analytics?.fundingTarget)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unique Investors */}
        <Card className="bg-white/5 backdrop-blur-md border-white/10" data-testid="card-investor-count">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Unique Investors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="space-y-1">
                <p className="text-2xl font-bold text-blue-400" data-testid="text-investor-count">
                  {analytics?.investorCount || 0}
                </p>
                <p className="text-xs text-slate-400">
                  {analytics?.totalInvestments || 0} total investments
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Avg Investment */}
        <Card className="bg-white/5 backdrop-blur-md border-white/10" data-testid="card-avg-investment">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              Avg Investment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <p className="text-2xl font-bold text-purple-400" data-testid="text-avg-investment">
                {formatNGN(analytics?.avgInvestment)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Largest Investment */}
        <Card className="bg-white/5 backdrop-blur-md border-white/10" data-testid="card-largest-investment">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              Largest Investment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <p className="text-2xl font-bold text-orange-400" data-testid="text-largest-investment">
                {formatNGN(analytics?.largestInvestment)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Velocity & Projected Completion */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-white/5 backdrop-blur-md border-white/10" data-testid="card-velocity">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Zap className="w-5 h-5 text-yellow-400" />
              Funding Velocity
            </CardTitle>
            <CardDescription>
              Capital raise rate over last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Daily Average</span>
                  <span className="text-lg font-semibold text-yellow-400" data-testid="text-daily-velocity">
                    {formatNGN(analytics?.velocity.dailyAvg)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Weekly Average</span>
                  <span className="text-lg font-semibold text-yellow-400">
                    {formatNGN(analytics?.velocity.weeklyAvg)}
                  </span>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-slate-400">
                    {analytics?.velocity.last30Days} investments totaling {formatNGN(analytics?.velocity.last30DaysTotal)} in last 30 days
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-md border-white/10" data-testid="card-projected-completion">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calendar className="w-5 h-5 text-cyan-400" />
              Projected Completion
            </CardTitle>
            <CardDescription>
              Estimated funding target completion
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : analytics?.projectedCompletion ? (
              <div className="space-y-3">
                <div>
                  <p className="text-3xl font-bold text-cyan-400" data-testid="text-days-remaining">
                    {analytics.projectedCompletion.daysRemaining} days
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Estimated date: {formatDate(analytics.projectedCompletion.estimatedDate)}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  Based on current velocity
                </Badge>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-slate-400">
                  {parseFloat(analytics?.fundingProgress || "0") >= 100 
                    ? "Funding goal reached!" 
                    : "Insufficient velocity data"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart */}
      {!timelineLoading && timelineData && (
        <InvestmentTimelineChart
          data={timelineData.timeline}
          interval={timelineInterval}
        />
      )}

      {/* Investor Leaderboard */}
      {!investorsLoading && investorsData && (
        <InvestorLeaderboard
          investors={investorsData.investors}
          anonymized={investorsData.anonymized}
          onToggleAnonymize={handleToggleAnonymize}
        />
      )}
    </div>
  );
}
