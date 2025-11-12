import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface KYCDecision {
  id: string;
  previousStatus: string;
  newStatus: string;
  adminNotes: string | null;
  metadata: any;
  createdAt: string;
  processedBy: {
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface KYCHistorySectionProps {
  userId: string;
  className?: string;
}

export default function KYCHistorySection({
  userId,
  className = "",
}: KYCHistorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: historyData, isLoading } = useQuery<{ history: KYCDecision[] }>({
    queryKey: [`/api/admin/users/${userId}/kyc-history`],
    enabled: !!userId,
  });

  const history = historyData?.history || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionBadge = (newStatus: string) => {
    if (newStatus === "approved") {
      return (
        <Badge className="bg-emerald-600 text-white">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      );
    } else if (newStatus === "rejected") {
      return (
        <Badge className="bg-red-600 text-white">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      );
    }
    return (
      <Badge className="bg-slate-600 text-white">
        {newStatus}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className={`bg-slate-800/30 border-slate-700 ${className}`}>
        <CardContent className="pt-6">
          <div className="text-center text-slate-400 py-4">
            Loading KYC history...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return null; // Don't show section if no history
  }

  return (
    <Card
      className={`bg-slate-800/30 border-slate-700 ${className}`}
      data-testid="section-kyc-history"
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-slate-400" />
            KYC History ({history.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400"
            data-testid="button-toggle-history"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Expand
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent>
              <div className="space-y-4">
                {history.map((decision, index) => (
                  <div key={decision.id}>
                    <div
                      className="flex gap-4"
                      data-testid={`kyc-decision-${decision.id}`}
                    >
                      {/* Timeline Icon */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`rounded-full p-2 ${
                            decision.newStatus === "approved"
                              ? "bg-emerald-600/20"
                              : "bg-red-600/20"
                          }`}
                        >
                          {decision.newStatus === "approved" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        {index < history.length - 1 && (
                          <div className="w-px bg-slate-700 flex-1 mt-2 h-full min-h-8" />
                        )}
                      </div>

                      {/* Decision Details */}
                      <div className="flex-1 pb-6">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            {getActionBadge(decision.newStatus)}
                          </div>
                          <div className="text-xs text-slate-400">
                            {formatDate(decision.createdAt)}
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          {decision.processedBy && (
                            <div className="flex items-center gap-2 text-slate-300">
                              <User className="w-4 h-4 text-slate-400" />
                              <span>
                                Reviewed by: {decision.processedBy.firstName} {decision.processedBy.lastName} ({decision.processedBy.email})
                              </span>
                            </div>
                          )}

                          {decision.adminNotes && (
                            <div className="bg-slate-900/50 rounded-md p-3 mt-2">
                              <div className="text-xs text-slate-400 mb-1">
                                Admin Notes:
                              </div>
                              <div className="text-slate-300">
                                {decision.adminNotes}
                              </div>
                            </div>
                          )}

                          {(() => {
                            // Safely parse metadata - it might be null, a string, or already an object
                            let kycDocuments = null;
                            try {
                              if (decision.metadata) {
                                const parsed = typeof decision.metadata === 'string' 
                                  ? JSON.parse(decision.metadata) 
                                  : decision.metadata;
                                kycDocuments = parsed?.kycDocuments;
                              }
                            } catch (e) {
                              // Ignore parsing errors
                            }

                            if (!kycDocuments) return null;

                            return (
                              <div className="flex gap-2 mt-2">
                                {kycDocuments.idCard && (
                                  <a
                                    href={kycDocuments.idCard}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                                    data-testid={`link-history-id-card-${decision.id}`}
                                  >
                                    <FileText className="w-3 h-3" />
                                    View ID
                                  </a>
                                )}
                                {kycDocuments.selfie && (
                                  <a
                                    href={kycDocuments.selfie}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                                    data-testid={`link-history-selfie-${decision.id}`}
                                  >
                                    <FileText className="w-3 h-3" />
                                    View Selfie
                                  </a>
                                )}
                                {kycDocuments.addressProof && (
                                  <a
                                    href={kycDocuments.addressProof}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                                    data-testid={`link-history-address-${decision.id}`}
                                  >
                                    <FileText className="w-3 h-3" />
                                    View Address
                                  </a>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {index < history.length - 1 && (
                      <Separator className="bg-slate-700/50 my-4" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
