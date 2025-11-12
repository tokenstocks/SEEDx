import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Wallet, 
  Building2, 
  Activity, 
  Plus, 
  ExternalLink,
  CheckCircle2,
  XCircle,
  Send,
  ArrowRightLeft,
  Clock,
  AlertCircle,
  Shield,
} from "lucide-react";
import { motion } from "framer-motion";
import { PrimerFundingWizard } from "@/components/PrimerFundingWizard";
import UnifiedHeader from "@/components/UnifiedHeader";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { 
  PrimerStats, 
  PrimerContribution, 
  PrimerAllocation, 
  PrimerTimelineEvent,
  PrimerWalletBalances
} from "@/types/primer";

export default function PrimerDashboard() {
  const [showFundingWizard, setShowFundingWizard] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Queries with auto-refresh for real-time updates
  const { data: kycData } = useQuery<{
    kycStatus: string;
    kycDocuments?: any;
  }>({
    queryKey: ["/api/users/kyc-status"],
    refetchOnMount: "always",
    staleTime: 0,
  });

  const { data: walletData } = useQuery<PrimerWalletBalances>({
    queryKey: ["/api/primer/wallet/balances"],
    refetchOnMount: "always",
    staleTime: 0,
  });

  const { data: stats } = useQuery<PrimerStats>({
    queryKey: ["/api/primer/stats"],
  });

  const { data: contributions } = useQuery<PrimerContribution[]>({
    queryKey: ["/api/primer/contributions"],
  });

  const { data: allocations } = useQuery<PrimerAllocation[]>({
    queryKey: ["/api/primer/allocations"],
  });

  const { data: timeline, isLoading: timelineLoading } = useQuery<PrimerTimelineEvent[]>({
    queryKey: ["/api/primer/timeline"],
  });

  // Account lifecycle status helper
  const accountLifecycleStatus = useMemo(() => {
    // Only use fresh data from API queries - no localStorage fallbacks to avoid stale state
    const kycStatus = kycData?.kycStatus || "pending";
    const walletActivated = walletData?.activated || walletData?.activationStatus === "active";
    
    if (kycStatus === "rejected") {
      return {
        label: "KYC Rejected",
        badgeClass: "bg-red-600 text-white",
        icon: XCircle,
        callToAction: "Resubmit KYC documents to continue",
        canContribute: false,
      };
    }
    
    if (kycStatus === "pending" || kycStatus === "submitted") {
      return {
        label: kycStatus === "submitted" ? "KYC Under Review" : "Pending KYC",
        badgeClass: "bg-orange-500 text-white",
        icon: Clock,
        callToAction: kycStatus === "submitted" ? "Awaiting KYC approval" : "Complete KYC verification to contribute",
        canContribute: false,
      };
    }
    
    if (kycStatus === "approved" && !walletActivated) {
      return {
        label: "KYC Approved",
        badgeClass: "bg-blue-600 text-white",
        icon: CheckCircle2,
        callToAction: "Make your first contribution to activate wallet",
        canContribute: true,
      };
    }
    
    if (kycStatus === "approved" && walletActivated) {
      return {
        label: "Active Primer",
        badgeClass: "bg-emerald-600 text-white",
        icon: CheckCircle2,
        callToAction: "Account fully active",
        canContribute: true,
      };
    }
    
    return {
      label: "Pending KYC",
      badgeClass: "bg-slate-600 text-white",
      icon: AlertCircle,
      callToAction: "Complete KYC verification to contribute",
      canContribute: false,
    };
  }, [kycData, walletData]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "contribution_submitted":
        return <Send className="w-5 h-5 text-blue-400" />;
      case "contribution_approved":
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case "contribution_rejected":
        return <XCircle className="w-5 h-5 text-red-400" />;
      case "capital_allocated":
        return <ArrowRightLeft className="w-5 h-5 text-purple-400" />;
      default:
        return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "contribution_submitted":
        return "bg-blue-500/20 border-blue-500/30";
      case "contribution_approved":
        return "bg-emerald-500/20 border-emerald-500/30";
      case "contribution_rejected":
        return "bg-red-500/20 border-red-500/30";
      case "capital_allocated":
        return "bg-purple-500/20 border-purple-500/30";
      default:
        return "bg-slate-500/20 border-slate-500/30";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <UnifiedHeader />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-white" data-testid="text-dashboard-title">
              Primer Dashboard
            </h1>
            <p className="text-slate-400 mt-1">
              Track your contributions to the regenerative capital pool
            </p>
          </div>

          <Button
            onClick={() => setShowFundingWizard(true)}
            className="self-start bg-emerald-600 hover:bg-emerald-700"
            data-testid="button-contribute"
            disabled={!accountLifecycleStatus.canContribute}
          >
            <Plus className="w-4 h-4 mr-2" />
            Contribute to LP Pool
          </Button>
        </motion.div>

        {/* Setup Completion Banner */}
        {accountLifecycleStatus.label !== "Active Primer" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500/30 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Shield className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-white text-lg">Setup Your Primer Account</CardTitle>
                      <Badge className={accountLifecycleStatus.badgeClass} data-testid="badge-account-status">
                        {(() => {
                          const StatusIcon = accountLifecycleStatus.icon;
                          return <StatusIcon className="w-3 h-3 mr-1" />;
                        })()}
                        {accountLifecycleStatus.label}
                      </Badge>
                    </div>
                    <CardDescription className="text-slate-300">
                      {accountLifecycleStatus.callToAction}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Total Contributed
              </CardTitle>
              <Wallet className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-total-contributed">
                ₦{stats?.totalContributed?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Lifetime LP Pool contributions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Active Projects
              </CardTitle>
              <Building2 className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-active-projects">
                {stats?.activeProjects || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Funded through your LP share
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                LP Pool Share
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-pool-share">
                {stats?.poolSharePercent?.toFixed(2) || "0.00"}%
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Your ownership of the LP Pool
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Regenerators Enabled
              </CardTitle>
              <Activity className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-regenerators-enabled">
                {stats?.regeneratorsEnabled || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Token participants funded
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="contributions" className="space-y-4">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="contributions" data-testid="tab-contributions">
              My Contributions
            </TabsTrigger>
            <TabsTrigger value="allocations" data-testid="tab-allocations">
              Project Allocations
            </TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline">
              Capital Flow Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contributions" className="space-y-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Contribution History</CardTitle>
                <CardDescription className="text-slate-400">
                  Your LP Pool deposits and approvals
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contributions && contributions.length > 0 ? (
                  <div className="space-y-3">
                    {contributions.map((contribution: any) => (
                      <div
                        key={contribution.id}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                        data-testid={`contribution-${contribution.id}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">
                              ₦{parseFloat(contribution.amountNgnts).toLocaleString()}
                            </span>
                            <Badge
                              variant={
                                contribution.status === "approved"
                                  ? "default"
                                  : contribution.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                              }
                              data-testid={`status-${contribution.id}`}
                            >
                              {contribution.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-400">
                            {new Date(contribution.createdAt).toLocaleDateString()}
                          </p>
                          {contribution.txHash && (
                            <a
                              href={`https://stellar.expert/explorer/testnet/tx/${contribution.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                              data-testid={`tx-link-${contribution.id}`}
                            >
                              View Transaction
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        {contribution.lpPoolShareSnapshot && (
                          <div className="text-right">
                            <p className="text-sm font-medium text-white">
                              {contribution.lpPoolShareSnapshot}% Share
                            </p>
                            <p className="text-xs text-slate-500">LP Pool ownership</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No contributions yet</p>
                    <p className="text-sm mt-2">
                      Click "Contribute to LP Pool" to get started
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="allocations" className="space-y-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Project Allocations</CardTitle>
                <CardDescription className="text-slate-400">
                  Projects funded through your LP Pool share
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allocations && allocations.length > 0 ? (
                  <div className="space-y-3">
                    {allocations.map((allocation: any) => (
                      <div
                        key={allocation.id}
                        className="p-4 bg-white/5 rounded-lg border border-white/10"
                        data-testid={`allocation-${allocation.id}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-white">
                              {allocation.projectName}
                            </h4>
                            <p className="text-sm text-slate-400">
                              {new Date(allocation.allocationDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-emerald-400 border-emerald-400">
                            Active
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-slate-500">Your Share</p>
                            <p className="font-medium text-white">
                              ₦{parseFloat(allocation.yourShareAmount).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Total Allocated</p>
                            <p className="font-medium text-white">
                              ₦{parseFloat(allocation.totalAmount).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No project allocations yet</p>
                    <p className="text-sm mt-2">
                      Allocations will appear once admin funds projects
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Capital Flow Timeline</CardTitle>
                <CardDescription className="text-slate-400">
                  Track the regenerative cycle of your contributions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {timelineLoading ? (
                  <div className="text-center py-12 text-slate-400">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50 animate-spin" />
                    <p>Loading timeline...</p>
                  </div>
                ) : timeline && timeline.length > 0 ? (
                  <div className="space-y-4">
                    {timeline.map((event: any, index: number) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        data-testid={`timeline-event-${event.id}`}
                      >
                        <div className="flex gap-4">
                          {/* Timeline Line */}
                          <div className="flex flex-col items-center">
                            <div className={`p-2 rounded-full border ${getEventColor(event.type)}`}>
                              {getEventIcon(event.type)}
                            </div>
                            {index < timeline.length - 1 && (
                              <div className="w-0.5 h-full bg-white/10 mt-2" />
                            )}
                          </div>

                          {/* Event Content */}
                          <div className="flex-1 pb-6">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                {/* Event Title */}
                                {event.type === "contribution_submitted" && (
                                  <h4 className="font-medium text-white" data-testid="text-event-title">
                                    LP Contribution Submitted
                                  </h4>
                                )}
                                {event.type === "contribution_approved" && (
                                  <h4 className="font-medium text-emerald-400" data-testid="text-event-title">
                                    LP Contribution Approved ✓
                                  </h4>
                                )}
                                {event.type === "contribution_rejected" && (
                                  <h4 className="font-medium text-red-400" data-testid="text-event-title">
                                    LP Contribution Rejected
                                  </h4>
                                )}
                                {event.type === "capital_allocated" && (
                                  <h4 className="font-medium text-purple-400" data-testid="text-event-title">
                                    Capital Allocated to Project
                                  </h4>
                                )}

                                {/* Timestamp */}
                                <p className="text-xs text-slate-500 mt-0.5" data-testid="text-event-time">
                                  {formatTimestamp(event.timestamp)}
                                </p>
                              </div>
                            </div>

                            {/* Event Details */}
                            <div className="bg-white/5 rounded-lg border border-white/10 p-3 mt-2">
                              {/* Contribution Events */}
                              {(event.type === "contribution_submitted" || 
                                event.type === "contribution_approved" || 
                                event.type === "contribution_rejected") && (
                                <>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-slate-400">Amount</span>
                                    <span className="font-medium text-white" data-testid="text-event-amount">
                                      ₦{parseFloat(event.data.amount).toLocaleString()}
                                    </span>
                                  </div>
                                  
                                  {event.type === "contribution_approved" && event.data.txHash && (
                                    <div className="mt-2 pt-2 border-t border-white/10">
                                      <p className="text-xs text-slate-500 mb-1">Blockchain Transaction</p>
                                      <code className="text-xs text-emerald-400 font-mono break-all" data-testid="text-event-txhash">
                                        {event.data.txHash}
                                      </code>
                                      {event.data.lpPoolShare && (
                                        <p className="text-xs text-slate-400 mt-2">
                                          LP Share: {parseFloat(event.data.lpPoolShare).toFixed(2)}%
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {event.type === "contribution_rejected" && event.data.reason && (
                                    <div className="mt-2 pt-2 border-t border-white/10">
                                      <p className="text-xs text-red-400" data-testid="text-event-reason">
                                        Reason: {event.data.reason}
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Allocation Events */}
                              {event.type === "capital_allocated" && (
                                <>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-slate-400">Project</span>
                                      <span className="font-medium text-white" data-testid="text-event-project">
                                        {event.data.projectName}
                                      </span>
                                    </div>
                                    {event.data.projectLocation && (
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-400">Location</span>
                                        <span className="text-sm text-slate-300">
                                          {event.data.projectLocation}
                                        </span>
                                      </div>
                                    )}
                                    <Separator className="bg-white/10" />
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-slate-400">Your Share</span>
                                      <span className="font-medium text-purple-400" data-testid="text-event-share">
                                        ₦{parseFloat(event.data.shareAmount).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-slate-400">Share %</span>
                                      <span className="text-sm text-slate-300">
                                        {parseFloat(event.data.sharePercent).toFixed(2)}%
                                      </span>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No activity yet</p>
                    <p className="text-sm mt-2">
                      Your contribution timeline will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Funding Wizard */}
      <PrimerFundingWizard
        open={showFundingWizard}
        onOpenChange={setShowFundingWizard}
      />
    </div>
  );
}
