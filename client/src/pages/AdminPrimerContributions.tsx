import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  TrendingUp,
  Building2,
  ArrowLeft,
  Eye,
  ExternalLink,
  Download,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PrimerContributionAdmin {
  id: string;
  primerId: string;
  primerEmail: string;
  amountNgnts: string;
  status: "pending" | "approved" | "rejected";
  paymentProof: string | null;
  referenceCode: string | null;
  paymentMethod: string | null;
  platformFee: string | null;
  txHash: string | null;
  lpPoolShareSnapshot: string | null;
  rejectedReason: string | null;
  createdAt: string;
  approvedAt: string | null;
}

interface AdminPrimerStats {
  totalLpPoolCapital: number;
  pendingContributions: number;
  activePrimers: number;
}

export default function AdminPrimerContributions() {
  const { toast } = useToast();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [selectedContribution, setSelectedContribution] = useState<PrimerContributionAdmin | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: stats } = useQuery<AdminPrimerStats>({
    queryKey: ["/api/admin/primer-stats"],
  });

  const { data: allContributions = [], refetch: refetchContributions } = useQuery<PrimerContributionAdmin[]>({
    queryKey: ["/api/admin/primer-contributions"],
  });

  // Filter contributions by status
  const pendingContributions = allContributions.filter(c => c.status === "pending");
  const approvedContributions = allContributions.filter(c => c.status === "approved");
  const rejectedContributions = allContributions.filter(c => c.status === "rejected");

  const approveMutation = useMutation({
    mutationFn: async (contributionId: string) => {
      return await apiRequest(
        "POST",
        `/api/admin/primer-contributions/${contributionId}/approve`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/primer-contributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/primer-stats"] });
      setShowApprovalDialog(false);
      setSelectedContribution(null);
      toast({
        title: "Contribution Approved",
        description: "NGNTS transferred to LP Pool successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ contributionId, reason }: { contributionId: string; reason: string }) => {
      return await apiRequest(
        "POST",
        `/api/admin/primer-contributions/${contributionId}/reject`,
        { rejectedReason: reason }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/primer-contributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/primer-stats"] });
      setShowRejectionDialog(false);
      setSelectedContribution(null);
      setRejectionReason("");
      toast({
        title: "Contribution Rejected",
        description: "Primer has been notified of the rejection",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Rejection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = (contribution: PrimerContributionAdmin) => {
    setSelectedContribution(contribution);
    setShowApprovalDialog(true);
  };

  const handleReject = (contribution: PrimerContributionAdmin) => {
    setSelectedContribution(contribution);
    setShowRejectionDialog(true);
  };

  const confirmApproval = () => {
    if (selectedContribution) {
      approveMutation.mutate(selectedContribution.id);
    }
  };

  const confirmRejection = () => {
    if (selectedContribution && rejectionReason.trim()) {
      rejectMutation.mutate({
        contributionId: selectedContribution.id,
        reason: rejectionReason.trim(),
      });
    } else {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejecting this contribution",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: string) => {
    return `₦${parseFloat(amount).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 border-orange-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="bg-red-500/10 text-red-400 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const ContributionCard = ({ contribution }: { contribution: PrimerContributionAdmin }) => (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover-elevate">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-white text-lg">
              {formatCurrency(contribution.amountNgnts)}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {contribution.primerEmail}
            </CardDescription>
          </div>
          {getStatusBadge(contribution.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Reference Code</p>
            <p className="text-white font-mono text-xs">
              {contribution.referenceCode || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Payment Method</p>
            <p className="text-white">{contribution.paymentMethod || "N/A"}</p>
          </div>
          <div>
            <p className="text-slate-500">Submitted</p>
            <p className="text-white">{formatDate(contribution.createdAt)}</p>
          </div>
          {contribution.platformFee && (
            <div>
              <p className="text-slate-500">Platform Fee</p>
              <p className="text-white">{formatCurrency(contribution.platformFee)}</p>
            </div>
          )}
        </div>

        {contribution.paymentProof && (
          <div className="flex gap-2">
            <a
              href={contribution.paymentProof}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                data-testid={`button-view-proof-${contribution.id}`}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Proof
              </Button>
            </a>
            <a
              href={contribution.paymentProof}
              download={`proof-${contribution.referenceCode || contribution.id}.jpg`}
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                size="sm"
                data-testid={`button-download-proof-${contribution.id}`}
              >
                <Download className="w-4 h-4" />
              </Button>
            </a>
          </div>
        )}

        {contribution.txHash && (
          <div>
            <p className="text-slate-500 text-sm mb-1">Transaction Hash</p>
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${contribution.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
              data-testid={`link-tx-${contribution.id}`}
            >
              {contribution.txHash.substring(0, 16)}...
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {contribution.lpPoolShareSnapshot && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
            <p className="text-slate-400 text-xs mb-1">LP Pool Share</p>
            <p className="text-emerald-400 font-semibold">
              {parseFloat(contribution.lpPoolShareSnapshot).toFixed(4)}%
            </p>
          </div>
        )}

        {contribution.rejectedReason && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-slate-400 text-xs mb-1">Rejection Reason</p>
            <p className="text-red-400 text-sm">{contribution.rejectedReason}</p>
          </div>
        )}

        {contribution.status === "pending" && (
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleApprove(contribution)}
              disabled={approveMutation.isPending}
              data-testid={`button-approve-${contribution.id}`}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => handleReject(contribution)}
              disabled={rejectMutation.isPending}
              data-testid={`button-reject-${contribution.id}`}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors w-fit"
            data-testid="link-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin Dashboard
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">
              Primer Contributions
            </h1>
            <p className="text-slate-400 mt-1">
              Review and approve institutional capital contributions to the LP Pool
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
              <Wallet className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-total-capital">
                ₦{stats?.totalLpPoolCapital?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                From approved contributions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Pending Review
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-pending-count">
                {stats?.pendingContributions || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Awaiting admin approval
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
              Pending ({pendingContributions.length})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              Approved ({approvedContributions.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected">
              Rejected ({rejectedContributions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingContributions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingContributions.map((contribution) => (
                  <ContributionCard key={contribution.id} contribution={contribution} />
                ))}
              </div>
            ) : (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="w-12 h-12 text-slate-600 mb-4" />
                  <p className="text-slate-400">No pending contributions</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedContributions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {approvedContributions.map((contribution) => (
                  <ContributionCard key={contribution.id} contribution={contribution} />
                ))}
              </div>
            ) : (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-slate-600 mb-4" />
                  <p className="text-slate-400">No approved contributions yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedContributions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rejectedContributions.map((contribution) => (
                  <ContributionCard key={contribution.id} contribution={contribution} />
                ))}
              </div>
            ) : (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <XCircle className="w-12 h-12 text-slate-600 mb-4" />
                  <p className="text-slate-400">No rejected contributions</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Approve Contribution</DialogTitle>
            <DialogDescription className="text-slate-400">
              This will transfer NGNTS to the LP Pool and update the Primer's LP share.
            </DialogDescription>
          </DialogHeader>
          {selectedContribution && (
            <div className="space-y-4 py-4">
              <div className="bg-white/5 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Primer:</span>
                  <span className="text-white">{selectedContribution.primerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount:</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(selectedContribution.amountNgnts)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Reference:</span>
                  <span className="text-white font-mono text-sm">
                    {selectedContribution.referenceCode}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
              data-testid="button-cancel-approval"
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={confirmApproval}
              disabled={approveMutation.isPending}
              data-testid="button-confirm-approval"
            >
              {approveMutation.isPending ? "Processing..." : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Contribution</DialogTitle>
            <DialogDescription className="text-slate-400">
              Please provide a reason for rejecting this contribution. The Primer will be notified.
            </DialogDescription>
          </DialogHeader>
          {selectedContribution && (
            <div className="space-y-4 py-4">
              <div className="bg-white/5 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Primer:</span>
                  <span className="text-white">{selectedContribution.primerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount:</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(selectedContribution.amountNgnts)}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rejection-reason" className="text-slate-300">
                  Rejection Reason
                </Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="e.g., Payment proof does not match contribution amount"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="bg-white/5 border-white/10 text-white min-h-24"
                  data-testid="input-rejection-reason"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectionDialog(false);
                setRejectionReason("");
              }}
              data-testid="button-cancel-rejection"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRejection}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              data-testid="button-confirm-rejection"
            >
              {rejectMutation.isPending ? "Processing..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
