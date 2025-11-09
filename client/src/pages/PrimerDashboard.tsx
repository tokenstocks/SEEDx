import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Wallet, Building2, Activity, Plus, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import PrimerContributionForm from "@/components/PrimerContributionForm";
import PrimerHeader from "@/components/PrimerHeader";
import { Badge } from "@/components/ui/badge";

export default function PrimerDashboard() {
  const [showContributionForm, setShowContributionForm] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const { data: stats } = useQuery({
    queryKey: ["/api/primer/stats"],
  });

  const { data: contributions } = useQuery({
    queryKey: ["/api/primer/contributions"],
  });

  const { data: allocations } = useQuery({
    queryKey: ["/api/primer/allocations"],
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <PrimerHeader />
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
            onClick={() => setShowContributionForm(true)}
            className="self-start bg-emerald-600 hover:bg-emerald-700"
            data-testid="button-contribute"
          >
            <Plus className="w-4 h-4 mr-2" />
            Contribute to LP Pool
          </Button>
        </motion.div>

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
                <div className="text-center py-12 text-slate-400">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Timeline view coming soon</p>
                  <p className="text-sm mt-2">
                    Real-time capital flow visualization
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Contribution Form Modal */}
      {showContributionForm && (
        <PrimerContributionForm onClose={() => setShowContributionForm(false)} />
      )}
    </div>
  );
}
