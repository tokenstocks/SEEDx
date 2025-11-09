import { CheckCircle2, Clock, UserCheck, Shield, FileCheck, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

interface Signer {
  id: string;
  name: string;
  role: string;
  status: "approved" | "pending" | "none";
  approvedAt?: string;
}

interface MultisigProgressProps {
  signaturesRequired: number;
  signaturesCollected: number;
  signers: Signer[];
  transactionType?: string;
}

export function MultisigProgress({ 
  signaturesRequired, 
  signaturesCollected,
  signers,
  transactionType = "Transaction"
}: MultisigProgressProps) {
  const progress = (signaturesCollected / signaturesRequired) * 100;
  const isComplete = signaturesCollected >= signaturesRequired;
  const isPending = signaturesCollected > 0 && !isComplete;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="relative overflow-hidden bg-white/5 backdrop-blur-md border-white/10">
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          isComplete 
            ? 'bg-emerald-500' 
            : isPending 
              ? 'bg-blue-500' 
              : 'bg-slate-500'
        }`} />
        
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                isComplete 
                  ? 'bg-emerald-500/10' 
                  : isPending 
                    ? 'bg-blue-500/10' 
                    : 'bg-slate-500/10'
              }`}>
                <Shield className={`w-5 h-5 ${
                  isComplete 
                    ? 'text-emerald-400' 
                    : isPending 
                      ? 'text-blue-400' 
                      : 'text-slate-400'
                }`} />
              </div>
              <div>
                <CardTitle className="text-white">{transactionType}</CardTitle>
                <CardDescription className="text-slate-400">
                  Multisig Approval Required
                </CardDescription>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className={`${
                isComplete 
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' 
                  : isPending 
                    ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' 
                    : 'border-slate-500/30 text-slate-400 bg-slate-500/10'
              }`}
              data-testid="badge-approval-status"
            >
              {isComplete ? (
                <><CheckCircle2 className="w-3 h-3 mr-1" /> Complete</>
              ) : isPending ? (
                <><Clock className="w-3 h-3 mr-1" /> Pending</>
              ) : (
                <><AlertCircle className="w-3 h-3 mr-1" /> Awaiting</>
              )}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Signatures Collected</span>
              <span className="font-bold text-white" data-testid="text-signature-count">
                {signaturesCollected} of {signaturesRequired}
              </span>
            </div>
            <Progress 
              value={progress} 
              className="h-2 bg-white/10"
              data-testid="progress-signatures"
            />
          </div>

          {/* Signers Grid */}
          <div className="grid gap-3">
            <div className="text-sm font-medium text-slate-300 mb-2">Authorized Signers</div>
            {signers.map((signer, idx) => (
              <motion.div
                key={signer.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  signer.status === "approved"
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : signer.status === "pending"
                      ? "bg-blue-500/5 border-blue-500/20"
                      : "bg-white/5 border-white/10"
                }`}
                data-testid={`signer-card-${signer.id}`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={`${
                    signer.status === "approved"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : signer.status === "pending"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-slate-500/20 text-slate-400"
                  }`}>
                    {signer.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="font-medium text-white text-sm">{signer.name}</div>
                  <div className="text-xs text-slate-400">{signer.role}</div>
                </div>

                {signer.status === "approved" ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" data-testid={`icon-approved-${signer.id}`} />
                    {signer.approvedAt && (
                      <span className="text-xs text-slate-400">
                        {new Date(signer.approvedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                ) : signer.status === "pending" ? (
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
                    <Clock className="w-3 h-3 mr-1" />
                    Reviewing
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-slate-500/30 text-slate-400 bg-slate-500/10">
                    <UserCheck className="w-3 h-3 mr-1" />
                    Awaiting
                  </Badge>
                )}
              </motion.div>
            ))}
          </div>

          {/* Action Section */}
          {isComplete && (
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Transaction approved and ready for execution
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface PendingApprovalItem {
  id: string;
  type: "deposit" | "withdrawal" | "redemption" | "deployment";
  amount: string;
  currency: string;
  requester: string;
  createdAt: string;
  description?: string;
}

interface PendingApprovalsListProps {
  items: PendingApprovalItem[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  isProcessing?: boolean;
}

export function PendingApprovalsList({ 
  items, 
  onApprove, 
  onReject,
  isProcessing = false
}: PendingApprovalsListProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deposit": return <FileCheck className="w-5 h-5 text-emerald-400" />;
      case "withdrawal": return <FileCheck className="w-5 h-5 text-blue-400" />;
      case "redemption": return <FileCheck className="w-5 h-5 text-purple-400" />;
      case "deployment": return <Shield className="w-5 h-5 text-orange-400" />;
      default: return <FileCheck className="w-5 h-5 text-slate-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "deposit": return "border-emerald-500/30 text-emerald-400 bg-emerald-500/10";
      case "withdrawal": return "border-blue-500/30 text-blue-400 bg-blue-500/10";
      case "redemption": return "border-purple-500/30 text-purple-400 bg-purple-500/10";
      case "deployment": return "border-orange-500/30 text-orange-400 bg-orange-500/10";
      default: return "border-slate-500/30 text-slate-400 bg-slate-500/10";
    }
  };

  if (items.length === 0) {
    return (
      <Card className="bg-white/5 backdrop-blur-md border-white/10">
        <CardContent className="pt-6 pb-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-white font-medium">All Clear!</p>
          <p className="text-sm text-slate-400 mt-1">
            No pending multisig approvals
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: idx * 0.05 }}
        >
          <Card className="relative overflow-hidden bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 transition-colors">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
            
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-white/5">
                  {getTypeIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-semibold text-white capitalize">
                        {item.type} Request
                      </h4>
                      {item.description && (
                        <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className={getTypeColor(item.type)}>
                      {item.type}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-slate-500">Amount:</span>
                      <span className="ml-2 font-medium text-white" data-testid={`text-amount-${item.id}`}>
                        {new Intl.NumberFormat('en-NG', {
                          style: 'currency',
                          currency: item.currency || 'NGN',
                        }).format(typeof item.amount === 'number' ? item.amount : parseFloat(item.amount))}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Requester:</span>
                      <span className="ml-2 font-medium text-white">{item.requester}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 mb-3">
                    Requested {new Date(item.createdAt).toLocaleString()}
                  </div>

                  {(onApprove || onReject) && (
                    <div className="flex gap-2">
                      {onApprove && (
                        <Button
                          size="sm"
                          onClick={() => onApprove(item.id)}
                          disabled={isProcessing}
                          className="bg-gradient-to-r from-emerald-500 to-emerald-700"
                          data-testid={`button-approve-${item.id}`}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      {onReject && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReject(item.id)}
                          disabled={isProcessing}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          data-testid={`button-reject-${item.id}`}
                        >
                          Reject
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
