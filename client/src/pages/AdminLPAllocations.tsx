import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Plus, Loader2, Building2, AlertCircle, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface LPOverview {
  lpPool: {
    totalNgnts: number;
    totalAllocated: number;
    unallocated: number;
    criticalAlert: boolean;
  };
  projects: Array<{
    id: string;
    name: string;
    lpCapitalAllocated: string;
    lpCapitalDeployed: string;
    walletPublicKey: string | null;
    walletCreatedAt: Date | null;
    currentBalance: number;
  }>;
}

interface ReconciliationResult {
  projectId: string;
  projectName: string;
  onChainBalance: number;
  dbExpectedBalance: number;
  discrepancy: number;
  needsReconciliation: boolean;
  error?: string;
}

export default function AdminLPAllocations() {
  const { toast } = useToast();
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  const [showReconciliationDialog, setShowReconciliationDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [allocationAmount, setAllocationAmount] = useState("");
  const [allocationWarning, setAllocationWarning] = useState("");

  const { data: overview, isLoading: overviewLoading } = useQuery<LPOverview>({
    queryKey: ["/api/admin/lp-allocations/overview"],
  });

  const { data: projects } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  const allocateMutation = useMutation({
    mutationFn: async (data: { projectId: string; amountNgnts: number }) => {
      const response = await apiRequest("POST", "/api/admin/lp-allocations/allocate", data);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.status === "partial_success") {
        toast({
          title: "⚠️ Partial Success",
          description: data.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "✅ LP Pool allocation successful",
          description: "Funds have been allocated to the project",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lp-allocations/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowAllocationDialog(false);
      setSelectedProjectId("");
      setAllocationAmount("");
      setAllocationWarning("");
    },
    onError: (error: any) => {
      toast({
        title: "❌ Allocation failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/admin/lp-allocations/reconcile-all");
      return await response.json();
    },
    onSuccess: (data: { totalProjects: number; issuesFound: number; results: ReconciliationResult[]; status: string }) => {
      toast({
        title: data.status,
        description: `Reconciled ${data.totalProjects} projects. ${data.issuesFound} discrepancies found.`,
      });
      setShowReconciliationDialog(true);
    },
    onError: (error: any) => {
      toast({
        title: "Reconciliation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAmountChange = (value: string) => {
    setAllocationAmount(value);
    
    if (!overview || !value) {
      setAllocationWarning("");
      return;
    }

    const amount = parseFloat(value);
    const available = overview.lpPool.totalNgnts;
    
    if (isNaN(amount)) {
      setAllocationWarning("");
      return;
    }

    if (amount > available) {
      setAllocationWarning(`❌ Insufficient funds. Available: ₦${available.toLocaleString()}`);
    } else if (amount > available * 0.5) {
      setAllocationWarning(`⚠️ WARNING: This allocation is ${((amount/available)*100).toFixed(1)}% of total LP Pool capital`);
    } else {
      setAllocationWarning("");
    }
  };

  const handleAllocate = () => {
    if (!selectedProjectId || !allocationAmount) {
      toast({
        title: "Missing information",
        description: "Please select a project and enter an amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(allocationAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }

    allocateMutation.mutate({
      projectId: selectedProjectId,
      amountNgnts: amount,
    });
  };

  const availableProjects = projects?.filter((p: any) => p.status === "active") || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">
              LP Pool Capital Allocation
            </h1>
            <p className="text-slate-400 mt-1">
              Deploy Primer capital from LP Pool to agricultural projects
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => reconcileMutation.mutate()}
              disabled={reconcileMutation.isPending}
              variant="outline"
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              data-testid="button-reconcile"
            >
              {reconcileMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reconciling...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reconcile All
                </>
              )}
            </Button>
            
            <Button
              onClick={() => setShowAllocationDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-new-allocation"
            >
              <Plus className="w-4 h-4 mr-2" />
              Allocate Capital
            </Button>
          </div>
        </motion.div>

        {/* Critical Alert */}
        {overview?.lpPool.criticalAlert && (
          <Alert className="border-red-500/30 bg-red-500/10">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertTitle className="text-red-400">Critical: LP Pool Low Capital</AlertTitle>
            <AlertDescription className="text-red-300">
              LP Pool capital has fallen below ₦250,000. Please coordinate with Primers to replenish.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Available LP Capital
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-available-capital">
                ₦{overview?.lpPool.totalNgnts?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Unallocated NGNTS in LP Pool
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Total Allocated
              </CardTitle>
              <Building2 className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-total-allocated">
                ₦{overview?.lpPool.totalAllocated?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Deployed to projects
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Active Projects
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-active-projects">
                {overview?.projects?.length || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Funded from LP Pool
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Projects Table */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Project Allocations</CardTitle>
            <CardDescription className="text-slate-400">
              LP Pool capital allocated to agricultural projects with wallet details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview && overview.projects.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-slate-300">Project</TableHead>
                      <TableHead className="text-slate-300">Allocated</TableHead>
                      <TableHead className="text-slate-300">On-Chain Balance</TableHead>
                      <TableHead className="text-slate-300">Wallet Status</TableHead>
                      <TableHead className="text-slate-300">Wallet Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.projects.map((project: any) => (
                      <TableRow key={project.id} className="border-white/10">
                        <TableCell className="text-white font-medium">
                          {project.name}
                        </TableCell>
                        <TableCell className="text-emerald-400">
                          ₦{parseFloat(project.lpCapitalAllocated).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-blue-400">
                          ₦{project.currentBalance.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {project.walletPublicKey ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span className="text-emerald-400 text-sm">Active</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-slate-500" />
                              <span className="text-slate-500 text-sm">No wallet</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-400 font-mono text-xs">
                          {project.walletPublicKey ? (
                            <span title={project.walletPublicKey}>
                              {project.walletPublicKey.substring(0, 8)}...
                              {project.walletPublicKey.substring(project.walletPublicKey.length - 4)}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No LP Pool allocations yet</p>
                <p className="text-sm mt-2">
                  Click "Allocate Capital" to deploy Primer capital to projects
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Allocation Dialog */}
      <Dialog open={showAllocationDialog} onOpenChange={setShowAllocationDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Allocate LP Pool Capital</DialogTitle>
            <DialogDescription className="text-slate-400">
              Transfer NGNTS from LP Pool to project operational wallet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Project Selection */}
            <div className="space-y-2">
              <Label htmlFor="project" className="text-slate-300">
                Select Project
              </Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-project">
                  <SelectValue placeholder="Choose a project..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  {availableProjects.length > 0 ? (
                    availableProjects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No active projects available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-slate-300">
                Allocation Amount (NGNTS)
              </Label>
              <Input
                id="amount"
                type="text"
                placeholder="100000.00"
                value={allocationAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                data-testid="input-amount"
              />
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-slate-500">
                  Available: ₦{overview?.lpPool.totalNgnts?.toLocaleString() || "0"}
                </p>
                {allocationWarning && (
                  <p className={`text-xs ${allocationWarning.startsWith('❌') ? 'text-red-400' : 'text-yellow-400'}`}>
                    {allocationWarning}
                  </p>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h4 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Allocation Process
              </h4>
              <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                <li>If first allocation: Project wallet will be auto-created (3.0 XLM + NGNTS trustline)</li>
                <li>NGNTS transferred from LP Pool to project wallet on Stellar network</li>
                <li>All Primers participate proportionally based on their LP Pool share</li>
                <li>Transaction is atomic - either succeeds completely or rolls back</li>
              </ul>
            </div>

            {/* Safety Warning for Large Allocations */}
            {parseFloat(allocationAmount) > (overview?.lpPool.totalNgnts || 0) * 0.5 && (
              <Alert className="border-yellow-500/30 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertTitle className="text-yellow-400">Large Allocation Warning</AlertTitle>
                <AlertDescription className="text-yellow-300 text-sm">
                  This allocation exceeds 50% of available LP Pool capital. Please verify the amount.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAllocationDialog(false);
                setAllocationWarning("");
              }}
              disabled={allocateMutation.isPending}
              className="border-white/10 text-white hover:bg-white/5"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAllocate}
              disabled={
                allocateMutation.isPending ||
                !selectedProjectId ||
                !allocationAmount ||
                parseFloat(allocationAmount) > (overview?.lpPool.totalNgnts || 0)
              }
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-allocate"
            >
              {allocateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Allocating...
                </>
              ) : (
                "Allocate Funds"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reconciliation Dialog */}
      <Dialog open={showReconciliationDialog} onOpenChange={setShowReconciliationDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Reconciliation Results</DialogTitle>
            <DialogDescription className="text-slate-400">
              On-chain balances vs database records
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto">
            {reconcileMutation.data && (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-slate-300">Project</TableHead>
                    <TableHead className="text-slate-300">On-Chain</TableHead>
                    <TableHead className="text-slate-300">Expected</TableHead>
                    <TableHead className="text-slate-300">Discrepancy</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconcileMutation.data.results.map((result: ReconciliationResult) => (
                    <TableRow key={result.projectId} className="border-white/10">
                      <TableCell className="text-white font-medium">
                        {result.projectName}
                      </TableCell>
                      <TableCell className="text-blue-400">
                        ₦{result.onChainBalance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        ₦{result.dbExpectedBalance.toLocaleString()}
                      </TableCell>
                      <TableCell className={result.needsReconciliation ? "text-red-400" : "text-emerald-400"}>
                        {result.discrepancy >= 0 ? "+" : ""}₦{result.discrepancy.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {result.needsReconciliation ? (
                          <span className="text-red-400">⚠️ Mismatch</span>
                        ) : (
                          <span className="text-emerald-400">✅ OK</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowReconciliationDialog(false)}
              className="bg-white/5 hover:bg-white/10"
              data-testid="button-close-reconciliation"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
