import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Download, 
  ZoomIn,
  Copy,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DepositStatus = "pending" | "approved" | "rejected" | "completed";

interface DepositDetail {
  id: string;
  userId: string;
  userEmail: string;
  userFirstName: string | null;
  userLastName: string | null;
  stellarPublicKey: string | null;
  referenceCode: string;
  paymentMethod: string;
  amountNGN: string;
  ngntsAmount: string;
  platformFee: string;
  gasFee: string;
  feeBreakdown: any;
  status: DepositStatus;
  proofUrl: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  adminNotes: string | null;
  processedBy: string | null;
  processedAt: string | null;
  txHash: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AuditRecord {
  id: string;
  previousStatus: DepositStatus;
  newStatus: DepositStatus;
  adminNotes: string | null;
  metadata: any;
  createdAt: string;
  processedBy: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface DepositDetailResponse {
  deposit: DepositDetail;
  auditTrail: AuditRecord[];
}

interface DepositDetailDrawerProps {
  depositId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DepositDetailDrawer({ depositId, open, onOpenChange }: DepositDetailDrawerProps) {
  const { toast } = useToast();
  const [showImageModal, setShowImageModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const { data, isLoading } = useQuery<DepositDetailResponse>({
    queryKey: [`/api/admin/bank-deposits/${depositId}`],
    enabled: !!depositId,
  });

  const deposit = data?.deposit;
  const auditTrail = data?.auditTrail || [];

  const decisionMutation = useMutation({
    mutationFn: async ({ action, notes }: { action: "approve" | "reject"; notes?: string }) => {
      // Client-side validation for rejection
      if (action === "reject" && !notes?.trim()) {
        throw new Error("Admin notes are required for rejection");
      }
      
      const response = await apiRequest("PATCH", `/api/admin/bank-deposits/${depositId}/decision`, {
        action,
        adminNotes: notes,
      });
      return response.json();
    },
    onSuccess: (responseData, variables) => {
      toast({
        title: variables.action === "approve" ? "Deposit Approved" : "Deposit Rejected",
        description: variables.action === "approve" 
          ? `NGNTS sent to user. TX: ${responseData.txHash?.substring(0, 12)}...`
          : "The deposit has been declined",
      });
      
      // Invalidate all admin bank deposits queries (using predicate to match query params)
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/admin/bank-deposits')
      });
      
      // Reset state only if component is still mounted (via open prop)
      if (open) {
        setAdminNotes("");
        setIsApproving(false);
        setIsRejecting(false);
        onOpenChange(false);
      }
    },
    onError: (error: any, variables) => {
      toast({
        title: variables.action === "approve" ? "Approval Failed" : "Rejection Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      
      // Reset loading state only if component is still mounted
      if (open) {
        setIsApproving(false);
        setIsRejecting(false);
      }
    },
  });

  const handleApprove = () => {
    setIsApproving(true);
    decisionMutation.mutate({ action: "approve", notes: adminNotes.trim() || undefined });
  };

  const handleReject = () => {
    if (!adminNotes.trim()) {
      toast({
        title: "Admin notes required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }
    setIsRejecting(true);
    decisionMutation.mutate({ action: "reject", notes: adminNotes.trim() });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(parseFloat(amount));
  };

  const getStatusBadge = (status: DepositStatus) => {
    const variants: Record<DepositStatus, { className: string; label: string }> = {
      pending: { className: "bg-orange-500/20 text-orange-400 border-orange-500/30", label: "Pending" },
      approved: { className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: "Approved" },
      rejected: { className: "bg-red-500/20 text-red-400 border-red-500/30", label: "Rejected" },
      completed: { className: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Completed" },
    };

    const { className, label } = variants[status];
    return <Badge className={className}>{label}</Badge>;
  };

  if (!deposit && isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl bg-slate-900 border-white/10 overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!deposit) {
    return null;
  }

  const isPending = deposit.status === "pending";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl bg-slate-900 border-white/10 overflow-y-auto" data-testid="sheet-deposit-detail">
          <SheetHeader>
            <SheetTitle className="text-white flex items-center justify-between">
              <span>Deposit Details</span>
              {getStatusBadge(deposit.status)}
            </SheetTitle>
            <SheetDescription className="text-slate-400">
              Reference: {deposit.referenceCode}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* User Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                User Information
              </h3>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Email</span>
                  <span className="text-white font-medium" data-testid="text-user-email">
                    {deposit.userEmail}
                  </span>
                </div>
                {deposit.userFirstName && deposit.userLastName && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Name</span>
                    <span className="text-white" data-testid="text-user-name">
                      {deposit.userFirstName} {deposit.userLastName}
                    </span>
                  </div>
                )}
                {deposit.stellarPublicKey && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-400">Stellar Address</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-blue-400 bg-blue-950/30 px-2 py-1 rounded">
                        {deposit.stellarPublicKey.substring(0, 8)}...{deposit.stellarPublicKey.substring(deposit.stellarPublicKey.length - 8)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(deposit.stellarPublicKey!, "Stellar address")}
                        className="h-6 w-6"
                        data-testid="button-copy-stellar-address"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                Payment Details
              </h3>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount Sent (NGN)</span>
                  <span className="text-white font-bold text-lg" data-testid="text-amount-ngn">
                    {formatAmount(deposit.amountNGN)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Platform Fee (2%)</span>
                  <span className="text-slate-400" data-testid="text-platform-fee">
                    {formatAmount(deposit.platformFee)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Network Gas Fee</span>
                  <span className="text-slate-400" data-testid="text-gas-fee">
                    {formatAmount(deposit.gasFee)}
                  </span>
                </div>
                <Separator className="bg-white/10" />
                <div className="flex justify-between">
                  <span className="text-emerald-400 font-medium">NGNTS to Receive</span>
                  <span className="text-emerald-400 font-bold text-lg" data-testid="text-ngnts-amount">
                    {parseFloat(deposit.ngntsAmount).toLocaleString()} NGNTS
                  </span>
                </div>
                {deposit.feeBreakdown?.needsActivation && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-2">
                    <p className="text-sm text-blue-300">
                      <AlertCircle className="w-4 h-4 inline mr-2" />
                      Wallet activation required (first-time deposit)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Proof of Payment */}
            {deposit.proofUrl && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                  Proof of Payment
                </h3>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950">
                    <img
                      src={deposit.proofUrl}
                      alt="Payment proof"
                      className="w-full h-full object-contain"
                      data-testid="img-payment-proof"
                    />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowImageModal(true)}
                      className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                      data-testid="button-zoom-image"
                    >
                      <ZoomIn className="h-4 w-4 mr-2" />
                      View Full Size
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(deposit.proofUrl!, "_blank")}
                      className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                      data-testid="button-download-proof"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Details */}
            {deposit.txHash && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                  Blockchain Transaction
                </h3>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs text-emerald-400 bg-emerald-950/30 px-3 py-2 rounded flex-1 break-all" data-testid="text-tx-hash">
                      {deposit.txHash}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(deposit.txHash!, "Transaction hash")}
                      className="h-8 w-8"
                      data-testid="button-copy-tx-hash"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`https://stellar.expert/explorer/testnet/tx/${deposit.txHash}`, "_blank")}
                      className="h-8 w-8"
                      data-testid="button-view-stellar-expert"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Trail */}
            {auditTrail.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                  Audit Trail
                </h3>
                <div className="space-y-2">
                  {auditTrail.map((record) => (
                    <div
                      key={record.id}
                      className="bg-white/5 border border-white/10 rounded-lg p-3"
                      data-testid={`audit-record-${record.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(record.previousStatus)}
                          <span className="text-slate-400">→</span>
                          {getStatusBadge(record.newStatus)}
                        </div>
                        <span className="text-xs text-slate-500">
                          {format(new Date(record.createdAt), "MMM d, yyyy HH:mm")}
                        </span>
                      </div>
                      {record.processedBy && (
                        <p className="text-sm text-slate-400">
                          By: {record.processedBy.email}
                        </p>
                      )}
                      {record.adminNotes && (
                        <p className="text-sm text-white mt-2 bg-slate-950/50 p-2 rounded">
                          {record.adminNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Actions */}
            {isPending && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                  Admin Decision
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="admin-notes" className="text-slate-300">
                      Admin Notes (optional for approval, required for rejection)
                    </Label>
                    <Textarea
                      id="admin-notes"
                      placeholder="Add notes about this decision..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="mt-2 bg-slate-950 border-white/10 text-white"
                      rows={3}
                      data-testid="textarea-admin-notes"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleApprove}
                      disabled={isApproving || isRejecting}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      data-testid="button-approve-deposit"
                    >
                      {isApproving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve & Mint NGNTS
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleReject}
                      disabled={isApproving || isRejecting}
                      variant="destructive"
                      className="flex-1"
                      data-testid="button-reject-deposit"
                    >
                      {isRejecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Deposit
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                Timeline
              </h3>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Created</span>
                  <span className="text-white" data-testid="text-created-at">
                    {format(new Date(deposit.createdAt), "MMM d, yyyy HH:mm:ss")}
                  </span>
                </div>
                {deposit.processedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Processed</span>
                    <span className="text-white" data-testid="text-processed-at">
                      {format(new Date(deposit.processedAt), "MMM d, yyyy HH:mm:ss")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Full-size Image Modal */}
      {/* Full-size Image Modal */}
      {deposit.proofUrl && (
        <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Payment Proof - Full Size</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <img
                src={deposit.proofUrl}
                alt="Payment proof full size"
                className="w-full h-auto rounded-lg"
                data-testid="img-payment-proof-fullsize"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
