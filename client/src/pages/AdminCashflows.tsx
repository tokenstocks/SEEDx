import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, DollarSign, CheckCircle, Clock, FileCheck } from "lucide-react";
import { Link } from "wouter";
import type { ProjectCashflow } from "@/types/phase4";

export default function AdminCashflows() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedCashflow, setSelectedCashflow] = useState<ProjectCashflow | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      setLocation("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "admin") {
      setLocation("/dashboard");
      return;
    }

    setUser(parsedUser);
  }, [setLocation]);

  const { data: cashflows, isLoading, refetch } = useQuery<{ cashflows: ProjectCashflow[] }>({
    queryKey: ["/api/admin/cashflows"],
    enabled: !!user,
  });

  const verifyCashflowMutation = useMutation({
    mutationFn: async (data: { id: string; notes?: string }) => {
      return await apiRequest("PUT", `/api/admin/cashflows/${data.id}/verify`, {
        notes: data.notes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Cashflow Verified",
        description: "The cashflow entry has been verified successfully.",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cashflows"] });
      setVerifyDialogOpen(false);
      setSelectedCashflow(null);
      setVerificationNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVerifyClick = (cashflow: ProjectCashflow) => {
    setSelectedCashflow(cashflow);
    setVerifyDialogOpen(true);
  };

  const handleVerificationSubmit = () => {
    if (!selectedCashflow) return;

    verifyCashflowMutation.mutate({
      id: selectedCashflow.id,
      notes: verificationNotes || undefined,
    });
  };

  const formatCurrency = (amount: string) => {
    return `₦${parseFloat(amount).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "recorded":
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" />Recorded</Badge>;
      case "verified":
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Verified</Badge>;
      case "tokenized":
        return <Badge variant="default" className="flex items-center gap-1"><FileCheck className="w-3 h-3" />Tokenized</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredCashflows = cashflows?.cashflows.filter(cashflow => {
    if (statusFilter === "all") return true;
    return cashflow.status === statusFilter;
  }) || [];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-7xl mx-auto p-4 py-8">
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            data-testid="link-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">Cashflow Management</h1>
          <p className="text-muted-foreground">
            Review and verify project revenue cashflows
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Project Cashflows</CardTitle>
                <CardDescription>
                  Track and verify real-world revenue from agricultural projects
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Filter by status:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40" data-testid="select-status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="recorded">Recorded</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="tokenized">Tokenized</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))}
              </div>
            ) : filteredCashflows.length > 0 ? (
              <div className="space-y-3">
                {filteredCashflows.map((cashflow) => (
                  <div
                    key={cashflow.id}
                    className="p-4 border rounded-lg"
                    data-testid={`cashflow-${cashflow.id}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-1">
                          {cashflow.projectName || "Unknown Project"}
                        </h4>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(cashflow.amountNgnts)} NGNTS
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(cashflow.status)}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      {cashflow.source && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Source</p>
                          <p className="text-sm">{cashflow.source}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Recorded At</p>
                        <p className="text-sm">{new Date(cashflow.createdAt).toLocaleString()}</p>
                      </div>
                      {cashflow.verifiedBy && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Verified By</p>
                            <p className="text-sm">{cashflow.verifiedByEmail || cashflow.verifiedByName || "Admin"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Verified At</p>
                            <p className="text-sm">
                              {cashflow.verifiedAt ? new Date(cashflow.verifiedAt).toLocaleString() : "N/A"}
                            </p>
                          </div>
                        </>
                      )}
                      {cashflow.chainTxHash && (
                        <div className="md:col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Blockchain Transaction</p>
                          <p className="text-sm font-mono text-muted-foreground break-all">
                            {cashflow.chainTxHash}
                          </p>
                        </div>
                      )}
                      {cashflow.sourceDocumentUrl && (
                        <div className="md:col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Source Document</p>
                          <a 
                            href={cashflow.sourceDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            View Document
                          </a>
                        </div>
                      )}
                    </div>

                    {cashflow.status === "recorded" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleVerifyClick(cashflow)}
                        data-testid={`button-verify-${cashflow.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Verify Cashflow
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {statusFilter !== "all" ? `No ${statusFilter} cashflows` : "No cashflows recorded yet"}
                </h3>
                <p className="text-muted-foreground">
                  {statusFilter !== "all" 
                    ? "Try changing the filter to see other cashflows"
                    : "Project revenue cashflows will appear here once recorded"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verify Cashflow Dialog */}
        <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
          <DialogContent data-testid="dialog-verify-cashflow">
            <DialogHeader>
              <DialogTitle>Verify Cashflow</DialogTitle>
              <DialogDescription>
                Confirm that this revenue has been verified and matches project documentation
              </DialogDescription>
            </DialogHeader>
            {selectedCashflow && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Project</p>
                  <p className="font-medium">{selectedCashflow.projectName || "Unknown Project"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cashflow Amount</p>
                  <p className="font-semibold text-xl text-green-600">
                    {formatCurrency(selectedCashflow.amountNgnts)} NGNTS
                  </p>
                </div>
                {selectedCashflow.source && (
                  <div>
                    <p className="text-sm text-muted-foreground">Source</p>
                    <p className="text-sm">{selectedCashflow.source}</p>
                  </div>
                )}
                <div>
                  <Label htmlFor="verificationNotes">Verification Notes (Optional)</Label>
                  <Textarea
                    id="verificationNotes"
                    placeholder="Add any notes about this verification..."
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    data-testid="textarea-verification-notes"
                  />
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-900 dark:text-green-100">
                    <strong>Verification Checklist:</strong>
                  </p>
                  <ul className="text-sm text-green-800 dark:text-green-200 mt-2 space-y-1 list-disc list-inside">
                    <li>Revenue amount matches project documentation</li>
                    <li>Source documents have been reviewed and validated</li>
                    <li>Revenue is from legitimate agricultural operations</li>
                    <li>All supporting evidence is attached and accessible</li>
                  </ul>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setVerifyDialogOpen(false);
                  setSelectedCashflow(null);
                  setVerificationNotes("");
                }}
                data-testid="button-cancel-verify"
              >
                Cancel
              </Button>
              <Button
                onClick={handleVerificationSubmit}
                disabled={verifyCashflowMutation.isPending}
                data-testid="button-confirm-verify"
              >
                {verifyCashflowMutation.isPending ? "Verifying..." : "Confirm Verification"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
