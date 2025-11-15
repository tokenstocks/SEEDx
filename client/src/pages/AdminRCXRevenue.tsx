import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Eye, Play } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const recordRevenueSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  amountNgnts: z.string().min(1, "Amount is required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be a positive number"),
  source: z.string().default("Bank Deposit"),
  receipt: z.instanceof(File).optional(),
});

type RecordRevenueForm = z.infer<typeof recordRevenueSchema>;

interface Project {
  id: string;
  name: string;
  lpReplenishmentPercent: string;
  regeneratorDistributionPercent: string;
  treasuryPercent: string;
  projectRetainedPercent: string;
}

interface ProjectCashflow {
  id: string;
  projectId: string;
  projectName: string;
  amountNgnts: string;
  source: string;
  sourceDocumentUrl: string | null;
  status: string;
  processed: boolean;
  distributedAt: string | null;
  createdAt: string;
}

interface DistributionPreview {
  cashflowId: string;
  projectId: string;
  totalAmount: string;
  split: {
    lpReplenishment: string;
    regeneratorDistribution: string;
    treasury: string;
    projectRetained: string;
  };
  regeneratorAllocations: Array<{
    userId: string;
    tokensHeld: string;
    shareAmount: string;
    sharePercentage: string;
  }>;
}

export default function AdminRCXRevenue() {
  const { toast } = useToast();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewDialog, setPreviewDialog] = useState<{ cashflowId: string; open: boolean } | null>(null);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: cashflowsData, isLoading: cashflowsLoading } = useQuery<{ cashflows: ProjectCashflow[] }>({
    queryKey: ["/api/admin/rcx/project-revenue"],
  });

  const { data: previewData, isLoading: previewLoading, error: previewError } = useQuery<DistributionPreview>({
    queryKey: ["/api/admin/rcx/distributions/preview", previewDialog?.cashflowId],
    queryFn: async () => {
      if (!previewDialog?.cashflowId) throw new Error("No cashflow ID");
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/rcx/distributions/preview/${previewDialog.cashflowId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!previewDialog?.cashflowId && previewDialog.open,
  });

  const form = useForm<RecordRevenueForm>({
    resolver: zodResolver(recordRevenueSchema),
    defaultValues: {
      source: "Bank Deposit",
    },
  });

  const recordRevenueMutation = useMutation({
    mutationFn: async (data: RecordRevenueForm) => {
      const formData = new FormData();
      formData.append("projectId", data.projectId);
      formData.append("amountNgnts", data.amountNgnts);
      formData.append("source", data.source);
      if (data.receipt) {
        formData.append("receipt", data.receipt);
      }

      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/rcx/project-revenue", {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rcx/project-revenue"] });
      toast({
        title: "Revenue Recorded",
        description: "Project revenue has been recorded successfully",
      });
      form.reset();
      setReceiptFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record revenue",
        variant: "destructive",
      });
    },
  });

  const executeDistributionMutation = useMutation({
    mutationFn: async (cashflowId: string) => {
      const res = await apiRequest("POST", "/api/admin/rcx/distributions/execute", { cashflowId });
      return await res.json();
    },
    onSuccess: (_, cashflowId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rcx/project-revenue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rcx/distributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rcx/distributions/preview", cashflowId] });
      toast({
        title: "Distribution Executed",
        description: "Cashflow distribution has been executed successfully",
      });
      setPreviewDialog(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to execute distribution",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: RecordRevenueForm) => {
    const formData: RecordRevenueForm = {
      ...data,
      receipt: receiptFile || undefined,
    };
    recordRevenueMutation.mutate(formData);
  };

  const pendingCashflows = cashflowsData?.cashflows.filter((c) => !c.processed) || [];
  const distributedCashflows = cashflowsData?.cashflows.filter((c) => c.processed) || [];

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
            <h1 className="text-3xl font-bold text-white">RCX Model: Project Revenue</h1>
            <p className="text-slate-400 mt-1">Record bank deposits and execute manual distributions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Record New Revenue</CardTitle>
              <CardDescription className="text-slate-400">
                Record bank deposits received from project operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Project</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-project">
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projects?.map((project) => (
                              <SelectItem key={project.id} value={project.id} data-testid={`option-project-${project.id}`}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amountNgnts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Amount (NGNTS)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="100.00"
                            {...field}
                            className="bg-white/10 border-white/20 text-white"
                            data-testid="input-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Source</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-white/10 border-white/20 text-white"
                            data-testid="input-source"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel className="text-white">Receipt (Optional)</FormLabel>
                    <div className="mt-2">
                      <label
                        htmlFor="receipt-upload"
                        className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-white/20 rounded-md cursor-pointer hover-elevate bg-white/5"
                      >
                        <Upload className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-400">
                          {receiptFile ? receiptFile.name : "Upload receipt (PDF, JPG, PNG)"}
                        </span>
                      </label>
                      <input
                        id="receipt-upload"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        data-testid="input-receipt"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={recordRevenueMutation.isPending}
                    data-testid="button-record-revenue"
                  >
                    {recordRevenueMutation.isPending ? "Recording..." : "Record Revenue"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Pending Revenue Queue ({pendingCashflows.length})</CardTitle>
              <CardDescription className="text-slate-400">
                Awaiting distribution execution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {cashflowsLoading ? (
                  <div className="text-center py-8 text-slate-400">Loading...</div>
                ) : pendingCashflows.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    No pending revenue entries
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingCashflows.map((cashflow) => (
                      <div
                        key={cashflow.id}
                        className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-white">{cashflow.projectName}</p>
                            <p className="text-sm text-slate-400">{cashflow.source}</p>
                          </div>
                          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                            Pending
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-emerald-400">
                            ₦{parseFloat(cashflow.amountNgnts).toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(cashflow.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewDialog({ cashflowId: cashflow.id, open: true })}
                            data-testid={`button-preview-${cashflow.id}`}
                            className="flex-1"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Preview & Execute
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Recently Distributed ({distributedCashflows.length})</CardTitle>
            <CardDescription className="text-slate-400">
              Revenue entries that have been processed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {distributedCashflows.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                No distributions executed yet
              </div>
            ) : (
              <div className="space-y-2">
                {distributedCashflows.slice(0, 10).map((cashflow) => (
                  <div
                    key={cashflow.id}
                    className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-white">{cashflow.projectName}</p>
                      <p className="text-xs text-slate-500">
                        Distributed {cashflow.distributedAt ? new Date(cashflow.distributedAt).toLocaleString() : "N/A"}
                      </p>
                    </div>
                    <span className="font-bold text-emerald-400">
                      ₦{parseFloat(cashflow.amountNgnts).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={previewDialog?.open || false} onOpenChange={(open) => setPreviewDialog(open ? previewDialog : null)}>
        <DialogContent className="max-w-2xl bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Distribution Preview</DialogTitle>
            <DialogDescription className="text-slate-400">
              Review calculated split before executing distribution
            </DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <div className="text-center py-8 text-slate-400">Loading preview...</div>
          ) : previewData ? (
            <div className="space-y-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-sm text-slate-400 mb-2">Total Revenue</p>
                <p className="text-2xl font-bold text-white">
                  ₦{parseFloat(previewData.totalAmount).toLocaleString()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-xs text-emerald-400 mb-1">LP Replenishment</p>
                  <p className="text-lg font-bold text-white">
                    ₦{parseFloat(previewData.split.lpReplenishment).toLocaleString()}
                  </p>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-400 mb-1">Regenerator Distribution</p>
                  <p className="text-lg font-bold text-white">
                    ₦{parseFloat(previewData.split.regeneratorDistribution).toLocaleString()}
                  </p>
                </div>

                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <p className="text-xs text-purple-400 mb-1">Treasury</p>
                  <p className="text-lg font-bold text-white">
                    ₦{parseFloat(previewData.split.treasury).toLocaleString()}
                  </p>
                </div>

                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-xs text-yellow-400 mb-1">Project Retained</p>
                  <p className="text-lg font-bold text-white">
                    ₦{parseFloat(previewData.split.projectRetained).toLocaleString()}
                  </p>
                </div>
              </div>

              {previewData.regeneratorAllocations.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-white mb-2">
                    Regenerator Allocations ({previewData.regeneratorAllocations.length})
                  </p>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {previewData.regeneratorAllocations.map((allocation, index) => (
                        <div
                          key={allocation.userId}
                          className="flex items-center justify-between p-2 bg-white/5 rounded"
                        >
                          <div>
                            <p className="text-xs text-slate-400">User {index + 1}</p>
                            <p className="text-xs text-slate-500">
                              {parseFloat(allocation.tokensHeld).toLocaleString()} tokens ({allocation.sharePercentage}%)
                            </p>
                          </div>
                          <span className="font-semibold text-blue-400">
                            ₦{parseFloat(allocation.shareAmount).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPreviewDialog(null)}
                  className="flex-1"
                  data-testid="button-cancel-preview"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (previewDialog?.cashflowId) {
                      executeDistributionMutation.mutate(previewDialog.cashflowId);
                    }
                  }}
                  disabled={executeDistributionMutation.isPending}
                  className="flex-1"
                  data-testid="button-confirm-execute"
                >
                  {executeDistributionMutation.isPending ? "Executing..." : "Execute Distribution"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-red-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-2" />
              Failed to load preview
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
