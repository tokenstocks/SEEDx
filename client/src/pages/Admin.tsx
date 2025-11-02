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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, DollarSign, FileCheck, TrendingUp, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Link } from "wouter";
import { BlockchainActivityFeed } from "@/components/BlockchainActivityFeed";

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

interface Wallet {
  id: string;
  userId: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  userRole: string;
  fiatBalance: string;
  cryptoBalances: string;
  stellarPublicKey: string;
  createdAt: string;
  updatedAt: string;
}

// Admin Wallet Card Component
function AdminWalletCard() {
  const { toast } = useToast();

  const { data: adminWallet, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/my-wallet'],
  });

  const fundWalletMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/my-wallet/fund-friendbot');
    },
    onSuccess: (data: any) => {
      toast({
        title: "Wallet Funded Successfully",
        description: `Your wallet now has ${data.newBalance} XLM. Transaction: ${data.txHash}`,
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Funding Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Admin Wallet</CardTitle>
          <CardDescription>Manage your admin Stellar wallet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-40" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const wallet = (adminWallet as any)?.wallet;
  const horizonUrl = import.meta.env.VITE_STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org";
  const isTestnet = horizonUrl.includes("testnet");
  const explorerUrl = isTestnet
    ? `https://stellar.expert/explorer/testnet/account/${wallet?.publicKey}`
    : `https://stellar.expert/explorer/public/account/${wallet?.publicKey}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Admin Wallet</CardTitle>
        <CardDescription>Manage your admin Stellar wallet for platform operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Wallet Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            {wallet?.isActivated ? (
              <Badge variant="default" className="bg-green-600" data-testid="wallet-status-activated">
                Activated
              </Badge>
            ) : (
              <Badge variant="secondary" data-testid="wallet-status-pending">
                {wallet?.accountError || "Not Activated"}
              </Badge>
            )}
          </div>

          {/* Public Key */}
          <div className="space-y-2">
            <Label>Stellar Public Key</Label>
            <div className="flex gap-2 items-center">
              <Input
                value={wallet?.publicKey || ""}
                readOnly
                className="font-mono text-xs"
                data-testid="input-admin-public-key"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(wallet?.publicKey || "");
                  toast({ title: "Copied to clipboard" });
                }}
                data-testid="button-copy-public-key"
              >
                Copy
              </Button>
            </div>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
              data-testid="link-stellar-explorer"
            >
              View on Stellar Explorer →
            </a>
          </div>

          {/* Balances */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>XLM Balance</Label>
              <p className="text-2xl font-bold" data-testid="text-xlm-balance">
                {wallet?.stellarBalance?.XLM || "0"} XLM
              </p>
            </div>
            <div className="space-y-2">
              <Label>USDC Balance</Label>
              <p className="text-2xl font-bold" data-testid="text-usdc-balance">
                {wallet?.stellarBalance?.USDC || "0"} USDC
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            {isTestnet && (
              <Button
                onClick={() => fundWalletMutation.mutate()}
                disabled={fundWalletMutation.isPending}
                data-testid="button-fund-friendbot"
              >
                {fundWalletMutation.isPending ? "Funding..." : "Fund with Friendbot (10,000 XLM)"}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => refetch()}
              data-testid="button-refresh-balance"
            >
              Refresh Balance
            </Button>
          </div>

          {!isTestnet && (
            <p className="text-sm text-muted-foreground">
              Note: Friendbot funding is only available on testnet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
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
  const [createProjectDialog, setCreateProjectDialog] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    location: "",
    currency: "NGN",
    targetAmount: "",
    tokenSymbol: "",
    tokensIssued: "",
    pricePerToken: "",
  });
  const [projectPhoto, setProjectPhoto] = useState<File | null>(null);
  const [teaserDocument, setTeaserDocument] = useState<File | null>(null);
  const [projectDocuments, setProjectDocuments] = useState<FileList | null>(null);
  const [allUsersData, setAllUsersData] = useState<{ users: User[] } | null>(null);

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

  const { data: walletsData } = useQuery<{ wallets: Wallet[] }>({
    queryKey: ["/api/admin/wallets"],
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

  const createProjectMutation = useMutation({
    mutationFn: async (data: { form: any; photo: File | null; teaserDoc: File | null; docs: FileList | null }) => {
      const formData = new FormData();
      Object.keys(data.form).forEach(key => {
        formData.append(key, data.form[key]);
      });
      if (data.photo) {
        formData.append("photo", data.photo);
      }
      if (data.teaserDoc) {
        formData.append("teaserDocument", data.teaserDoc);
      }
      if (data.docs) {
        Array.from(data.docs).forEach(doc => {
          formData.append("documents", doc);
        });
      }

      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create project");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Project created successfully" });
      setCreateProjectDialog(false);
      setProjectForm({
        name: "",
        description: "",
        location: "",
        currency: "NGN",
        targetAmount: "",
        tokenSymbol: "",
        tokensIssued: "",
        pricePerToken: "",
      });
      setProjectPhoto(null);
      setTeaserDocument(null);
      setProjectDocuments(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const activateWalletMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('POST', `/api/admin/wallets/${userId}/activate`);
    },
    onSuccess: (data: any) => {
      toast({
        title: data.alreadyActivated ? "Already Activated" : "Wallet Activated",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Activation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const suspendUserMutation = useMutation({
    mutationFn: async ({ id, isSuspended }: { id: string; isSuspended: boolean }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${id}/suspend`, { isSuspended });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to suspend user");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      if (allUsersData) {
        fetchAllUsers();
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const fetchAllUsers = async () => {
    try {
      const res = await apiRequest("GET", "/api/admin/users");
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await res.json();
      setAllUsersData(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage platform operations</p>
            </div>
            <Link href="/admin/onchain-verification">
              <Button variant="outline" data-testid="button-onchain-verification">
                <CheckCircle className="w-4 h-4 mr-2" />
                On-Chain Verification
              </Button>
            </Link>
          </div>
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

        {/* Blockchain Activity Feed */}
        <div className="mb-8">
          <BlockchainActivityFeed limit={5} />
        </div>

        {/* Tabs for Different Actions */}
        <Tabs defaultValue="deposits" className="space-y-6">
          <TabsList className="grid w-full md:w-auto grid-cols-7">
            <TabsTrigger value="admin-wallet" data-testid="tab-admin-wallet">My Wallet</TabsTrigger>
            <TabsTrigger value="deposits" data-testid="tab-deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals" data-testid="tab-withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="kyc" data-testid="tab-kyc">KYC Requests</TabsTrigger>
            <TabsTrigger value="projects" data-testid="tab-projects">Projects</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="wallets" data-testid="tab-wallets">Wallets</TabsTrigger>
          </TabsList>

          {/* Admin Wallet Tab */}
          <TabsContent value="admin-wallet">
            <AdminWalletCard />
          </TabsContent>

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

          {/* Projects Tab */}
          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle>Project Management</CardTitle>
                <CardDescription>Create and manage investment projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button onClick={() => setCreateProjectDialog(true)} data-testid="button-create-project">
                    Create New Project
                  </Button>
                  <Link href="/projects">
                    <Button variant="outline" data-testid="button-view-all-projects">
                      View All Projects
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage all platform users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button onClick={fetchAllUsers} data-testid="button-load-users">
                    {allUsersData ? "Refresh Users" : "Load All Users"}
                  </Button>
                  {allUsersData && allUsersData.users.length > 0 ? (
                    <div className="space-y-4">
                      {allUsersData.users.map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-semibold">{u.firstName} {u.lastName}</h4>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline">{u.role}</Badge>
                              <Badge variant={u.kycStatus === 'approved' ? 'default' : 'secondary'}>{u.kycStatus}</Badge>
                            </div>
                          </div>
                          {u.role !== 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => suspendUserMutation.mutate({ id: u.id, isSuspended: true })}
                              data-testid={`button-suspend-user-${u.id}`}
                            >
                              Suspend
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : allUsersData ? (
                    <p className="text-center py-8 text-muted-foreground">No users found</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wallets Tab */}
          <TabsContent value="wallets">
            <Card>
              <CardHeader>
                <CardTitle>User Wallets</CardTitle>
                <CardDescription>View all user wallets and balances</CardDescription>
              </CardHeader>
              <CardContent>
                {walletsData && walletsData.wallets.length > 0 ? (
                  <div className="space-y-4">
                    {walletsData.wallets.map((wallet) => {
                      const cryptoBalances = (wallet.cryptoBalances || {}) as Record<string, string>;
                      return (
                        <div key={wallet.id} className="p-4 border rounded-lg" data-testid={`wallet-${wallet.id}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold">
                                {wallet.userFirstName} {wallet.userLastName}
                              </h4>
                              <p className="text-sm text-muted-foreground">{wallet.userEmail}</p>
                              <Badge variant="outline" className="mt-1">{wallet.userRole}</Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Wallet ID</p>
                              <p className="text-xs font-mono">{wallet.id.substring(0, 8)}...</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Fiat Balance</p>
                              <p className="text-lg font-bold" data-testid={`fiat-balance-${wallet.id}`}>
                                ₦{parseFloat(wallet.fiatBalance || "0").toLocaleString()}
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Crypto Balances</p>
                              <div className="space-y-1">
                                <p className="text-sm" data-testid={`xlm-balance-${wallet.id}`}>
                                  <span className="font-semibold">XLM:</span> {cryptoBalances.XLM || "0"}
                                </p>
                                <p className="text-sm" data-testid={`usdc-balance-${wallet.id}`}>
                                  <span className="font-semibold">USDC:</span> {cryptoBalances.USDC || "0"}
                                </p>
                                {Object.keys(cryptoBalances).filter(key => key !== 'XLM' && key !== 'USDC').map(token => (
                                  <p key={token} className="text-sm">
                                    <span className="font-semibold">{token}:</span> {cryptoBalances[token]}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t">
                            <p className="text-xs text-muted-foreground mb-1">Stellar Public Key</p>
                            <div className="flex items-center gap-2 mb-2">
                              <p className="text-xs font-mono break-all flex-1" data-testid={`stellar-key-${wallet.id}`}>
                                {wallet.stellarPublicKey}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => activateWalletMutation.mutate(wallet.userId)}
                                disabled={activateWalletMutation.isPending}
                                data-testid={`button-activate-wallet-${wallet.userId}`}
                              >
                                {activateWalletMutation.isPending ? "Activating..." : "Activate Wallet"}
                              </Button>
                            </div>
                          </div>

                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Created: {new Date(wallet.createdAt).toLocaleDateString()}</span>
                            <span>Updated: {new Date(wallet.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No wallets found</p>
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

        {/* Create Project Dialog */}
        <Dialog open={createProjectDialog} onOpenChange={setCreateProjectDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Investment Project</DialogTitle>
              <DialogDescription>
                Create a new agricultural investment project with Stellar token configuration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="e.g. Corn Farming Project 2025"
                  data-testid="input-project-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  placeholder="Detailed project description..."
                  data-testid="input-project-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={projectForm.location}
                  onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })}
                  placeholder="e.g. Kaduna State, Nigeria"
                  data-testid="input-project-location"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Investment Currency</Label>
                <Select
                  value={projectForm.currency}
                  onValueChange={(value) => setProjectForm({ ...projectForm, currency: value })}
                >
                  <SelectTrigger id="currency" data-testid="select-currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NGN" data-testid="option-currency-ngn">NGN (Nigerian Naira)</SelectItem>
                    <SelectItem value="USDC" data-testid="option-currency-usdc">USDC (USD Coin)</SelectItem>
                    <SelectItem value="XLM" data-testid="option-currency-xlm">XLM (Stellar Lumens)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetAmount">Target Amount</Label>
                  <Input
                    id="targetAmount"
                    type="number"
                    value={projectForm.targetAmount}
                    onChange={(e) => setProjectForm({ ...projectForm, targetAmount: e.target.value })}
                    placeholder="1000000"
                    data-testid="input-target-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tokenSymbol">Token Symbol</Label>
                  <Input
                    id="tokenSymbol"
                    value={projectForm.tokenSymbol}
                    onChange={(e) => setProjectForm({ ...projectForm, tokenSymbol: e.target.value.toUpperCase() })}
                    placeholder="CORN2025"
                    maxLength={12}
                    data-testid="input-token-symbol"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tokensIssued">Total Tokens to Issue</Label>
                  <Input
                    id="tokensIssued"
                    type="number"
                    value={projectForm.tokensIssued}
                    onChange={(e) => setProjectForm({ ...projectForm, tokensIssued: e.target.value })}
                    placeholder="100000"
                    data-testid="input-tokens-issued"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePerToken">Price Per Token (₦)</Label>
                  <Input
                    id="pricePerToken"
                    type="number"
                    value={projectForm.pricePerToken}
                    onChange={(e) => setProjectForm({ ...projectForm, pricePerToken: e.target.value })}
                    placeholder="10"
                    data-testid="input-price-per-token"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="photo">Project Photo (Optional)</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  onChange={(e) => setProjectPhoto(e.target.files?.[0] || null)}
                  data-testid="input-project-photo"
                />
                {projectPhoto && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {projectPhoto.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="teaserDocument">Teaser Document (Optional)</Label>
                <Input
                  id="teaserDocument"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setTeaserDocument(e.target.files?.[0] || null)}
                  data-testid="input-teaser-document"
                />
                {teaserDocument && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {teaserDocument.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="documents">Additional Documents (Optional)</Label>
                <Input
                  id="documents"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  multiple
                  onChange={(e) => setProjectDocuments(e.target.files)}
                  data-testid="input-project-documents"
                />
                {projectDocuments && projectDocuments.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {projectDocuments.length} file(s)
                  </p>
                )}
              </div>
              <Button
                className="w-full"
                onClick={() => createProjectMutation.mutate({ 
                  form: projectForm, 
                  photo: projectPhoto,
                  teaserDoc: teaserDocument,
                  docs: projectDocuments
                })}
                disabled={createProjectMutation.isPending || !projectForm.name || !projectForm.tokenSymbol}
                data-testid="button-submit-project"
              >
                {createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
