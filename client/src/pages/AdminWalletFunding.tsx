import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { CheckCircle2, XCircle, Loader2, Wallet, Users, AlertCircle, Clock, Copy } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminWalletFunding() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  const { data: pendingRequests, isLoading: loadingPending } = useQuery<any[]>({
    queryKey: ["/api/admin/wallet-funding", { status: "pending" }],
  });

  const { data: processedRequests, isLoading: loadingProcessed } = useQuery<any[]>({
    queryKey: ["/api/admin/wallet-funding", { status: "processed" }],
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest("PATCH", `/api/admin/wallet-funding/${requestId}`, {
        action: "approve",
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Wallet Activated",
        description: data.txHash ? `TX: ${data.txHash.slice(0, 10)}...` : "Wallet successfully activated on Stellar",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallet-funding", { status: "pending" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallet-funding", { status: "processed" }] });
      setShowApprovalDialog(false);
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast({
        title: "Activation Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest("PATCH", `/api/admin/wallet-funding/${requestId}`, {
        action: "reject",
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Rejected",
        description: "The user has been notified",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallet-funding", { status: "pending" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallet-funding", { status: "processed" }] });
      setShowRejectionDialog(false);
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (request: any) => {
    setSelectedRequest(request);
    setShowApprovalDialog(true);
  };

  const handleReject = (request: any) => {
    setSelectedRequest(request);
    setShowRejectionDialog(true);
  };

  const confirmApproval = () => {
    if (selectedRequest) {
      approveMutation.mutate(selectedRequest.id);
    }
  };

  const confirmRejection = () => {
    if (selectedRequest) {
      rejectMutation.mutate(selectedRequest.id);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Public key copied to clipboard",
    });
  };

  const pendingCount = pendingRequests?.length || 0;
  const approvedCount = processedRequests?.filter(r => r.status === "approved")?.length || 0;
  const rejectedCount = processedRequests?.filter(r => r.status === "rejected")?.length || 0;

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
              Wallet Activation Requests
            </h1>
            <p className="text-slate-400 mt-1">
              Review and approve Stellar wallet funding requests from Regenerators
            </p>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Pending Requests
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-pending-count">
                {pendingCount}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Awaiting admin approval
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Approved Wallets
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-approved-count">
                {approvedCount}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Successfully activated on-chain
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Rejected Requests
              </CardTitle>
              <XCircle className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-rejected-count">
                {rejectedCount}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Declined activation requests
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="processed" data-testid="tab-processed">
              Processed ({approvedCount + rejectedCount})
            </TabsTrigger>
          </TabsList>

          {/* Pending Requests */}
          <TabsContent value="pending">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Pending Wallet Activation Requests</CardTitle>
                <CardDescription className="text-slate-400">
                  Approve requests to fund and activate wallets on the Stellar network
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPending ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                  </div>
                ) : pendingRequests && pendingRequests.length > 0 ? (
                  <div className="rounded-md border border-white/10">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-white/5">
                          <TableHead className="text-slate-300">User</TableHead>
                          <TableHead className="text-slate-300">Public Key</TableHead>
                          <TableHead className="text-slate-300">Requested</TableHead>
                          <TableHead className="text-slate-300 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingRequests.map((request: any) => (
                          <TableRow
                            key={request.id}
                            className="border-white/10 hover:bg-white/5"
                            data-testid={`row-request-${request.id}`}
                          >
                            <TableCell>
                              <div>
                                <p className="text-white font-medium" data-testid={`text-user-${request.id}`}>
                                  {request.userEmail}
                                </p>
                                <p className="text-xs text-slate-500">ID: {request.userId}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="text-xs text-blue-400 bg-blue-950/30 px-2 py-1 rounded">
                                  {request.publicKey?.substring(0, 12)}...{request.publicKey?.substring(request.publicKey.length - 8)}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyToClipboard(request.publicKey)}
                                  className="h-6 w-6"
                                  data-testid={`button-copy-${request.id}`}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-white text-sm">
                                  {new Date(request.requestedAt).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(request.requestedAt).toLocaleTimeString()}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  onClick={() => handleApprove(request)}
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                  data-testid={`button-approve-${request.id}`}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Approve
                                </Button>
                                <Button
                                  onClick={() => handleReject(request)}
                                  variant="destructive"
                                  data-testid={`button-reject-${request.id}`}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Wallet className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400" data-testid="text-no-pending">
                      No pending activation requests
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Processed Requests */}
          <TabsContent value="processed">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Processed Requests</CardTitle>
                <CardDescription className="text-slate-400">
                  History of approved and rejected wallet activation requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingProcessed ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                  </div>
                ) : processedRequests && processedRequests.length > 0 ? (
                  <div className="rounded-md border border-white/10">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-white/5">
                          <TableHead className="text-slate-300">User</TableHead>
                          <TableHead className="text-slate-300">Public Key</TableHead>
                          <TableHead className="text-slate-300">Status</TableHead>
                          <TableHead className="text-slate-300">Processed</TableHead>
                          <TableHead className="text-slate-300">TX Hash</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {processedRequests.map((request: any) => (
                          <TableRow
                            key={request.id}
                            className="border-white/10 hover:bg-white/5"
                            data-testid={`row-processed-${request.id}`}
                          >
                            <TableCell>
                              <div>
                                <p className="text-white font-medium">{request.userEmail}</p>
                                <p className="text-xs text-slate-500">ID: {request.userId}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs text-blue-400 bg-blue-950/30 px-2 py-1 rounded">
                                {request.publicKey?.substring(0, 12)}...{request.publicKey?.substring(request.publicKey.length - 8)}
                              </code>
                            </TableCell>
                            <TableCell>
                              {request.status === "approved" ? (
                                <Badge className="bg-emerald-600 text-white" data-testid={`badge-status-${request.id}`}>
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Approved
                                </Badge>
                              ) : (
                                <Badge variant="destructive" data-testid={`badge-status-${request.id}`}>
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Rejected
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-white text-sm">
                                  {new Date(request.processedAt || request.requestedAt).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(request.processedAt || request.requestedAt).toLocaleTimeString()}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {request.txHash ? (
                                <code className="text-xs text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded">
                                  {request.txHash.substring(0, 10)}...
                                </code>
                              ) : (
                                <span className="text-slate-500 text-xs">N/A</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Wallet className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400" data-testid="text-no-processed">
                      No processed requests yet
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Approval Dialog */}
        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent className="bg-slate-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Approve Wallet Activation</DialogTitle>
              <DialogDescription className="text-slate-400">
                This will fund the wallet with 1.5 XLM from the Operations wallet and activate it on the Stellar network.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-300">User Email</Label>
                <p className="text-white font-medium" data-testid="text-approval-user">
                  {selectedRequest?.userEmail}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Public Key</Label>
                <code className="text-xs text-blue-400 bg-blue-950/30 px-3 py-2 rounded block break-all">
                  {selectedRequest?.publicKey}
                </code>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  This action will deduct 1.5 XLM from the Operations wallet balance.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowApprovalDialog(false)}
                disabled={approveMutation.isPending}
                className="border-white/10 text-white hover:bg-white/5"
                data-testid="button-cancel-approval"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmApproval}
                disabled={approveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="button-confirm-approval"
              >
                {approveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve & Activate
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
          <DialogContent className="bg-slate-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Reject Wallet Activation</DialogTitle>
              <DialogDescription className="text-slate-400">
                This will decline the wallet funding request. The user can submit a new request later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-300">User Email</Label>
                <p className="text-white font-medium" data-testid="text-rejection-user">
                  {selectedRequest?.userEmail}
                </p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-sm text-red-300">
                  <XCircle className="w-4 h-4 inline mr-2" />
                  The user will be able to submit a new funding request after rejection.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRejectionDialog(false)}
                disabled={rejectMutation.isPending}
                className="border-white/10 text-white hover:bg-white/5"
                data-testid="button-cancel-rejection"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmRejection}
                disabled={rejectMutation.isPending}
                variant="destructive"
                data-testid="button-confirm-rejection"
              >
                {rejectMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Request
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
