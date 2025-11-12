import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  FileText,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AdminKYCSubmission {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  kycStatus: string;
  kycDocuments?: {
    idCard?: string;
    selfie?: string;
    addressProof?: string;
  };
  createdAt: string;
}

export default function AdminKYC() {
  const { toast } = useToast();

  const [selectedSubmission, setSelectedSubmission] = useState<AdminKYCSubmission | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: submissionsData, isLoading } = useQuery<{ users: AdminKYCSubmission[] }>({
    queryKey: ["/api/admin/users", { kycStatus: "submitted" }],
  });

  const submissions = submissionsData?.users || [];

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(
        "PUT",
        `/api/admin/users/${userId}/kyc`,
        { action: "approve" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowApprovalDialog(false);
      setSelectedSubmission(null);
      toast({
        title: "KYC Approved",
        description: "User has been verified and can now access the platform",
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
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      return await apiRequest(
        "PUT",
        `/api/admin/users/${userId}/kyc`,
        { action: "reject", adminNotes: reason }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowRejectionDialog(false);
      setSelectedSubmission(null);
      setRejectionReason("");
      toast({
        title: "KYC Rejected",
        description: "User has been notified of the rejection",
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

  const handleApprove = (submission: AdminKYCSubmission) => {
    setSelectedSubmission(submission);
    setShowApprovalDialog(true);
  };

  const handleReject = (submission: AdminKYCSubmission) => {
    setSelectedSubmission(submission);
    setShowRejectionDialog(true);
  };

  const confirmApproval = () => {
    if (selectedSubmission) {
      approveMutation.mutate(selectedSubmission.id);
    }
  };

  const confirmRejection = () => {
    if (selectedSubmission && rejectionReason.trim()) {
      rejectMutation.mutate({
        userId: selectedSubmission.id,
        reason: rejectionReason.trim(),
      });
    } else {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejecting this KYC submission",
        variant: "destructive",
      });
    }
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

  const getRoleBadge = (role: string) => {
    const colors = {
      primer: "bg-emerald-600",
      regenerator: "bg-blue-600",
      admin: "bg-purple-600",
    };
    return (
      <Badge className={`${colors[role as keyof typeof colors] || "bg-slate-600"} text-white`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading KYC submissions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">
            KYC Review
          </h1>
          <p className="text-slate-400 mt-1">
            Review and approve user identity verification
          </p>
        </motion.div>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              Pending KYC Submissions ({submissions.length})
            </CardTitle>
            <CardDescription className="text-slate-400">
              Review user identity documents and approve or reject submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No pending KYC submissions</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-kyc">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-sm">
                      <th className="text-left py-3 px-4">User</th>
                      <th className="text-left py-3 px-4">Role</th>
                      <th className="text-left py-3 px-4">Contact</th>
                      <th className="text-left py-3 px-4">Documents</th>
                      <th className="text-left py-3 px-4">Submitted</th>
                      <th className="text-right py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr
                        key={submission.id}
                        className="border-b border-slate-800/50 text-slate-300 hover-elevate"
                        data-testid={`row-kyc-${submission.id}`}
                      >
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-medium text-white">
                              {submission.firstName} {submission.lastName}
                            </div>
                            <div className="text-sm text-slate-400">{submission.email}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {getRoleBadge(submission.role)}
                        </td>
                        <td className="py-4 px-4 text-sm">
                          {submission.phone || "—"}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-2">
                            {submission.kycDocuments?.idCard && (
                              <a
                                href={submission.kycDocuments.idCard}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                                data-testid={`link-id-card-${submission.id}`}
                              >
                                <ExternalLink className="w-3 h-3" />
                                ID Card
                              </a>
                            )}
                            {submission.kycDocuments?.selfie && (
                              <a
                                href={submission.kycDocuments.selfie}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                                data-testid={`link-selfie-${submission.id}`}
                              >
                                <ExternalLink className="w-3 h-3" />
                                Selfie
                              </a>
                            )}
                            {submission.kycDocuments?.addressProof && (
                              <a
                                href={submission.kycDocuments.addressProof}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                                data-testid={`link-address-proof-${submission.id}`}
                              >
                                <ExternalLink className="w-3 h-3" />
                                Address
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm">
                          {formatDate(submission.createdAt)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(submission)}
                              className="bg-emerald-600 hover:bg-emerald-700"
                              data-testid={`button-approve-kyc-${submission.id}`}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(submission)}
                              data-testid={`button-reject-kyc-${submission.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Approve KYC Submission</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to approve this KYC submission for{" "}
              <span className="font-semibold text-white">
                {selectedSubmission?.firstName} {selectedSubmission?.lastName}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
              className="border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmApproval}
              disabled={approveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Reject KYC Submission</DialogTitle>
            <DialogDescription className="text-slate-400">
              Provide a reason for rejecting the KYC submission for{" "}
              <span className="font-semibold text-white">
                {selectedSubmission?.firstName} {selectedSubmission?.lastName}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason" className="text-slate-300">
                Rejection Reason *
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection (required)"
                className="mt-2 bg-slate-800 border-slate-700 text-white"
                data-testid="input-reject-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectionDialog(false);
                setRejectionReason("");
              }}
              className="border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRejection}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
