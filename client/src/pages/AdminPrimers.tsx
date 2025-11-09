import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2, TrendingUp, Building2, AlertCircle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminPrimers() {
  const { toast } = useToast();
  const [selectedContribution, setSelectedContribution] = useState<any>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  const { data: stats } = useQuery<{
    totalLpPoolCapital: number;
    pendingContributions: number;
    activePrimers: number;
  }>({
    queryKey: ["/api/admin/primer-stats"],
  });

  const { data: pendingContributions, isLoading: loadingPending } = useQuery<any[]>({
    queryKey: ["/api/admin/primer-contributions", { status: "pending" }],
  });

  const { data: approvedContributions, isLoading: loadingApproved } = useQuery<any[]>({
    queryKey: ["/api/admin/primer-contributions", { status: "approved" }],
  });

  const approveMutation = useMutation({
    mutationFn: async (contributionId: number) => {
      const response = await apiRequest("POST", `/api/admin/primer-contributions/${contributionId}/approve`, {});
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Contribution approved",
        description: `Transaction hash: ${data.txHash.slice(0, 10)}...`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/primer-contributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/primer-stats"] });
      setShowApprovalDialog(false);
      setSelectedContribution(null);
    },
    onError: (error: any) => {
      toast({
        title: "Approval failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (contributionId: number) => {
      const response = await apiRequest("POST", `/api/admin/primer-contributions/${contributionId}/reject`, {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contribution rejected",
        description: "The Primer has been notified",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/primer-contributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/primer-stats"] });
      setShowRejectionDialog(false);
      setSelectedContribution(null);
    },
    onError: (error: any) => {
      toast({
        title: "Rejection failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (contribution: any) => {
    setSelectedContribution(contribution);
    setShowApprovalDialog(true);
  };

  const handleReject = (contribution: any) => {
    setSelectedContribution(contribution);
    setShowRejectionDialog(true);
  };

  const confirmApproval = () => {
    if (selectedContribution) {
      approveMutation.mutate(selectedContribution.id);
    }
  };

  const confirmRejection = () => {
    if (selectedContribution) {
      rejectMutation.mutate(selectedContribution.id);
    }
  };

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
              Primer Management
            </h1>
            <p className="text-slate-400 mt-1">
              Review and approve LP Pool contributions from institutional Primers
            </p>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Total LP Pool Capital
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-total-capital">
                ₦{stats?.totalLpPoolCapital?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                From approved Primer contributions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Pending Approvals
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-pending-count">
                {stats?.pendingContributions || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Contributions awaiting review
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Active Primers
              </CardTitle>
              <Building2 className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-active-primers">
                {stats?.activePrimers || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Institutional partners
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending Approvals
              {stats && stats.pendingContributions > 0 && (
                <Badge variant="destructive" className="ml-2 px-2 py-0">
                  {stats.pendingContributions}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              Approved
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Pending Contributions</CardTitle>
                <CardDescription className="text-slate-400">
                  Review and approve LP Pool deposit requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPending ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-slate-400" />
                    <p className="text-slate-400">Loading contributions...</p>
                  </div>
                ) : pendingContributions && pendingContributions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-slate-300">Primer</TableHead>
                        <TableHead className="text-slate-300">Amount (NGNTS)</TableHead>
                        <TableHead className="text-slate-300">Submitted</TableHead>
                        <TableHead className="text-slate-300">Payment Proof</TableHead>
                        <TableHead className="text-slate-300 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingContributions.map((contribution: any) => (
                        <TableRow key={contribution.id} className="border-white/10">
                          <TableCell className="text-white">
                            {contribution.primerEmail || "Unknown"}
                          </TableCell>
                          <TableCell className="text-white font-medium">
                            ₦{parseFloat(contribution.amountNgnts).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {new Date(contribution.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {contribution.paymentProof ? (
                              <span className="text-xs text-slate-400 max-w-xs truncate block">
                                {contribution.paymentProof}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">No proof</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(contribution)}
                              className="bg-emerald-600 hover:bg-emerald-700"
                              data-testid={`button-approve-${contribution.id}`}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(contribution)}
                              data-testid={`button-reject-${contribution.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No pending contributions</p>
                    <p className="text-sm mt-2">All contributions have been reviewed</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approved">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Approved Contributions</CardTitle>
                <CardDescription className="text-slate-400">
                  History of approved LP Pool deposits
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingApproved ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-slate-400" />
                    <p className="text-slate-400">Loading contributions...</p>
                  </div>
                ) : approvedContributions && approvedContributions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-slate-300">Primer</TableHead>
                        <TableHead className="text-slate-300">Amount (NGNTS)</TableHead>
                        <TableHead className="text-slate-300">LP Share</TableHead>
                        <TableHead className="text-slate-300">Approved</TableHead>
                        <TableHead className="text-slate-300">TX Hash</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedContributions.map((contribution: any) => (
                        <TableRow key={contribution.id} className="border-white/10">
                          <TableCell className="text-white">
                            {contribution.primerEmail || "Unknown"}
                          </TableCell>
                          <TableCell className="text-white font-medium">
                            ₦{parseFloat(contribution.amountNgnts).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-emerald-400">
                            {contribution.lpPoolShareSnapshot}%
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {new Date(contribution.approvedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {contribution.txHash ? (
                              <a
                                href={`https://stellar.expert/explorer/testnet/tx/${contribution.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                              >
                                <span className="font-mono text-xs">
                                  {contribution.txHash.slice(0, 8)}...
                                </span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-500 text-xs">N/A</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No approved contributions yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Approve Primer Contribution</DialogTitle>
            <DialogDescription className="text-slate-400">
              This will transfer NGNTS to the LP Pool wallet and record the blockchain transaction
            </DialogDescription>
          </DialogHeader>
          {selectedContribution && (
            <div className="space-y-4 py-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-400 text-xs">Primer</Label>
                    <p className="text-white font-medium">{selectedContribution.primerEmail}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Amount</Label>
                    <p className="text-white font-medium">
                      ₦{parseFloat(selectedContribution.amountNgnts).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-slate-300">
                  <AlertCircle className="w-4 h-4 inline mr-2 text-blue-400" />
                  This action will create a blockchain transaction and update the LP Pool balance.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
              disabled={approveMutation.isPending}
              className="border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmApproval}
              disabled={approveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Approval"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Reject Primer Contribution</DialogTitle>
            <DialogDescription className="text-slate-400">
              This will mark the contribution as rejected and notify the Primer
            </DialogDescription>
          </DialogHeader>
          {selectedContribution && (
            <div className="space-y-4 py-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-400 text-xs">Primer</Label>
                    <p className="text-white font-medium">{selectedContribution.primerEmail}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Amount</Label>
                    <p className="text-white font-medium">
                      ₦{parseFloat(selectedContribution.amountNgnts).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectionDialog(false)}
              disabled={rejectMutation.isPending}
              className="border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRejection}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Rejection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
