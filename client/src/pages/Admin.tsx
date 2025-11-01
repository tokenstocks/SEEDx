import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, DollarSign, FileCheck, TrendingUp, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Link } from "wouter";

interface DashboardMetrics {
  totalUsers: number;
  totalInvestmentsAmount: string;
  pendingKycCount: number;
  pendingDepositsCount: number;
  pendingWithdrawalsCount: number;
  totalTokensSold: string;
  totalProjects: number;
}

interface DepositRequest {
  id: string;
  amount: string;
  currency: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  status: string;
  createdAt: string;
  transactionReference: string;
  paymentProof: string | null;
}

interface WithdrawalRequest {
  id: string;
  amount: string;
  currency: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  destinationType: string;
  bankDetails: any;
  cryptoAddress: string | null;
  status: string;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  kycStatus: string;
  role: string;
  createdAt: string;
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const [approvalDialog, setApprovalDialog] = useState<{
    type: 'deposit' | 'withdrawal' | 'kyc';
    item: any;
  } | null>(null);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [approvedAmount, setApprovedAmount] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      setLocation("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "admin") {
      toast({
        title: "Access denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      setLocation("/dashboard");
      return;
    }

    setUser(parsedUser);
  }, [setLocation, toast]);

  const { data: metrics } = useQuery({
    queryKey: ["/api/admin/dashboard"],
    enabled: !!user,
  });

  const { data: deposits } = useQuery<{ deposits: DepositRequest[] }>({
    queryKey: ["/api/admin/deposits?status=pending"],
    enabled: !!user,
  });

  const { data: withdrawals } = useQuery<{ withdrawals: WithdrawalRequest[] }>({
    queryKey: ["/api/admin/withdrawals?status=pending"],
    enabled: !!user,
  });

  const { data: usersData } = useQuery<{ users: User[] }>({
    queryKey: ["/api/admin/users?kycStatus=submitted"],
    enabled: !!user,
  });

