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
import { Users, DollarSign, FileCheck, TrendingUp, ArrowLeft, CheckCircle, XCircle, RefreshCw, Shield, Settings, LogOut, ChevronLeft, ChevronRight, FileText, User as UserIcon } from "lucide-react";
import { Link } from "wouter";
import { BlockchainActivityFeed } from "@/components/BlockchainActivityFeed";
import type { User } from "@shared/schema";
import PlatformWallets from "@/pages/PlatformWallets";
import AdminWalletFunding from "@/pages/AdminWalletFunding";
import AdminBankAccounts from "@/pages/AdminBankAccounts";
import AdminPlatformFees from "@/pages/AdminPlatformFees";
import { DocumentGallery } from "@/components/DocumentGallery";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface BankDeposit {
  id: string;
  userId: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  amountNGN: string;
  platformFee: string;
  gasFee: string;
  ngntsAmount: string;
  status: "pending" | "approved" | "rejected" | "completed";
  referenceCode: string;
  proofUrl: string | null;
  notes: string | null;
  rejectedReason: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  txHash: string | null;
  walletActivationStatus: "created" | "pending" | "activating" | "active" | "failed" | null;
  createdAt: string;
  updatedAt: string;
}

// Type for KYC history response
type KycHistoryResponse = {
  userId: string;
  history: Array<{
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
  }>;
};

// Extend User interface with audit fields
// UserWithAudit type is now just an alias since User already includes all audit fields
type UserWithAudit = User;

