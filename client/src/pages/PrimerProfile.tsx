import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Calendar,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import UnifiedHeader from "@/components/UnifiedHeader";
import { useLocation } from "wouter";

export default function PrimerProfile() {
  const [, navigate] = useLocation();

  // Fetch server-sourced user data for auth
  const { data: authData, isLoading: userLoading } = useQuery<{
    user: {
      id: string;
      email: string;
      role: string;
      isPrimer: boolean;
      isLpInvestor: boolean;
      kycStatus: string;
      createdAt: string;
    };
  }>({
    queryKey: ["/api/auth/me"],
  });

  const user = authData?.user;

  // Redirect non-primers to regenerator profile
  useEffect(() => {
    if (!userLoading && user && !user.isPrimer) {
      navigate("/regenerator-profile");
    }
  }, [user, userLoading, navigate]);

  // Show loading state while user data loads or redirect non-primers
  if (userLoading || !user || !user.isPrimer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const { data: kycData } = useQuery<{
    kycStatus: string;
    kycDocuments?: any;
  }>({
    queryKey: ["/api/users/kyc-status"],
    refetchOnMount: "always",
    staleTime: 0,
  });

  const getKycStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-600 text-white" data-testid="badge-kyc-approved">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="text-orange-400 border-orange-400" data-testid="badge-kyc-pending">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" data-testid="badge-kyc-rejected">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-slate-400 border-slate-600" data-testid="badge-kyc-not-submitted">
            <AlertCircle className="w-3 h-3 mr-1" />
            Not Submitted
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <UnifiedHeader />

      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">
            Profile & Account
          </h1>
          <p className="text-slate-400 mt-1">
            Manage your Primer account information and verification status
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-400" />
                  Account Information
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Your Primer account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between p-4 bg-white/5 rounded-lg border border-white/10" data-testid="card-email-info">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-400">Email Address</p>
                        <p className="text-white font-medium" data-testid="text-user-email-value">
                          {user.email || "Not available"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start justify-between p-4 bg-white/5 rounded-lg border border-white/10" data-testid="card-account-type">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-purple-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-400">Account Type</p>
                        <p className="text-white font-medium" data-testid="text-account-type">
                          Primer (Institutional Partner)
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-600 text-white" data-testid="badge-account-status">
                      Active
                    </Badge>
                  </div>

                  <div className="flex items-start justify-between p-4 bg-white/5 rounded-lg border border-white/10" data-testid="card-member-since">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-orange-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-400">Member Since</p>
                        <p className="text-white font-medium" data-testid="text-member-since">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "Recently joined"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KYC Information */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  KYC Verification
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Identity verification for compliance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10" data-testid="card-kyc-status">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Verification Status</p>
                    {getKycStatusBadge(kycData?.kycStatus || "not_submitted")}
                  </div>
                  {kycData?.kycStatus !== "approved" && (
                    <Button
                      onClick={() => navigate("/kyc")}
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid="button-kyc-action"
                    >
                      {kycData?.kycStatus === "pending" ? "View Status" : "Complete KYC"}
                    </Button>
                  )}
                </div>

                {kycData?.kycStatus === "pending" && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4" data-testid="alert-kyc-pending">
                    <p className="text-sm text-blue-300">
                      <Clock className="w-4 h-4 inline mr-2" />
                      Your KYC documents are being reviewed by our compliance team. This
                      typically takes 1-2 business days.
                    </p>
                  </div>
                )}

                {kycData?.kycStatus === "rejected" && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4" data-testid="alert-kyc-rejected">
                    <p className="text-sm text-red-300">
                      <XCircle className="w-4 h-4 inline mr-2" />
                      Your KYC submission was rejected. Please review the feedback and
                      resubmit with updated documents.
                    </p>
                    {/* Rejection reason not available in /api/users/kyc-status response */}
                  </div>
                )}

                {kycData?.kycStatus === "approved" && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4" data-testid="alert-kyc-approved">
                    <p className="text-sm text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 inline mr-2" />
                      Your identity has been verified. You have full access to all Primer
                      features.
                    </p>
                  </div>
                )}

                {!kycData?.kycStatus && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4" data-testid="alert-kyc-not-submitted">
                    <p className="text-sm text-orange-300">
                      <AlertCircle className="w-4 h-4 inline mr-2" />
                      Complete KYC verification to unlock full platform capabilities and
                      contribute to the LP Pool.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => navigate("/primer-dashboard")}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  data-testid="button-go-to-dashboard"
                >
                  View Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/kyc")}
                  className="w-full border-white/10 text-white hover:bg-white/5"
                  data-testid="button-go-to-kyc"
                >
                  {kycData?.kycStatus === "approved" ? "View KYC" : "Complete KYC"}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-sm" data-testid="text-benefits-title">
                  Platform Benefits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2" data-testid="benefit-contribute">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-300">
                    Contribute grant/CSR capital
                  </p>
                </div>
                <div className="flex items-start gap-2" data-testid="benefit-track-share">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-300">
                    Track LP Pool ownership share
                  </p>
                </div>
                <div className="flex items-start gap-2" data-testid="benefit-monitor-allocations">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-300">
                    Monitor project allocations
                  </p>
                </div>
                <div className="flex items-start gap-2" data-testid="benefit-blockchain-audit">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-300">
                    Blockchain transaction auditing
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
