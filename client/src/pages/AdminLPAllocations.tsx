import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Plus, Loader2, Building2, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLPAllocations() {
  const { toast } = useToast();
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [allocationAmount, setAllocationAmount] = useState("");
  const [allocationPurpose, setAllocationPurpose] = useState("");

  const { data: stats } = useQuery<{
    availableCapital: number;
    totalAllocated: number;
    activeAllocations: number;
  }>({
    queryKey: ["/api/admin/lp-allocation-stats"],
  });

  const { data: projects } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  const { data: allocations } = useQuery<any[]>({
    queryKey: ["/api/admin/lp-allocations"],
  });

  const allocateMutation = useMutation({
    mutationFn: async (data: { projectId: string; amount: string; purpose: string }) => {
      const response = await apiRequest("POST", "/api/admin/lp-allocations", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "LP Pool allocation successful",
        description: "Funds have been allocated to the project",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lp-allocation-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lp-allocations"] });
      setShowAllocationDialog(false);
      setSelectedProjectId("");
      setAllocationAmount("");
      setAllocationPurpose("");
    },
    onError: (error: any) => {
      toast({
        title: "Allocation failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleAllocate = () => {
    if (!selectedProjectId || !allocationAmount) {
      toast({
        title: "Missing information",
        description: "Please select a project and enter an amount",
        variant: "destructive",
      });
      return;
    }

    allocateMutation.mutate({
      projectId: selectedProjectId,
      amount: allocationAmount,
      purpose: allocationPurpose,
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
          className="flex flex-col gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">
              LP Pool Allocations
            </h1>
            <p className="text-slate-400 mt-1">
              Allocate Primer capital from the LP Pool to agricultural projects
            </p>
          </div>

          <Button
            onClick={() => setShowAllocationDialog(true)}
            className="self-start bg-emerald-600 hover:bg-emerald-700"
            data-testid="button-new-allocation"
          >
            <Plus className="w-4 h-4 mr-2" />
            New LP Allocation
          </Button>
        </motion.div>

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
                ₦{stats?.availableCapital?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Unallocated LP Pool funds
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
                ₦{stats?.totalAllocated?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Deployed to projects
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Active Allocations
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-active-allocations">
                {stats?.activeAllocations || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Projects funded from LP Pool
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Allocations Table */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Allocation History</CardTitle>
            <CardDescription className="text-slate-400">
              LP Pool funds deployed to agricultural projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allocations && allocations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-slate-300">Project</TableHead>
                    <TableHead className="text-slate-300">Amount</TableHead>
                    <TableHead className="text-slate-300">Purpose</TableHead>
                    <TableHead className="text-slate-300">Date</TableHead>
                    <TableHead className="text-slate-300">Primers Involved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((allocation: any) => (
                    <TableRow key={allocation.id} className="border-white/10">
                      <TableCell className="text-white font-medium">
                        {allocation.projectName}
                      </TableCell>
                      <TableCell className="text-emerald-400">
                        ₦{parseFloat(allocation.totalAmountNgnts).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-slate-400 max-w-xs truncate">
                        {allocation.purpose || "General project funding"}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {new Date(allocation.allocationDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-blue-400">
                        {allocation.primerCount} Primer{allocation.primerCount !== 1 ? 's' : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No LP Pool allocations yet</p>
                <p className="text-sm mt-2">
                  Click "New LP Allocation" to deploy Primer capital to projects
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
            <DialogTitle className="text-2xl">Allocate LP Pool Funds</DialogTitle>
            <DialogDescription className="text-slate-400">
              Deploy Primer capital from the LP Pool to a project
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
                onChange={(e) => setAllocationAmount(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                data-testid="input-amount"
              />
              <p className="text-xs text-slate-500">
                Available: ₦{stats?.availableCapital?.toLocaleString() || "0"}
              </p>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label htmlFor="purpose" className="text-slate-300">
                Allocation Purpose (Optional)
              </Label>
              <Textarea
                id="purpose"
                placeholder="Seed purchase, equipment, irrigation system..."
                value={allocationPurpose}
                onChange={(e) => setAllocationPurpose(e.target.value)}
                className="bg-white/5 border-white/10 text-white resize-none"
                rows={3}
                data-testid="input-purpose"
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h4 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Allocation Process
              </h4>
              <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                <li>Funds will be deducted from the LP Pool wallet</li>
                <li>All Primers will participate based on their LP share %</li>
                <li>Individual Primer allocations will be calculated automatically</li>
                <li>Project will receive the full allocated amount</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAllocationDialog(false)}
              disabled={allocateMutation.isPending}
              className="border-white/10 text-white hover:bg-white/5"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAllocate}
              disabled={allocateMutation.isPending || !selectedProjectId || !allocationAmount}
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
    </div>
  );
}
