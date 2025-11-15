import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, Users, DollarSign, Wallet } from "lucide-react";
import { Link } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  name: string;
}

interface Distribution {
  id: string;
  projectId: string;
  projectName: string;
  amountNgnts: string;
  distributedAt: string | null;
  regeneratorCount: number;
  regeneratorTotal: string;
}

interface DistributionSummary {
  distributions: Distribution[];
  summary: {
    totalLpReplenishment: string;
    totalTreasury: string;
    totalDistributions: number;
  };
}

export default function AdminRCXDistributions() {
  const [selectedProject, setSelectedProject] = useState<string>("all");

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: distributionsData, isLoading } = useQuery<DistributionSummary>({
    queryKey: ["/api/admin/rcx/distributions", { projectId: selectedProject !== "all" ? selectedProject : undefined }],
    queryFn: async () => {
      const params = selectedProject !== "all" ? `?projectId=${selectedProject}` : "";
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/rcx/distributions${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const filteredDistributions = distributionsData?.distributions || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="sm" data-testid="button-back-to-admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">RCX Model: Distribution History</h1>
            <p className="text-slate-400 mt-1">View executed distributions and summary metrics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-emerald-500/10 border-emerald-500/20 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Total LP Replenishment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">
                ₦{distributionsData ? parseFloat(distributionsData.summary.totalLpReplenishment).toLocaleString() : "0"}
              </p>
              <p className="text-xs text-slate-400 mt-1">Across all distributions</p>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/10 border-purple-500/20 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-400 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Total Treasury Allocation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">
                ₦{distributionsData ? parseFloat(distributionsData.summary.totalTreasury).toLocaleString() : "0"}
              </p>
              <p className="text-xs text-slate-400 mt-1">Across all distributions</p>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/10 border-blue-500/20 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Distributions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">
                {distributionsData?.summary.totalDistributions || 0}
              </p>
              <p className="text-xs text-slate-400 mt-1">Executed successfully</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-white">Distribution Events</CardTitle>
                <CardDescription className="text-slate-400">
                  Historical record of all executed distributions
                </CardDescription>
              </div>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-[200px]" data-testid="select-filter-project">
                  <SelectValue placeholder="Filter by project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id} data-testid={`option-filter-${project.id}`}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-slate-400">Loading distributions...</div>
            ) : filteredDistributions.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No distributions found</p>
                <p className="text-sm mt-2">Execute your first distribution from the Project Revenue page</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {filteredDistributions.map((distribution) => (
                    <Card key={distribution.id} className="bg-white/5 border-white/10" data-testid={`card-distribution-${distribution.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-white text-lg">{distribution.projectName}</h3>
                            <p className="text-xs text-slate-500">
                              {distribution.distributedAt
                                ? new Date(distribution.distributedAt).toLocaleString()
                                : "N/A"}
                            </p>
                          </div>
                          <Badge className="bg-emerald-500/20 text-emerald-400">Completed</Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-2 bg-white/5 rounded">
                            <p className="text-xs text-slate-400 mb-1">Total Revenue</p>
                            <p className="font-bold text-white">
                              ₦{parseFloat(distribution.amountNgnts).toLocaleString()}
                            </p>
                          </div>

                          <div className="p-2 bg-emerald-500/10 rounded">
                            <p className="text-xs text-emerald-400 mb-1">LP Pool (40%)</p>
                            <p className="font-bold text-white text-sm">
                              ₦{(parseFloat(distribution.amountNgnts) * 0.4).toLocaleString()}
                            </p>
                          </div>

                          <div className="p-2 bg-blue-500/10 rounded">
                            <p className="text-xs text-blue-400 mb-1">Regenerators (30%)</p>
                            <p className="font-bold text-white text-sm">
                              ₦{parseFloat(distribution.regeneratorTotal).toLocaleString()}
                            </p>
                          </div>

                          <div className="p-2 bg-purple-500/10 rounded">
                            <p className="text-xs text-purple-400 mb-1">Treasury (20%)</p>
                            <p className="font-bold text-white text-sm">
                              ₦{(parseFloat(distribution.amountNgnts) * 0.2).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{distribution.regeneratorCount} Regenerator{distribution.regeneratorCount !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Distribution Breakdown</CardTitle>
            <CardDescription className="text-slate-400">
              Understanding RCX cashflow allocation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full mt-1"></div>
                  <div>
                    <p className="font-semibold text-white">LP Pool Replenishment (40%)</p>
                    <p className="text-sm text-slate-400">
                      Regenerates liquidity pool capital to sustain ecosystem
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mt-1"></div>
                  <div>
                    <p className="font-semibold text-white">Regenerator Distribution (30%)</p>
                    <p className="text-sm text-slate-400">
                      Pro-rata distribution to token holders based on holdings
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mt-1"></div>
                  <div>
                    <p className="font-semibold text-white">Treasury Allocation (20%)</p>
                    <p className="text-sm text-slate-400">
                      Platform treasury for operations and reserves
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mt-1"></div>
                  <div>
                    <p className="font-semibold text-white">Project Retained (10%)</p>
                    <p className="text-sm text-slate-400">
                      Retained by project for ongoing operations
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
