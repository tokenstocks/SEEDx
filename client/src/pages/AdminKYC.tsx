import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  FileText,
  Eye,
} from "lucide-react";
import { motion } from "framer-motion";
import KYCReviewModal from "@/components/KYCReviewModal";

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
  const [selectedSubmission, setSelectedSubmission] = useState<AdminKYCSubmission | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const { data: submissionsData, isLoading } = useQuery<{ users: AdminKYCSubmission[] }>({
    queryKey: ["/api/admin/users?kycStatus=submitted"],
  });

  const submissions = submissionsData?.users || [];

  const handleReviewSubmission = (submission: AdminKYCSubmission) => {
    setSelectedSubmission(submission);
    setShowReviewModal(true);
  };

  const handleCloseModal = () => {
    setShowReviewModal(false);
    setSelectedSubmission(null);
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
                      <th className="text-left py-3 px-4">Documents Submitted</th>
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
                          <div className="flex gap-1">
                            {submission.kycDocuments?.idCard && (
                              <Badge variant="secondary" className="text-xs">
                                ID
                              </Badge>
                            )}
                            {submission.kycDocuments?.selfie && (
                              <Badge variant="secondary" className="text-xs">
                                Selfie
                              </Badge>
                            )}
                            {submission.kycDocuments?.addressProof && (
                              <Badge variant="secondary" className="text-xs">
                                Address
                              </Badge>
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
                              onClick={() => handleReviewSubmission(submission)}
                              className="bg-emerald-600 hover:bg-emerald-700"
                              data-testid={`button-review-kyc-${submission.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
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

      {/* KYC Review Modal */}
      <KYCReviewModal
        submission={selectedSubmission}
        open={showReviewModal}
        onClose={handleCloseModal}
      />
    </div>
  );
}
