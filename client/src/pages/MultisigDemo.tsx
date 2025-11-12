import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MultisigProgress, PendingApprovalsList } from "@/components/MultisigInterface";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function MultisigDemo() {
  // Fetch real pending deposits/withdrawals from backend first to determine signer states
  const { data: deposits, isLoading: depositsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/deposits"],
  });

  const { data: withdrawals, isLoading: withdrawalsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/withdrawals"],
  });

  const { data: redemptions, isLoading: redemptionsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/redemptions"],
  });

  // Count pending items to determine signer states dynamically
  const pendingDepositsCount = deposits?.filter(d => d.status === "pending").length || 0;
  const pendingWithdrawalsCount = withdrawals?.filter(w => w.status === "pending").length || 0;
  const pendingRedemptionsCount = redemptions?.filter(r => r.status === "pending").length || 0;
  const totalPendingCount = pendingDepositsCount + pendingWithdrawalsCount + pendingRedemptionsCount;

  // Dynamic signer states based on actual pending items
  // If there are items pending, show as "pending" review, otherwise "none"
  const mockSigners = [
    { id: "1", name: "Sarah Johnson", role: "Chief Financial Officer", status: totalPendingCount > 0 ? "pending" as const : "none" as const },
    { id: "2", name: "Michael Chen", role: "Chief Operating Officer", status: totalPendingCount > 0 ? "pending" as const : "none" as const },
    { id: "3", name: "Dr. Amina Okafor", role: "Chief Executive Officer", status: totalPendingCount > 0 ? "pending" as const : "none" as const },
  ];

  // Filter pending items and transform to multisig format
  const pendingDeposits = deposits?.filter(d => d.status === "pending").map(d => ({
    id: d.id,
    type: "deposit" as const,
    amount: d.amount,
    currency: d.currency,
    requester: d.user?.email || "Unknown",
    createdAt: d.createdAt,
    description: `${d.currency} deposit via ${d.paymentMethod}`,
  })) || [];

  const pendingWithdrawals = withdrawals?.filter(w => w.status === "pending").map(w => ({
    id: w.id,
    type: "withdrawal" as const,
    amount: w.amount,
    currency: w.currency,
    requester: w.user?.email || "Unknown",
    createdAt: w.createdAt,
    description: `${w.currency} withdrawal to ${w.destinationType}`,
  })) || [];

  const pendingRedemptions = redemptions?.filter(r => r.status === "pending").map(r => ({
    id: r.id,
    type: "redemption" as const,
    amount: r.redemptionValueNgnts,
    currency: "NGN",
    requester: r.user?.email || "Unknown",
    createdAt: r.createdAt,
    description: `Redemption of ${r.tokenAmount} tokens`,
  })) || [];

  const allPending = [...pendingDeposits, ...pendingWithdrawals, ...pendingRedemptions];
  const signaturesRequired = 2; // 2-of-3 multisig
  const signaturesCollected = mockSigners.filter(s => s.status === "approved").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto p-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
              <Shield className="w-3 h-3 mr-1" />
              Treasury Security
            </Badge>
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Multisig Governance
          </h1>
          <p className="text-slate-400 text-lg">
            Multi-signature approval system for treasury operations
          </p>
        </motion.div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="relative overflow-hidden bg-white/5 backdrop-blur-md border-white/10">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Pending Approvals</span>
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-3xl font-bold text-white" data-testid="text-pending-count">
                  {allPending.length}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Awaiting signatures
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card className="relative overflow-hidden bg-white/5 backdrop-blur-md border-white/10">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Signature Threshold</span>
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold text-white">
                  {signaturesRequired} of {mockSigners.length}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Required for approval
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card className="relative overflow-hidden bg-white/5 backdrop-blur-md border-white/10">
              <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Active Signers</span>
                  <CheckCircle2 className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-3xl font-bold text-white">
                  {mockSigners.length}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Authorized personnel
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Tabs defaultValue="queue" className="space-y-6">
          <TabsList className="bg-white/5 backdrop-blur-md border border-white/10">
            <TabsTrigger value="queue" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <Clock className="w-4 h-4 mr-2" />
              Approval Queue
            </TabsTrigger>
            <TabsTrigger value="signers" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
              <Shield className="w-4 h-4 mr-2" />
              Signers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue">
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="bg-white/5 backdrop-blur-md border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Pending Treasury Operations</CardTitle>
                    <CardDescription className="text-slate-400">
                      Items requiring multi-signature approval
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {depositsLoading || withdrawalsLoading || redemptionsLoading ? (
                      <div className="text-center py-8 text-slate-400">Loading...</div>
                    ) : (
                      <PendingApprovalsList items={allPending} />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="signers">
            <MultisigProgress
              signaturesRequired={signaturesRequired}
              signaturesCollected={signaturesCollected}
              signers={mockSigners}
              transactionType="Treasury Approval System"
            />
          </TabsContent>
        </Tabs>

        {/* Educational Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8"
        >
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="pt-6 pb-6">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Multi-Signature Security</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Our treasury operations require approval from {signaturesRequired} of {mockSigners.length} authorized signers, 
                    ensuring no single person can execute transactions unilaterally. This provides institutional-grade 
                    security and governance for all capital movements.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
