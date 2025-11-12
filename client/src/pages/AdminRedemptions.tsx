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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import type { RedemptionRequest } from "@/types/phase4";

export default function AdminRedemptions() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [selectedRedemption, setSelectedRedemption] = useState<RedemptionRequest | null>(null);
  const [processAction, setProcessAction] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
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

  const { data: pendingRedemptionsData, isLoading, refetch } = useQuery<{ redemptions: RedemptionRequest[]; count: number }>({
    queryKey: ["/api/admin/redemptions/pending"],
    enabled: !!user,
  });

  const pendingRedemptions = pendingRedemptionsData?.redemptions || [];

  const processRedemptionMutation = useMutation({
    mutationFn: async (data: { id: string; action: 'approve' | 'reject'; adminNotes?: string }) => {
      return await apiRequest("PUT", `/api/admin/redemptions/${data.id}/process`, {
        action: data.action,
        adminNotes: data.adminNotes,
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.action === 'approve' ? "Redemption Approved" : "Redemption Rejected",
        description: variables.action === 'approve' 
          ? "The redemption has been processed successfully."
          : "The redemption request has been rejected.",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/redemptions/pending"] });
      setProcessDialogOpen(false);
      setSelectedRedemption(null);
      setAdminNotes("");
      setProcessAction(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProcessClick = (redemption: RedemptionRequest, action: 'approve' | 'reject') => {
    setSelectedRedemption(redemption);
    setProcessAction(action);
    setProcessDialogOpen(true);
  };

  const handleProcessSubmit = () => {
    if (!selectedRedemption || !processAction) return;

    processRedemptionMutation.mutate({
      id: selectedRedemption.id,
      action: processAction,
      adminNotes: adminNotes || undefined,
    });
  };

  const formatCurrency = (amount: string) => {
    return `₦${parseFloat(amount).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case "processing":
        return <Badge variant="default" className="flex items-center gap-1"><RefreshCw className="w-3 h-3" />Processing</Badge>;
      case "completed":
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Completed</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto p-4 py-8">
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
            data-testid="link-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2 text-white">Redemption Management</h1>
          <p className="text-slate-400">
            Review and process investor token redemption requests
          </p>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Pending Redemption Requests</CardTitle>
            <CardDescription className="text-slate-400">
              These redemptions are awaiting admin review and approval
            </CardDescription>
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
            ) : pendingRedemptions && pendingRedemptions.length > 0 ? (
              <div className="space-y-3">
                {pendingRedemptions.map((redemption) => (
                  <div
                    key={redemption.id}
                    className="p-4 border border-white/10 rounded-lg bg-white/5"
                    data-testid={`redemption-${redemption.id}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-1 text-white">
                          {redemption.userFirstName} {redemption.userLastName}
                        </h4>
                        <p className="text-sm text-slate-400">{redemption.userEmail}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(redemption.status)}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Project</p>
                        <p className="font-medium text-white">{redemption.projectName || "Unknown Project"}</p>
                        <p className="text-sm text-slate-400">{redemption.projectTokenSymbol}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Tokens to Redeem</p>
                        <p className="font-medium text-white">
                          {parseFloat(redemption.tokensAmount).toLocaleString(undefined, { maximumFractionDigits: 7 })} tokens
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">NAV at Request</p>
                        <p className="font-medium text-white">
                          {redemption.navAtRequest ? formatCurrency(redemption.navAtRequest) : "N/A"}
                        </p>
                        <p className="text-xs text-slate-400">(Locked to prevent manipulation)</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Estimated Payout</p>
                        <p className="font-medium text-lg text-white">
                          {formatCurrency(redemption.redemptionValueNgnts)} NGNTS
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs text-slate-400 mb-1">Funding Source</p>
                      <div className="flex flex-wrap gap-2">
                        {redemption.fundingPlan?.projectCashflow && (
                          <Badge variant="secondary">
                            Project: {formatCurrency(redemption.fundingPlan.projectCashflow)}
                          </Badge>
                        )}
                        {redemption.fundingPlan?.treasuryPool && (
                          <Badge variant="secondary">
                            Treasury: {formatCurrency(redemption.fundingPlan.treasuryPool)}
                          </Badge>
                        )}
                        {redemption.fundingPlan?.liquidityPool && (
                          <Badge variant="secondary">
                            LP: {formatCurrency(redemption.fundingPlan.liquidityPool)}
                          </Badge>
                        )}
                        {!redemption.fundingPlan || Object.keys(redemption.fundingPlan).length === 0 && (
                          <span className="text-sm text-slate-400">Not yet determined</span>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs text-slate-400 mb-1">Requested</p>
                      <p className="text-sm text-white">{new Date(redemption.createdAt).toLocaleString()}</p>
                    </div>

                    {redemption.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          onClick={() => handleProcessClick(redemption, 'approve')}
                          data-testid={`button-approve-${redemption.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleProcessClick(redemption, 'reject')}
                          data-testid={`button-reject-${redemption.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <RefreshCw className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-white">No pending redemptions</h3>
                <p className="text-slate-400">
                  All redemption requests have been processed
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Process Redemption Dialog */}
        <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
          <DialogContent data-testid="dialog-process-redemption">
            <DialogHeader>
              <DialogTitle>
                {processAction === 'approve' ? 'Approve Redemption' : 'Reject Redemption'}
              </DialogTitle>
              <DialogDescription>
                {processAction === 'approve' 
                  ? 'This will process the redemption, transfer NGNTS to the user, and burn their project tokens on-chain.'
                  : 'Provide a reason for rejecting this redemption request.'
                }
              </DialogDescription>
            </DialogHeader>
            {selectedRedemption && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400">Investor</p>
                  <p className="font-medium text-white">
                    {selectedRedemption.userFirstName} {selectedRedemption.userLastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Redemption Value</p>
                  <p className="font-semibold text-lg text-white">
                    {formatCurrency(selectedRedemption.redemptionValueNgnts)} NGNTS
                  </p>
                </div>
                <div>
                  <Label htmlFor="adminNotes">
                    {processAction === 'approve' ? 'Admin Notes (Optional)' : 'Rejection Reason (Required)'}
                  </Label>
                  <Textarea
                    id="adminNotes"
                    placeholder={processAction === 'approve' 
                      ? "Add any notes about this approval..."
                      : "Explain why this redemption is being rejected..."
                    }
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    data-testid="textarea-admin-notes"
                  />
                </div>
                {processAction === 'approve' && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">
                      <strong>Important:</strong> This action will:
                    </p>
                    <ul className="text-sm text-yellow-800 dark:text-yellow-200 mt-2 space-y-1 list-disc list-inside">
                      <li>Transfer NGNTS from the selected funding source to the user</li>
                      <li>Burn the user's project tokens on Stellar blockchain</li>
                      <li>Update the redemption status to completed</li>
                      <li>Log the action in the audit trail</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setProcessDialogOpen(false);
                  setSelectedRedemption(null);
                  setAdminNotes("");
                  setProcessAction(null);
                }}
                data-testid="button-cancel-process"
              >
                Cancel
              </Button>
              <Button
                variant={processAction === 'approve' ? 'default' : 'destructive'}
                onClick={handleProcessSubmit}
                disabled={processRedemptionMutation.isPending || (processAction === 'reject' && !adminNotes)}
                data-testid="button-confirm-process"
              >
                {processRedemptionMutation.isPending 
                  ? "Processing..." 
                  : processAction === 'approve' ? 'Approve & Process' : 'Confirm Rejection'
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
