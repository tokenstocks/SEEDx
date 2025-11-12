import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface KYCSubmission {
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

interface KYCReviewModalProps {
  submission: KYCSubmission | null;
  open: boolean;
  onClose: () => void;
}

export default function KYCReviewModal({
  submission,
  open,
  onClose,
}: KYCReviewModalProps) {
  const { toast } = useToast();
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("PUT", `/api/admin/users/${userId}/kyc`, {
        action: "approve",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users?kycStatus=submitted"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "KYC Approved",
        description: "User has been verified and can now access the platform",
      });
      handleClose();
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
    mutationFn: async ({
      userId,
      reason,
    }: {
      userId: string;
      reason: string;
    }) => {
      return await apiRequest("PUT", `/api/admin/users/${userId}/kyc`, {
        action: "reject",
        adminNotes: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users?kycStatus=submitted"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "KYC Rejected",
        description: "User has been notified of the rejection",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Rejection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setAction(null);
    setRejectionReason("");
    onClose();
  };

  const handleApprove = () => {
    if (submission) {
      approveMutation.mutate(submission.id);
    }
  };

  const handleReject = () => {
    if (submission && rejectionReason.trim()) {
      rejectMutation.mutate({
        userId: submission.id,
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

  const getRoleBadge = (role: string) => {
    const colors = {
      primer: "bg-emerald-600",
      regenerator: "bg-blue-600",
      admin: "bg-purple-600",
    };
    return (
      <Badge
        className={`${colors[role as keyof typeof colors] || "bg-slate-600"} text-white`}
      >
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!submission) return null;

  const documents = [
    {
      label: "ID Card / Passport",
      url: submission.kycDocuments?.idCard,
      icon: FileText,
      testId: "image-id-card",
    },
    {
      label: "Selfie with ID",
      url: submission.kycDocuments?.selfie,
      icon: ImageIcon,
      testId: "image-selfie",
    },
    {
      label: "Proof of Address",
      url: submission.kycDocuments?.addressProof,
      icon: FileText,
      testId: "image-address-proof",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl">
            KYC Document Review
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Review identity verification documents and approve or reject
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Information */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-xs text-slate-400">Full Name</div>
                    <div className="text-white font-medium">
                      {submission.firstName} {submission.lastName}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-xs text-slate-400">Email</div>
                    <div className="text-white font-medium">
                      {submission.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-xs text-slate-400">Phone</div>
                    <div className="text-white font-medium">
                      {submission.phone || "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-xs text-slate-400">Submitted</div>
                    <div className="text-white font-medium">
                      {formatDate(submission.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5" />
                  <div>
                    <div className="text-xs text-slate-400">Role</div>
                    <div className="mt-1">{getRoleBadge(submission.role)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator className="bg-slate-800" />

          {/* Document Previews */}
          <div>
            <h3 className="text-white font-semibold mb-4">
              Submitted Documents
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {documents.map((doc) => (
                <Card
                  key={doc.label}
                  className="bg-slate-800/50 border-slate-700"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <doc.icon className="w-5 h-5 text-emerald-400 mt-1" />
                      <div>
                        <div className="text-white font-medium">
                          {doc.label}
                        </div>
                        {doc.url ? (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-400 hover:text-emerald-300"
                          >
                            Open in new tab →
                          </a>
                        ) : (
                          <div className="text-xs text-slate-500">
                            Not provided
                          </div>
                        )}
                      </div>
                    </div>
                    {doc.url && (
                      <div className="relative bg-slate-950 rounded-md overflow-hidden">
                        <img
                          src={doc.url}
                          alt={doc.label}
                          className="w-full h-auto max-h-96 object-contain"
                          data-testid={doc.testId}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling?.classList.remove(
                              "hidden"
                            );
                          }}
                        />
                        <div className="hidden text-center py-8 text-slate-500">
                          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <div>Document preview not available</div>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 text-sm"
                          >
                            Open in new tab to view
                          </a>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator className="bg-slate-800" />

          {/* Decision Section */}
          <AnimatePresence mode="wait">
            {!action ? (
              <motion.div
                key="actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h3 className="text-white font-semibold mb-4">Make Decision</h3>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setAction("approve")}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    data-testid="button-approve-action"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve KYC
                  </Button>
                  <Button
                    onClick={() => setAction("reject")}
                    variant="destructive"
                    className="flex-1"
                    data-testid="button-reject-action"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject KYC
                  </Button>
                </div>
              </motion.div>
            ) : action === "approve" ? (
              <motion.div
                key="approve-confirm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="bg-emerald-900/20 border-emerald-800">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3 mb-4">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-1" />
                      <div>
                        <h4 className="text-white font-semibold mb-1">
                          Approve this KYC submission?
                        </h4>
                        <p className="text-slate-300 text-sm">
                          User will be verified and gain full platform access.
                          This action will be logged for audit purposes.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleApprove}
                        disabled={approveMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700"
                        data-testid="button-confirm-approve"
                      >
                        {approveMutation.isPending
                          ? "Approving..."
                          : "Confirm Approval"}
                      </Button>
                      <Button
                        onClick={() => setAction(null)}
                        variant="outline"
                        className="border-slate-700 text-slate-300"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="reject-confirm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="bg-red-900/20 border-red-800">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3 mb-4">
                      <XCircle className="w-5 h-5 text-red-400 mt-1" />
                      <div className="flex-1">
                        <h4 className="text-white font-semibold mb-1">
                          Reject this KYC submission
                        </h4>
                        <p className="text-slate-300 text-sm mb-4">
                          Provide a clear reason for rejection. The user will be
                          notified.
                        </p>
                        <div>
                          <Label
                            htmlFor="rejection-reason"
                            className="text-slate-300"
                          >
                            Rejection Reason *
                          </Label>
                          <Textarea
                            id="rejection-reason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g., ID document is not clear, selfie does not match ID, address proof is expired"
                            className="mt-2 bg-slate-800 border-slate-700 text-white min-h-24"
                            data-testid="input-reject-reason"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleReject}
                        disabled={
                          rejectMutation.isPending || !rejectionReason.trim()
                        }
                        variant="destructive"
                        data-testid="button-confirm-reject"
                      >
                        {rejectMutation.isPending
                          ? "Rejecting..."
                          : "Confirm Rejection"}
                      </Button>
                      <Button
                        onClick={() => {
                          setAction(null);
                          setRejectionReason("");
                        }}
                        variant="outline"
                        className="border-slate-700 text-slate-300"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-slate-700 text-slate-300"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