// KYC Audit Trail View Component (Read-Only)
function KycAuditTrailView({ 
  user, 
  index, 
  total, 
  onPrevious, 
  onNext 
}: { 
  user: UserWithAudit | undefined; 
  index: number; 
  total: number; 
  onPrevious: () => void; 
  onNext: () => void; 
}) {
  // Fetch KYC history for selected user
  const { data: historyData, isLoading: historyLoading } = useQuery<KycHistoryResponse>({
    queryKey: [`/api/admin/users/${user?.id}/kyc-history`],
    enabled: !!user?.id,
  });

  // Get the latest decision to extract admin name
  const latestDecision = historyData?.history?.[0];

  if (!user) {
    return (
      <Card className="w-full md:w-3/5 bg-white/5 border-white/10 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center justify-center h-full py-12">
          <FileText className="w-12 h-12 text-slate-400 mb-4" />
          <p className="text-slate-400">Select a user to view audit trail</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full md:w-3/5 bg-white/5 border-white/10 backdrop-blur-sm">
      {/* Navigation Header */}
      <CardHeader className="pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white">
              {user.firstName} {user.lastName}
            </CardTitle>
            <CardDescription className="text-xs mt-1 text-slate-400">
              Record {index + 1} of {total}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevious}
              disabled={index === 0}
              data-testid="button-prev-kyc-audit"
              aria-label="Previous record"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              disabled={index >= total - 1}
              data-testid="button-next-kyc-audit"
              aria-label="Next record"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <ScrollArea className="h-[calc(100vh-520px)]">
        <CardContent className="p-6 space-y-6">
          {/* User Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400">User Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400">Email</p>
                <p className="text-sm font-medium text-white" data-testid="text-user-email">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Phone</p>
                <p className="text-sm font-medium text-white" data-testid="text-user-phone">{user.phone || "Not provided"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Role</p>
                <Badge variant="outline" className="text-xs" data-testid="badge-user-role">{user.role}</Badge>
              </div>
              <div>
                <p className="text-xs text-slate-400">Status</p>
                <Badge 
                  variant={user.kycStatus === 'approved' ? 'default' : 'destructive'} 
                  className="text-xs"
                  data-testid="badge-kyc-status"
                >
                  {user.kycStatus}
                </Badge>
              </div>
            </div>
          </div>

          {/* Audit Trail Information */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-sm font-semibold text-slate-400">Audit Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400">Processed Date</p>
                <p className="text-sm font-medium text-white" data-testid="text-processed-date">
                  {user.kycProcessedAt 
                    ? new Date(user.kycProcessedAt).toLocaleString() 
                    : "Not available"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Processed By</p>
                <p className="text-sm font-medium text-white" data-testid="text-processed-by">
                  {historyLoading ? (
                    "Loading..."
                  ) : latestDecision?.processedBy ? (
                    `${latestDecision.processedBy.firstName} ${latestDecision.processedBy.lastName}`
                  ) : (
                    "System"
                  )}
                </p>
              </div>
            </div>
            {user.kycAdminNotes && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Admin Notes</p>
                <div 
                  className="text-sm p-3 rounded-md bg-white/5 border border-white/10 text-white"
                  data-testid="text-admin-notes"
                >
                  {user.kycAdminNotes}
                </div>
              </div>
            )}
          </div>

          {/* KYC Documents */}
          {user.kycDocuments && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-sm font-semibold text-slate-400">KYC Documents</h3>
              <DocumentGallery documents={user.kycDocuments} />
            </div>
          )}

          {/* Decision History Timeline */}
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : historyData && historyData.history.length > 0 ? (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-sm font-semibold text-slate-400">Decision History</h3>
              <div className="space-y-4">
                {historyData.history.map((record, idx) => (
                  <div 
                    key={record.id} 
                    className="flex gap-4 relative"
                    data-testid={`history-item-${idx}`}
                  >
                    {/* Timeline connector */}
                    {idx < historyData.history.length - 1 && (
                      <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-white/10" />
                    )}
                    
                    {/* Icon */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center relative z-10">
                      <FileCheck className="w-4 h-4 text-emerald-500" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {record.previousStatus} → {record.newStatus}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(record.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge 
                          variant={record.newStatus === 'approved' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {record.newStatus}
                        </Badge>
                      </div>
                      {record.processedBy && (
                        <p className="text-xs text-slate-400 mt-1">
                          By: {record.processedBy.firstName} {record.processedBy.lastName}
                        </p>
                      )}
                      {record.adminNotes && (
                        <div className="mt-2 text-xs p-2 rounded bg-white/5 border border-white/10 text-white">
                          {record.adminNotes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </ScrollArea>
    </Card>
  );
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
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">My Admin Wallet</CardTitle>
          <CardDescription className="text-slate-400">Manage your admin Stellar wallet</CardDescription>
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
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">My Admin Wallet</CardTitle>
        <CardDescription className="text-slate-400">Manage your admin Stellar wallet for platform operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Wallet Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">Status:</span>
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
            <Label className="text-slate-400">Stellar Public Key</Label>
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
              <Label className="text-slate-400">XLM Balance</Label>
              <p className="text-2xl font-bold text-white" data-testid="text-xlm-balance">
                {wallet?.stellarBalance?.XLM || "0"} XLM
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400">USDC Balance</Label>
              <p className="text-2xl font-bold text-white" data-testid="text-usdc-balance">
                {wallet?.stellarBalance?.USDC || "0"} USDC
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-white/10">
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
            <p className="text-sm text-slate-400">
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
  const { toast} = useToast();
  const [approvalDialog, setApprovalDialog] = useState<{
    type: 'deposit' | 'withdrawal' | 'kyc' | 'bank_details' | 'bank_deposit';
    item: any;
  } | null>(null);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [approvedAmount, setApprovedAmount] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [createProjectDialog, setCreateProjectDialog] = useState(false);
  
  // KYC split-pane state with sub-tabs
  const [kycSubTab, setKycSubTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [kycIndexMap, setKycIndexMap] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [kycAction, setKycAction] = useState<'approve' | 'reject'>('approve');
  const [kycNotes, setKycNotes] = useState("");
  
  // Helper to get/set current tab's selected index
  const selectedKycIndex = kycIndexMap[kycSubTab];
  const setSelectedKycIndex = (indexOrUpdater: number | ((prev: number) => number)) => {
    setKycIndexMap(prev => ({
      ...prev,
      [kycSubTab]: typeof indexOrUpdater === 'function' 
        ? indexOrUpdater(prev[kycSubTab])
        : indexOrUpdater
    }));
  };
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
  
  // Bank account settings state
  const [bankSettings, setBankSettings] = useState({
    accountName: "",
    bankName: "",
    accountNumber: "",
    routingCode: "",
  });

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

  const { data: metrics } = useQuery<{ metrics: DashboardMetrics }>({
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

  const { data: bankDeposits } = useQuery<{ deposits: BankDeposit[] }>({
    queryKey: ["/api/admin/bank-deposits?status=pending"],
    enabled: !!user,
  });

  const { data: walletsData } = useQuery<{ wallets: Wallet[] }>({
    queryKey: ["/api/admin/wallets"],
    enabled: !!user,
  });

  // Three separate KYC queries for sub-tabs
  const { data: pendingKycData } = useQuery<{ users: User[] }>({
    queryKey: ["/api/admin/users?kycStatus=submitted"],
    enabled: !!user,
  });

  const { data: approvedKycData } = useQuery<{ users: User[] }>({
    queryKey: ["/api/admin/users?kycStatus=approved"],
    enabled: !!user,
  });

  const { data: rejectedKycData } = useQuery<{ users: User[] }>({
    queryKey: ["/api/admin/users?kycStatus=rejected"],
    enabled: !!user,
  });

  // Get current sub-tab's data
  const usersData = kycSubTab === 'pending' 
    ? pendingKycData 
    : kycSubTab === 'approved' 
    ? approvedKycData 
    : rejectedKycData;

  const { data: bankAccountSettings } = useQuery<{
    accountName: string;
    bankName: string;
    accountNumber: string;
    routingCode: string;
  }>({
    queryKey: ["/api/admin/settings/bank-account"],
    enabled: !!user,
  });

  // Sync bank account settings from API
  useEffect(() => {
    if (bankAccountSettings) {
      setBankSettings(bankAccountSettings);
    }
  }, [bankAccountSettings]);

  // Reset/clamp selectedKycIndex when usersData changes
  useEffect(() => {
    const kycUsers = usersData?.users || [];
    if (kycUsers.length === 0) {
      setSelectedKycIndex(0);
    } else if (selectedKycIndex >= kycUsers.length) {
      setSelectedKycIndex(Math.max(0, kycUsers.length - 1));
    }
  }, [usersData, selectedKycIndex]);

  // Keyboard shortcuts for KYC navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const kycUsers = usersData?.users || [];
      if (kycUsers.length === 0) return;

      // Only handle shortcuts when not focused on input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          setSelectedKycIndex(prev => Math.min(prev + 1, kycUsers.length - 1));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setSelectedKycIndex(prev => Math.max(0, prev - 1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [usersData]);

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
      // Invalidate all KYC query keys
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users?kycStatus=submitted"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users?kycStatus=approved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users?kycStatus=rejected"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      // Invalidate user profile queries so frontend updates
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/kyc-status"] });
      setApprovalDialog(null);
      resetForm();
      
      // Auto-advance to next KYC in split-pane view
      const kycUsers = usersData?.users || [];
      if (kycUsers.length > 0) {
        setSelectedKycIndex(prev => {
          const newLength = kycUsers.length - 1; // After removing current item
          if (newLength === 0) return 0; // No items left
          if (prev >= newLength) return Math.max(0, newLength - 1); // Was on last item, go to new last item
          return prev; // Stay at current position
        });
      }
      setKycNotes("");
      setKycAction('approve');
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const processBankDetailsMutation = useMutation({
    mutationFn: async ({ id, action }: any) => {
      const res = await apiRequest("PUT", `/api/admin/users/${id}/bank-details`, {
        action,
      });
      return await res.json();
    },
    onSuccess: (data: any, variables: any) => {
      toast({ 
        title: "Success", 
        description: `Bank details ${variables.action}d successfully` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/kyc-status"] });
      setApprovalDialog(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const processBankDepositMutation = useMutation({
    mutationFn: async ({ id, action, adminNotes }: any) => {
      const endpoint = action === 'approve' 
        ? `/api/admin/bank-deposits/${id}/approve`
        : `/api/admin/bank-deposits/${id}/reject`;
      
      const res = await apiRequest("POST", endpoint, {
        reason: action === 'reject' ? adminNotes : undefined,
      });
      return await res.json();
    },
    onSuccess: (data: any, variables: any) => {
      toast({ 
        title: "Success", 
        description: `Bank deposit ${variables.action}d successfully` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bank-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/regenerator/bank-deposits"] });
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

  const saveBankSettingsMutation = useMutation({
    mutationFn: async (settings: typeof bankSettings) => {
      return await apiRequest('PUT', '/api/admin/settings/bank-account', settings);
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Bank account details have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/bank-account"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
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
    } else if (approvalDialog.type === 'bank_details') {
      processBankDetailsMutation.mutate({
        id: approvalDialog.item.id,
        action,
      });
    } else if (approvalDialog.type === 'bank_deposit') {
      processBankDepositMutation.mutate({
        id: approvalDialog.item.id,
        action,
        adminNotes,
      });
    }
  };

  const formatCurrency = (amount: string) => {
    return `₦${parseFloat(amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLocation("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto p-4 py-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
            data-testid="link-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
              <p className="text-slate-400">Manage platform operations</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/onchain-verification">
                <Button variant="outline" data-testid="button-onchain-verification">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  On-Chain Verification
                </Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                data-testid="button-admin-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Users</CardTitle>
              <Users className="w-4 h-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{metrics?.metrics.totalUsers || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Pending KYC</CardTitle>
              <FileCheck className="w-4 h-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">{metrics?.metrics.pendingKycCount || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Pending Deposits</CardTitle>
              <DollarSign className="w-4 h-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{metrics?.metrics.pendingDepositsCount || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Pending Withdrawals</CardTitle>
              <TrendingUp className="w-4 h-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{metrics?.metrics.pendingWithdrawalsCount || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Blockchain Activity Feed */}
        <div className="mb-8">
          <BlockchainActivityFeed limit={5} />
        </div>

        {/* Phase 4-C: Regenerative Capital System */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Regenerative Capital Management</h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Link href="/admin/investments">
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover-elevate cursor-pointer" data-testid="card-investments">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <TrendingUp className="w-5 h-5" />
                    Investments
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Monitor all Regenerator investments
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/admin/lp-pool">
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover-elevate cursor-pointer" data-testid="card-lp-pool">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <DollarSign className="w-5 h-5" />
                    LP Pool
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Monitor liquidity pool health
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/admin/redemptions">
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover-elevate cursor-pointer" data-testid="card-redemptions">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <RefreshCw className="w-5 h-5" />
                    Redemptions
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Review token redemption requests
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/admin/treasury">
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover-elevate cursor-pointer" data-testid="card-treasury">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <DollarSign className="w-5 h-5" />
                    Treasury Pool
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Monitor treasury health & reconciliation
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/admin/cashflows">
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover-elevate cursor-pointer" data-testid="card-cashflows">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <TrendingUp className="w-5 h-5" />
                    Cashflows
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Verify project revenue cashflows
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/admin/audit">
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover-elevate cursor-pointer" data-testid="card-audit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Shield className="w-5 h-5" />
                    Audit Logs
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    View compliance audit trail
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>

        {/* Tabs for Different Actions */}
        <Tabs defaultValue="deposits" className="space-y-6">
          <TabsList className="grid w-full md:w-auto grid-cols-5 md:grid-cols-11">
            <TabsTrigger value="admin-wallet" data-testid="tab-admin-wallet">My Wallet</TabsTrigger>
            <TabsTrigger value="platform" data-testid="tab-platform">Platform</TabsTrigger>
            <TabsTrigger value="deposits" data-testid="tab-deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals" data-testid="tab-withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="kyc" data-testid="tab-kyc">KYC Requests</TabsTrigger>
            <TabsTrigger value="bank-deposits" data-testid="tab-bank-deposits">Bank Deposits</TabsTrigger>
            <TabsTrigger value="wallet-activation" data-testid="tab-wallet-activation">Wallet Activation</TabsTrigger>
            <TabsTrigger value="projects" data-testid="tab-projects">Projects</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="wallets" data-testid="tab-wallets">Wallets</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Admin Wallet Tab */}
          <TabsContent value="admin-wallet">
            <AdminWalletCard />
          </TabsContent>

          {/* Platform Wallets Tab */}
          <TabsContent value="platform">
            <PlatformWallets />
          </TabsContent>

          {/* Deposits Tab */}
          <TabsContent value="deposits">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Pending Deposit Requests</CardTitle>
                <CardDescription className="text-slate-400">Review and approve deposit requests</CardDescription>
              </CardHeader>
              <CardContent>
                {deposits && deposits.deposits.length > 0 ? (
                  <div className="space-y-4">
                    {deposits.deposits.map((deposit) => (
                      <div key={deposit.id} className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5">
                        <div>
                          <h4 className="font-semibold text-white">
                            {deposit.userFirstName} {deposit.userLastName}
                          </h4>
                          <p className="text-sm text-slate-400">{deposit.userEmail}</p>
                          <p className="text-sm mt-1 text-white">
                            Amount: <span className="font-semibold">{formatCurrency(deposit.amount)}</span>
                          </p>
                          <p className="text-xs text-slate-500">Ref: {deposit.transactionReference}</p>
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
                  <p className="text-center py-8 text-slate-400">No pending deposits</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank Deposits Tab */}
          <TabsContent value="bank-deposits">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Pending Bank Deposits (NGN)</CardTitle>
                <CardDescription className="text-slate-400">Review and approve regenerator bank transfer deposits</CardDescription>
              </CardHeader>
              <CardContent>
                {bankDeposits && bankDeposits.deposits.length > 0 ? (
                  <div className="space-y-4">
                    {bankDeposits.deposits.map((deposit) => {
                      const willActivateWallet = deposit.walletActivationStatus !== 'active';
                      
                      return (
                        <div key={deposit.id} className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5" data-testid={`bank-deposit-${deposit.id}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-white">
                                {deposit.userFirstName} {deposit.userLastName}
                              </h4>
                              {willActivateWallet && (
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30" data-testid={`badge-first-deposit-${deposit.id}`}>
                                  First Deposit - Will Activate Wallet
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-400">{deposit.userEmail}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <p className="text-sm text-white">
                                Amount: <span className="font-semibold">₦{parseFloat(deposit.amountNGN).toLocaleString()}</span>
                              </p>
                              <span className="text-slate-400">•</span>
                              <p className="text-sm text-white">
                                NGNTS Credit: <span className="font-semibold">{parseFloat(deposit.ngntsAmount).toLocaleString()}</span>
                              </p>
                            </div>
                            <p className="text-xs text-slate-400 mt-1" data-testid={`text-reference-${deposit.id}`}>
                              Ref: {deposit.referenceCode}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-500">
                              <span>Submitted: {new Date(deposit.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}</span>
                              {deposit.proofUrl && deposit.updatedAt && (
                                <>
                                  <span>•</span>
                                  <span>Proof uploaded: {new Date(deposit.updatedAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Button
                            onClick={() => setApprovalDialog({ type: 'bank_deposit', item: deposit })}
                            data-testid={`button-review-bank-deposit-${deposit.id}`}
                          >
                            Review
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center py-8 text-slate-400">No pending bank deposits</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Pending Withdrawal Requests</CardTitle>
                <CardDescription className="text-slate-400">Review and approve withdrawal requests</CardDescription>
              </CardHeader>
              <CardContent>
                {withdrawals && withdrawals.withdrawals.length > 0 ? (
                  <div className="space-y-4">
                    {withdrawals.withdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5">
                        <div>
                          <h4 className="font-semibold text-white">
                            {withdrawal.userFirstName} {withdrawal.userLastName}
                          </h4>
                          <p className="text-sm text-slate-400">{withdrawal.userEmail}</p>
                          <p className="text-sm mt-1 text-white">
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
                  <p className="text-center py-8 text-slate-400">No pending withdrawals</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* KYC Tab - Split Pane Layout */}
          <TabsContent value="kyc">
            {/* Nested Tabs for KYC Status */}
            <Tabs value={kycSubTab} onValueChange={(value) => setKycSubTab(value as 'pending' | 'approved' | 'rejected')}>
              <TabsList className="mb-4">
                <TabsTrigger value="pending" data-testid="tab-kyc-pending">
                  Pending {pendingKycData && `(${pendingKycData.users.length})`}
                </TabsTrigger>
                <TabsTrigger value="approved" data-testid="tab-kyc-approved">
                  Approved {approvedKycData && `(${approvedKycData.users.length})`}
                </TabsTrigger>
                <TabsTrigger value="rejected" data-testid="tab-kyc-rejected">
                  Rejected {rejectedKycData && `(${rejectedKycData.users.length})`}
                </TabsTrigger>
              </TabsList>

              {/* Pending KYC Sub-Tab */}
              <TabsContent value="pending">
                {pendingKycData && pendingKycData.users.length > 0 ? (
                  <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-350px)]">
                    {/* Left Panel - KYC Request List */}
                    <Card className="w-full md:w-2/5 bg-white/5 border-white/10 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-white">Pending KYC Requests</CardTitle>
                        <CardDescription className="text-slate-400">
                          {pendingKycData.users.length} request{pendingKycData.users.length !== 1 ? 's' : ''} awaiting review
                        </CardDescription>
                      </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-420px)]">
                      <div className="space-y-2 p-4">
                        {pendingKycData.users.map((kycUser, index) => (
                          <Card
                            key={kycUser.id}
                            className={`cursor-pointer transition-colors ${
                              selectedKycIndex === index ? 'bg-white/10 border-emerald-500/50' : 'bg-white/5 border-white/10 hover-elevate'
                            }`}
                            onClick={() => setSelectedKycIndex(index)}
                            data-testid={`kyc-list-item-${index}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm text-white">
                                    {kycUser.firstName} {kycUser.lastName}
                                  </h4>
                                  <p className="text-xs text-slate-400 mt-0.5">{kycUser.email}</p>
                                  <Badge variant="outline" className="mt-2 text-xs">
                                    {kycUser.kycStatus}
                                  </Badge>
                                </div>
                                {selectedKycIndex === index && (
                                  <div className="w-1 h-8 bg-primary rounded-full ml-2" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Right Panel - KYC Detail View */}
                <Card className="w-full md:w-3/5 bg-white/5 border-white/10 backdrop-blur-sm">
                  {(() => {
                    const selectedKycUser = pendingKycData.users[selectedKycIndex];
                    if (!selectedKycUser) {
                      return (
                        <CardContent className="flex flex-col items-center justify-center h-full py-12">
                          <FileText className="w-12 h-12 text-slate-400 mb-4" />
                          <p className="text-slate-400">Select a KYC request to review</p>
                        </CardContent>
                      );
                    }

                    return (
                      <>
                        {/* Navigation Header */}
                        <CardHeader className="pb-3 border-b border-white/10">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg text-white">
                                {selectedKycUser.firstName} {selectedKycUser.lastName}
                              </CardTitle>
                              <CardDescription className="text-xs mt-1 text-slate-400">
                                Request {selectedKycIndex + 1} of {pendingKycData.users.length}
                              </CardDescription>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedKycIndex(prev => Math.max(0, prev - 1))}
                                disabled={selectedKycIndex === 0}
                                data-testid="button-prev-kyc"
                                aria-label="Previous KYC request"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedKycIndex(prev => Math.min(prev + 1, pendingKycData.users.length - 1))}
                                disabled={selectedKycIndex >= pendingKycData.users.length - 1}
                                data-testid="button-next-kyc"
                                aria-label="Next KYC request"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        <ScrollArea className="h-[calc(100vh-520px)]">
                          <CardContent className="space-y-6 p-6">
                            {/* Personal Information Section */}
                            <div className="space-y-3">
                              <h3 className="font-semibold text-sm flex items-center gap-2 text-white">
                                <UserIcon className="w-4 h-4" />
                                Personal Information
                              </h3>
                              <div className="grid grid-cols-2 gap-4 p-4 border border-white/10 rounded-lg bg-white/5">
                                <div>
                                  <Label className="text-xs text-slate-400">Email</Label>
                                  <p className="text-sm font-medium text-white">{selectedKycUser.email}</p>
                                </div>
                                {selectedKycUser.phone && (
                                  <div>
                                    <Label className="text-xs text-slate-400">Phone</Label>
                                    <p className="text-sm font-medium text-white">{selectedKycUser.phone}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Document Gallery Section */}
                            <div className="space-y-3">
                              <h3 className="font-semibold text-sm flex items-center gap-2 text-white">
                                <FileText className="w-4 h-4" />
                                Identity Documents
                              </h3>
                              {selectedKycUser.kycDocuments ? (
                                <DocumentGallery documents={selectedKycUser.kycDocuments} />
                              ) : (
                                <p className="text-sm text-slate-400 text-center py-8 border border-white/10 rounded-lg">
                                  No documents uploaded
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </ScrollArea>

                        {/* Decision Footer */}
                        <div className="border-t p-4 space-y-4">
                          <div className="flex gap-4">
                            <Button
                              variant={kycAction === 'approve' ? 'default' : 'outline'}
                              onClick={() => setKycAction('approve')}
                              className="flex-1"
                              data-testid="button-kyc-approve-option"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              variant={kycAction === 'reject' ? 'destructive' : 'outline'}
                              onClick={() => setKycAction('reject')}
                              className="flex-1"
                              data-testid="button-kyc-reject-option"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="kyc-notes" className="text-xs">
                              Admin Notes {kycAction === 'reject' && '(Required for rejection)'}
                            </Label>
                            <Textarea
                              id="kyc-notes"
                              placeholder={kycAction === 'reject' ? 'Provide reason for rejection...' : 'Add any notes for this decision...'}
                              value={kycNotes}
                              onChange={(e) => setKycNotes(e.target.value)}
                              rows={2}
                              data-testid="textarea-kyc-notes"
                            />
                          </div>

                          <Button
                            className="w-full"
                            variant={kycAction === 'approve' ? 'default' : 'destructive'}
                            onClick={() => {
                              if (kycAction === 'reject' && !kycNotes.trim()) {
                                toast({
                                  title: "Notes Required",
                                  description: "Please provide a reason for rejection",
                                  variant: "destructive",
                                });
                                return;
                              }
                              processKycMutation.mutate({
                                id: selectedKycUser.id,
                                action: kycAction,
                                adminNotes: kycNotes,
                              });
                            }}
                            disabled={processKycMutation.isPending}
                            data-testid="button-confirm-kyc-decision"
                          >
                            {processKycMutation.isPending
                              ? "Processing..."
                              : `Confirm ${kycAction === 'approve' ? 'Approval' : 'Rejection'}`}
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </Card>
              </div>
                ) : (
                  <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileCheck className="w-12 h-12 text-slate-400 mb-4" />
                      <p className="text-slate-400">No pending KYC requests</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Approved KYC Sub-Tab */}
              <TabsContent value="approved">
                {approvedKycData && approvedKycData.users.length > 0 ? (
                  <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-350px)]">
                    {/* Left Panel - Approved Users List */}
                    <Card className="w-full md:w-2/5 bg-white/5 border-white/10 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-white">Approved Users</CardTitle>
                        <CardDescription className="text-slate-400">
                          {approvedKycData.users.length} approved record{approvedKycData.users.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="h-[calc(100vh-420px)]">
                          <div className="space-y-2 p-4">
                            {approvedKycData.users.map((kycUser, index) => (
                              <Card
                                key={kycUser.id}
                                className={`cursor-pointer transition-colors ${
                                  kycIndexMap.approved === index ? 'bg-white/10 border-emerald-500/50' : 'bg-white/5 border-white/10 hover-elevate'
                                }`}
                                onClick={() => setKycIndexMap(prev => ({ ...prev, approved: index }))}
                                data-testid={`approved-kyc-list-item-${index}`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-sm text-white">
                                        {kycUser.firstName} {kycUser.lastName}
                                      </h4>
                                      <p className="text-xs text-slate-400 mt-0.5">{kycUser.email}</p>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        <Badge variant="default" className="text-xs">
                                          {kycUser.kycStatus}
                                        </Badge>
                                        {kycUser.kycProcessedAt && (
                                          <Badge variant="outline" className="text-xs">
                                            {new Date(kycUser.kycProcessedAt).toLocaleDateString()}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    {kycIndexMap.approved === index && (
                                      <div className="w-1 h-8 bg-primary rounded-full ml-2" />
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Right Panel - Audit Trail View */}
                    <KycAuditTrailView 
                      user={approvedKycData.users[kycIndexMap.approved]}
                      index={kycIndexMap.approved}
                      total={approvedKycData.users.length}
                      onPrevious={() => setKycIndexMap(prev => ({ ...prev, approved: Math.max(0, prev.approved - 1) }))}
                      onNext={() => setKycIndexMap(prev => ({ ...prev, approved: Math.min(prev.approved + 1, approvedKycData.users.length - 1) }))}
                    />
                  </div>
                ) : (
                  <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileCheck className="w-12 h-12 text-slate-400 mb-4" />
                      <p className="text-slate-400">No approved KYC records</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Rejected KYC Sub-Tab */}
              <TabsContent value="rejected">
                {rejectedKycData && rejectedKycData.users.length > 0 ? (
                  <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-350px)]">
                    {/* Left Panel - Rejected Users List */}
                    <Card className="w-full md:w-2/5 bg-white/5 border-white/10 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-white">Rejected Users</CardTitle>
                        <CardDescription className="text-slate-400">
                          {rejectedKycData.users.length} rejected record{rejectedKycData.users.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="h-[calc(100vh-420px)]">
                          <div className="space-y-2 p-4">
                            {rejectedKycData.users.map((kycUser, index) => (
                              <Card
                                key={kycUser.id}
                                className={`cursor-pointer transition-colors ${
                                  kycIndexMap.rejected === index ? 'bg-white/10 border-emerald-500/50' : 'bg-white/5 border-white/10 hover-elevate'
                                }`}
                                onClick={() => setKycIndexMap(prev => ({ ...prev, rejected: index }))}
                                data-testid={`rejected-kyc-list-item-${index}`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-sm text-white">
                                        {kycUser.firstName} {kycUser.lastName}
                                      </h4>
                                      <p className="text-xs text-slate-400 mt-0.5">{kycUser.email}</p>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        <Badge variant="destructive" className="text-xs">
                                          {kycUser.kycStatus}
                                        </Badge>
                                        {kycUser.kycProcessedAt && (
                                          <Badge variant="outline" className="text-xs">
                                            {new Date(kycUser.kycProcessedAt).toLocaleDateString()}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    {kycIndexMap.rejected === index && (
                                      <div className="w-1 h-8 bg-primary rounded-full ml-2" />
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Right Panel - Audit Trail View */}
                    <KycAuditTrailView 
                      user={rejectedKycData.users[kycIndexMap.rejected]}
                      index={kycIndexMap.rejected}
                      total={rejectedKycData.users.length}
                      onPrevious={() => setKycIndexMap(prev => ({ ...prev, rejected: Math.max(0, prev.rejected - 1) }))}
                      onNext={() => setKycIndexMap(prev => ({ ...prev, rejected: Math.min(prev.rejected + 1, rejectedKycData.users.length - 1) }))}
                    />
                  </div>
                ) : (
                  <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileCheck className="w-12 h-12 text-slate-400 mb-4" />
                      <p className="text-slate-400">No rejected KYC records</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Wallet Activation Tab */}
          <TabsContent value="wallet-activation">
            <AdminWalletFunding />
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Project Management</CardTitle>
                <CardDescription className="text-slate-400">Create and manage investment projects</CardDescription>
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
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">User Management</CardTitle>
                <CardDescription className="text-slate-400">View and manage all platform users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button onClick={fetchAllUsers} data-testid="button-load-users">
                    {allUsersData ? "Refresh Users" : "Load All Users"}
                  </Button>
                  {allUsersData && allUsersData.users.length > 0 ? (
                    <div className="space-y-4">
                      {allUsersData.users.map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{u.firstName} {u.lastName}</h4>
                            <p className="text-sm text-slate-400">{u.email}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge variant="outline">{u.role}</Badge>
                              <Badge variant={u.kycStatus === 'approved' ? 'default' : 'secondary'}>{u.kycStatus}</Badge>
                              {u.bankDetailsStatus && u.bankDetailsStatus !== 'not_submitted' && (
                                <Badge 
                                  variant={u.bankDetailsStatus === 'approved' ? 'default' : 'secondary'}
                                  data-testid={`badge-bank-status-${u.id}`}
                                >
                                  Bank: {u.bankDetailsStatus}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {u.role !== 'admin' && (
                            <div className="flex gap-2">
                              {u.kycStatus === 'submitted' && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => setApprovalDialog({ type: 'kyc', item: { id: u.id, userEmail: u.email, firstName: u.firstName, lastName: u.lastName, userPhone: u.phone, kycDocuments: u.kycDocuments } })}
                                  data-testid={`button-review-kyc-${u.id}`}
                                >
                                  Review KYC
                                </Button>
                              )}
                              {u.bankDetailsStatus === 'pending' && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => setApprovalDialog({ 
                                    type: 'bank_details', 
                                    item: { 
                                      id: u.id, 
                                      firstName: u.firstName, 
                                      lastName: u.lastName, 
                                      bankDetails: u.bankDetails 
                                    } 
                                  })}
                                  data-testid={`button-review-bank-${u.id}`}
                                >
                                  Review Bank Details
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => suspendUserMutation.mutate({ id: u.id, isSuspended: true })}
                                data-testid={`button-suspend-user-${u.id}`}
                              >
                                Suspend
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : allUsersData ? (
                    <p className="text-center py-8 text-slate-400">No users found</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wallets Tab */}
          <TabsContent value="wallets">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">User Wallets</CardTitle>
                <CardDescription className="text-slate-400">View all user wallets and balances</CardDescription>
              </CardHeader>
              <CardContent>
                {walletsData && walletsData.wallets.length > 0 ? (
                  <div className="space-y-4">
                    {walletsData.wallets.map((wallet) => {
                      const cryptoBalances = (wallet.cryptoBalances || {}) as Record<string, string>;
                      return (
                        <div key={wallet.id} className="p-4 border border-white/10 rounded-lg bg-white/5" data-testid={`wallet-${wallet.id}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-white">
                                {wallet.userFirstName} {wallet.userLastName}
                              </h4>
                              <p className="text-sm text-slate-400">{wallet.userEmail}</p>
                              <Badge variant="outline" className="mt-1">{wallet.userRole}</Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-400">Wallet ID</p>
                              <p className="text-xs font-mono text-slate-300">{wallet.id.substring(0, 8)}...</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-slate-400">Fiat Balance</p>
                              <p className="text-lg font-bold" data-testid={`fiat-balance-${wallet.id}`}>
                                ₦{parseFloat(wallet.fiatBalance || "0").toLocaleString()}
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-slate-400">Crypto Balances</p>
                              <div className="space-y-1">
                                <p className="text-sm text-white" data-testid={`xlm-balance-${wallet.id}`}>
                                  <span className="font-semibold">XLM:</span> {cryptoBalances.XLM || "0"}
                                </p>
                                <p className="text-sm text-white" data-testid={`usdc-balance-${wallet.id}`}>
                                  <span className="font-semibold">USDC:</span> {cryptoBalances.USDC || "0"}
                                </p>
                                {Object.keys(cryptoBalances).filter(key => key !== 'XLM' && key !== 'USDC').map(token => (
                                  <p key={token} className="text-sm text-white">
                                    <span className="font-semibold">{token}:</span> {cryptoBalances[token]}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-white/10">
                            <p className="text-xs text-slate-400 mb-1">Stellar Public Key</p>
                            <div className="flex items-center gap-2 mb-2">
                              <p className="text-xs font-mono break-all flex-1 text-slate-300" data-testid={`stellar-key-${wallet.id}`}>
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

                          <div className="flex gap-4 mt-2 text-xs text-slate-500">
                            <span>Created: {new Date(wallet.createdAt).toLocaleDateString()}</span>
                            <span>Updated: {new Date(wallet.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center py-8 text-slate-400">No wallets found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Tabs defaultValue="bank-accounts" className="space-y-6">
              <TabsList data-testid="tabs-settings">
                <TabsTrigger value="bank-accounts" data-testid="tab-bank-accounts">
                  Bank Accounts
                </TabsTrigger>
                <TabsTrigger value="platform-fees" data-testid="tab-platform-fees">
                  Platform Fees
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bank-accounts">
                <AdminBankAccounts />
              </TabsContent>

              <TabsContent value="platform-fees">
                <AdminPlatformFees />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* Approval Dialog */}
        <Dialog open={!!approvalDialog} onOpenChange={() => { setApprovalDialog(null); resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Review {approvalDialog?.type === 'deposit' ? 'Deposit' : 
                        approvalDialog?.type === 'withdrawal' ? 'Withdrawal' : 
                        approvalDialog?.type === 'bank_details' ? 'Bank Details' : 
                        approvalDialog?.type === 'bank_deposit' ? 'Bank Deposit' :
                        'KYC'} Request
              </DialogTitle>
              <DialogDescription>
                {approvalDialog?.type === 'deposit' && `Approve or reject deposit request for ${formatCurrency(approvalDialog.item.amount)}`}
                {approvalDialog?.type === 'withdrawal' && `Approve or reject withdrawal request for ${formatCurrency(approvalDialog.item.amount)}`}
                {approvalDialog?.type === 'kyc' && `Approve or reject KYC for ${approvalDialog.item.firstName} ${approvalDialog.item.lastName}`}
                {approvalDialog?.type === 'bank_details' && `Approve or reject bank details for ${approvalDialog.item.firstName} ${approvalDialog.item.lastName}`}
                {approvalDialog?.type === 'bank_deposit' && `Approve or reject bank deposit for ₦${parseFloat(approvalDialog.item.amountNGN).toLocaleString()}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Display Bank Details for review */}
              {approvalDialog?.type === 'bank_details' && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-semibold text-sm">Bank Details Information</h4>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-slate-400">User's Registered Name</Label>
                      <p className="text-sm font-medium">
                        {approvalDialog.item.firstName} {approvalDialog.item.lastName}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Account Name</Label>
                      <p className="text-sm font-medium" data-testid="text-bank-account-name">
                        {approvalDialog.item.bankDetails?.accountName || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Account Number</Label>
                      <p className="text-sm font-medium font-mono" data-testid="text-bank-account-number">
                        {approvalDialog.item.bankDetails?.accountNumber 
                          ? `****${approvalDialog.item.bankDetails.accountNumber.slice(-4)}`
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Bank Name</Label>
                      <p className="text-sm font-medium" data-testid="text-bank-name">
                        {approvalDialog.item.bankDetails?.bankName || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Bank Code</Label>
                      <p className="text-sm font-medium">
                        {approvalDialog.item.bankDetails?.bankCode || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Verification Document</Label>
                      {approvalDialog.item.bankDetails?.verificationDocument ? (
                        <a 
                          href={approvalDialog.item.bankDetails.verificationDocument} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block mt-1"
                          data-testid="link-bank-verification-doc"
                        >
                          <img 
                            src={approvalDialog.item.bankDetails.verificationDocument} 
                            alt="Bank Verification Document" 
                            className="w-full h-48 object-cover rounded-md border hover-elevate cursor-pointer"
                            data-testid="img-bank-verification-doc"
                          />
                        </a>
                      ) : (
                        <p className="text-sm text-slate-400 mt-1">No document uploaded</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Display KYC Documents for review */}
              {approvalDialog?.type === 'kyc' && approvalDialog.item.kycDocuments && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-semibold text-sm">Uploaded Documents</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {approvalDialog.item.kycDocuments.idCard && (
                      <div className="space-y-2">
                        <Label className="text-xs">ID Card</Label>
                        <a 
                          href={approvalDialog.item.kycDocuments.idCard} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                          data-testid="link-id-card"
                        >
                          <img 
                            src={approvalDialog.item.kycDocuments.idCard} 
                            alt="ID Card" 
                            className="w-full h-48 object-cover rounded-md border hover-elevate cursor-pointer"
                            data-testid="img-id-card"
                          />
                        </a>
                      </div>
                    )}
                    {approvalDialog.item.kycDocuments.selfie && (
                      <div className="space-y-2">
                        <Label className="text-xs">Selfie</Label>
                        <a 
                          href={approvalDialog.item.kycDocuments.selfie} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                          data-testid="link-selfie"
                        >
                          <img 
                            src={approvalDialog.item.kycDocuments.selfie} 
                            alt="Selfie" 
                            className="w-full h-48 object-cover rounded-md border hover-elevate cursor-pointer"
                            data-testid="img-selfie"
                          />
                        </a>
                      </div>
                    )}
                    {approvalDialog.item.kycDocuments.addressProof && (
                      <div className="space-y-2">
                        <Label className="text-xs">Address Proof</Label>
                        <a 
                          href={approvalDialog.item.kycDocuments.addressProof} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                          data-testid="link-address-proof"
                        >
                          <img 
                            src={approvalDialog.item.kycDocuments.addressProof} 
                            alt="Address Proof" 
                            className="w-full h-48 object-cover rounded-md border hover-elevate cursor-pointer"
                            data-testid="img-address-proof"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                  {!approvalDialog.item.kycDocuments.idCard && 
                   !approvalDialog.item.kycDocuments.selfie && 
                   !approvalDialog.item.kycDocuments.addressProof && (
                    <p className="text-sm text-slate-400 text-center py-4">
                      No documents uploaded
                    </p>
                  )}
                </div>
              )}

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
                  <p className="text-xs text-slate-400">Leave empty to use requested amount</p>
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
                disabled={processDepositMutation.isPending || processWithdrawalMutation.isPending || processKycMutation.isPending || processBankDetailsMutation.isPending || processBankDepositMutation.isPending}
                data-testid="button-confirm"
              >
                {processDepositMutation.isPending || processWithdrawalMutation.isPending || processKycMutation.isPending || processBankDetailsMutation.isPending || processBankDepositMutation.isPending
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
                  <p className="text-sm text-slate-400">
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
                  <p className="text-sm text-slate-400">
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
                  <p className="text-sm text-slate-400">
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