  const processDepositMutation = useMutation({
    mutationFn: async ({ id, action, approvedAmount, adminNotes }: any) => {
      const res = await apiRequest("PUT", `/api/admin/deposits/${id}`, {
        action,
        approvedAmount,
        adminNotes,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Deposit request processed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deposits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      setApprovalDialog(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const processWithdrawalMutation = useMutation({
    mutationFn: async ({ id, action, processedAmount, adminNotes }: any) => {
      const res = await apiRequest("PUT", `/api/admin/withdrawals/${id}`, {
        action,
        processedAmount,
        adminNotes,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Withdrawal request processed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      setApprovalDialog(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const processKycMutation = useMutation({
    mutationFn: async ({ id, action, adminNotes }: any) => {
      const res = await apiRequest("PUT", `/api/admin/users/${id}/kyc`, {
        action,
        adminNotes,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "KYC request processed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      setApprovalDialog(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setAction('approve');
    setApprovedAmount("");
    setAdminNotes("");
  };

  const handleProcess = () => {
    if (!approvalDialog) return;

    if (approvalDialog.type === 'deposit') {
      processDepositMutation.mutate({
        id: approvalDialog.item.id,
        action,
        approvedAmount: action === 'approve' ? (approvedAmount || approvalDialog.item.amount) : undefined,
        adminNotes,
      });
    } else if (approvalDialog.type === 'withdrawal') {
      processWithdrawalMutation.mutate({
        id: approvalDialog.item.id,
        action,
        processedAmount: action === 'approve' ? approvedAmount : undefined,
        adminNotes,
      });
    } else if (approvalDialog.type === 'kyc') {
      processKycMutation.mutate({
        id: approvalDialog.item.id,
        action,
        adminNotes,
      });
    }
  };

  const formatCurrency = (amount: string) => {
    return `₦${parseFloat(amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-7xl mx-auto p-4 py-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            data-testid="link-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage platform operations</p>
        </div>

        {/* Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.metrics.totalUsers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
              <FileCheck className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{metrics?.metrics.pendingKycCount || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Deposits</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{metrics?.metrics.pendingDepositsCount || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{metrics?.metrics.pendingWithdrawalsCount || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Different Actions */}
        <Tabs defaultValue="deposits" className="space-y-6">
          <TabsList className="grid w-full md:w-auto grid-cols-3">
            <TabsTrigger value="deposits" data-testid="tab-deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals" data-testid="tab-withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="kyc" data-testid="tab-kyc">KYC Requests</TabsTrigger>
          </TabsList>

          {/* Deposits Tab */}
          <TabsContent value="deposits">
            <Card>
              <CardHeader>
                <CardTitle>Pending Deposit Requests</CardTitle>
                <CardDescription>Review and approve deposit requests</CardDescription>
              </CardHeader>
              <CardContent>
                {deposits && deposits.deposits.length > 0 ? (
                  <div className="space-y-4">
                    {deposits.deposits.map((deposit) => (
                      <div key={deposit.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-semibold">
                            {deposit.userFirstName} {deposit.userLastName}
                          </h4>
                          <p className="text-sm text-muted-foreground">{deposit.userEmail}</p>
                          <p className="text-sm mt-1">
                            Amount: <span className="font-semibold">{formatCurrency(deposit.amount)}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">Ref: {deposit.transactionReference}</p>
                        </div>
                        <Button
                          onClick={() => setApprovalDialog({ type: 'deposit', item: deposit })}
                          data-testid={`button-review-deposit-${deposit.id}`}
                        >
                          Review
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No pending deposits</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals">
            <Card>
              <CardHeader>
                <CardTitle>Pending Withdrawal Requests</CardTitle>
                <CardDescription>Review and approve withdrawal requests</CardDescription>
              </CardHeader>
              <CardContent>
                {withdrawals && withdrawals.withdrawals.length > 0 ? (
                  <div className="space-y-4">
                    {withdrawals.withdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-semibold">
                            {withdrawal.userFirstName} {withdrawal.userLastName}
                          </h4>
                          <p className="text-sm text-muted-foreground">{withdrawal.userEmail}</p>
                          <p className="text-sm mt-1">
                            Amount: <span className="font-semibold">{formatCurrency(withdrawal.amount)}</span>
                          </p>
                          <Badge variant="outline" className="mt-1">{withdrawal.destinationType}</Badge>
                        </div>
                        <Button
                          onClick={() => setApprovalDialog({ type: 'withdrawal', item: withdrawal })}
                          data-testid={`button-review-withdrawal-${withdrawal.id}`}
                        >
                          Review
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No pending withdrawals</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* KYC Tab */}
          <TabsContent value="kyc">
            <Card>
              <CardHeader>
                <CardTitle>Pending KYC Verifications</CardTitle>
                <CardDescription>Review user identity documents</CardDescription>
              </CardHeader>
              <CardContent>
                {usersData && usersData.users.length > 0 ? (
                  <div className="space-y-4">
                    {usersData.users.map((kycUser) => (
                      <div key={kycUser.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-semibold">
                            {kycUser.firstName} {kycUser.lastName}
                          </h4>
                          <p className="text-sm text-muted-foreground">{kycUser.email}</p>
                          <Badge variant="outline" className="mt-1">{kycUser.kycStatus}</Badge>
                        </div>
                        <Button
                          onClick={() => setApprovalDialog({ type: 'kyc', item: kycUser })}
                          data-testid={`button-review-kyc-${kycUser.id}`}
                        >
                          Review
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No pending KYC requests</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Approval Dialog */}
        <Dialog open={!!approvalDialog} onOpenChange={() => { setApprovalDialog(null); resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review {approvalDialog?.type === 'deposit' ? 'Deposit' : approvalDialog?.type === 'withdrawal' ? 'Withdrawal' : 'KYC'} Request</DialogTitle>
              <DialogDescription>
                {approvalDialog?.type === 'deposit' && `Approve or reject deposit request for ${formatCurrency(approvalDialog.item.amount)}`}
                {approvalDialog?.type === 'withdrawal' && `Approve or reject withdrawal request for ${formatCurrency(approvalDialog.item.amount)}`}
                {approvalDialog?.type === 'kyc' && `Approve or reject KYC for ${approvalDialog.item.firstName} ${approvalDialog.item.lastName}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button
                  variant={action === 'approve' ? 'default' : 'outline'}
                  onClick={() => setAction('approve')}
                  className="flex-1"
                  data-testid="button-approve"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant={action === 'reject' ? 'destructive' : 'outline'}
                  onClick={() => setAction('reject')}
                  className="flex-1"
                  data-testid="button-reject"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>

              {action === 'approve' && (approvalDialog?.type === 'deposit' || approvalDialog?.type === 'withdrawal') && (
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    {approvalDialog.type === 'deposit' ? 'Approved Amount' : 'Processed Amount'} (Optional)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder={approvalDialog?.item.amount}
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    data-testid="input-amount"
                  />
                  <p className="text-xs text-muted-foreground">Leave empty to use requested amount</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Admin Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes for this action..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  data-testid="input-notes"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleProcess}
                disabled={processDepositMutation.isPending || processWithdrawalMutation.isPending || processKycMutation.isPending}
                data-testid="button-confirm"
              >
                {processDepositMutation.isPending || processWithdrawalMutation.isPending || processKycMutation.isPending
                  ? "Processing..."
                  : `Confirm ${action === 'approve' ? 'Approval' : 'Rejection'}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
