import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, XCircle, Clock, ArrowLeft, Building2, AlertCircle, FileText, Eye } from "lucide-react";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";

const NIGERIAN_BANKS = [
  { name: "Access Bank", code: "044" },
  { name: "GTBank", code: "058" },
  { name: "UBA", code: "033" },
  { name: "First Bank", code: "011" },
  { name: "Zenith Bank", code: "057" },
  { name: "Eco Bank", code: "050" },
  { name: "Fidelity Bank", code: "070" },
  { name: "Union Bank", code: "032" },
  { name: "Stanbic IBTC", code: "221" },
  { name: "Sterling Bank", code: "232" },
  { name: "Wema Bank", code: "035" },
  { name: "Polaris Bank", code: "076" },
];

export default function KYCVerification() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [idCard, setIdCard] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);
  
  // Bank details state
  const [submittingBankDetails, setSubmittingBankDetails] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [verificationDocument, setVerificationDocument] = useState<File | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      setLocation("/login");
      return;
    }
  }, [setLocation]);

  // Fetch user data from API with auto-refetch
  const { data: user } = useQuery<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    kycStatus: string;
    kycDocuments?: {
      idCard?: string;
      selfie?: string;
      addressProof?: string;
    };
    bankDetails?: {
      accountName?: string;
      accountNumberEncrypted?: string;
      bankName?: string;
      bankCode?: string;
      verificationDocument?: string;
    };
    bankDetailsStatus: string;
    role: string;
    totalInvestedNGN: string;
  }>({
    queryKey: ["/api/users/me"],
    refetchInterval: 10000,
  });

  // Sync user data to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
  }, [user]);

  // Pre-fill account name with user's name
  useEffect(() => {
    if (user && !accountName) {
      setAccountName(`${user.firstName} ${user.lastName}`);
    }
  }, [user, accountName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!idCard || !selfie || !addressProof) {
      toast({
        title: "Missing files",
        description: "Please upload all three required documents",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("idCard", idCard);
      formData.append("selfie", selfie);
      formData.append("addressProof", addressProof);

      const token = localStorage.getItem("token");
      const response = await fetch("/api/users/kyc", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to upload KYC documents");
      }

      await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/kyc-status"] });

      toast({
        title: "Documents Submitted Successfully!",
        description: "Your documents are under review. This typically takes 1-2 business days.",
      });

      setTimeout(() => setLocation("/regenerator-profile"), 2000);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload KYC documents",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBankDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate account number format (10 digits only)
    if (!/^\d{10}$/.test(accountNumber)) {
      toast({
        title: "Invalid account number",
        description: "Account number must be exactly 10 digits",
        variant: "destructive",
      });
      return;
    }

    if (!verificationDocument) {
      toast({
        title: "Missing document",
        description: "Please upload a verification document (bank statement)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (verificationDocument.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Verification document must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmittingBankDetails(true);
      const formData = new FormData();
      formData.append("accountName", accountName);
      formData.append("accountNumber", accountNumber);
      formData.append("bankName", bankName);
      formData.append("bankCode", bankCode);
      formData.append("verificationDocument", verificationDocument);

      const token = localStorage.getItem("token");
      const response = await fetch("/api/users/bank-details", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to submit bank details");
      }

      await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });

      toast({
        title: "Bank details submitted successfully and awaiting admin approval",
      });

      // Reset form
      setVerificationDocument(null);
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit bank details",
        variant: "destructive",
      });
    } finally {
      setSubmittingBankDetails(false);
    }
  };

  const getKYCStatusBadge = () => {
    if (!user) return null;

    const statusConfig: Record<string, { variant: any; icon: any; text: string }> = {
      pending: { variant: "secondary", icon: Clock, text: "Not Started" },
      submitted: { variant: "outline", icon: Clock, text: "Under Review" },
      approved: { variant: "default", icon: CheckCircle, text: "Approved" },
      rejected: { variant: "destructive", icon: XCircle, text: "Rejected" },
    };

    const config = statusConfig[user.kycStatus] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-2">
        <Icon className="w-4 h-4" />
        {config.text}
      </Badge>
    );
  };

  const getBankDetailsStatusBadge = () => {
    if (!user) return null;

    const statusConfig: Record<string, { variant: any; icon: any; text: string }> = {
      not_submitted: { variant: "secondary", icon: Clock, text: "Not Submitted" },
      pending: { variant: "outline", icon: Clock, text: "Under Review" },
      approved: { variant: "default", icon: CheckCircle, text: "Approved" },
      rejected: { variant: "destructive", icon: XCircle, text: "Rejected" },
    };

    const config = statusConfig[user.bankDetailsStatus] || statusConfig.not_submitted;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-2" data-testid="badge-bank-status">
        <Icon className="w-4 h-4" />
        {config.text}
      </Badge>
    );
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (!accountNumber || accountNumber.length < 4) return accountNumber;
    return `******${accountNumber.slice(-4)}`;
  };

  if (!user) return null;

  const dashboardPath = user.role === "primer" ? "/primer-dashboard" : "/regenerator-dashboard";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-8">
          <Link
            href={dashboardPath}
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            data-testid="link-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl">
          <div className="p-6 border-b border-white/10">
            <h1 className="text-2xl font-bold text-white mb-2">Verification Center</h1>
            <p className="text-slate-400">
              Complete your identity and bank account verification
            </p>
          </div>
          <div className="p-6">
            <Tabs defaultValue="identity" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="identity" data-testid="tab-identity">
                  Identity Verification
                </TabsTrigger>
                <TabsTrigger value="bank" data-testid="tab-bank-details">
                  Bank Account
                </TabsTrigger>
              </TabsList>

              <TabsContent value="identity" className="space-y-6 mt-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-lg font-semibold text-white">KYC Documents</h3>
                    <p className="text-sm text-slate-400">
                      Upload your identification documents to start investing
                    </p>
                  </div>
                  {getKYCStatusBadge()}
                </div>

                {user.kycStatus === "approved" ? (
                  <div className="text-center py-8 bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl">
                    <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">KYC Approved</h3>
                    <p className="text-slate-400">
                      Your identity has been verified. You can now invest in projects.
                    </p>
                  </div>
                ) : user.kycStatus === "submitted" ? (
                  <div className="text-center py-8 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl">
                    <Clock className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Under Review</h3>
                    <p className="text-slate-400">
                      Your documents are being reviewed. This usually takes 1-2 business days.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="idCard" className="text-white">ID Card / Passport</Label>
                        <Input
                          id="idCard"
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setIdCard(e.target.files?.[0] || null)}
                          required
                          data-testid="input-idCard"
                        />
                        <p className="text-sm text-slate-400">
                          Upload a clear photo of your government-issued ID or passport
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="selfie" className="text-white">Selfie with ID</Label>
                        <Input
                          id="selfie"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setSelfie(e.target.files?.[0] || null)}
                          required
                          data-testid="input-selfie"
                        />
                        <p className="text-sm text-slate-400">
                          Take a selfie holding your ID card next to your face
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="addressProof" className="text-white">Proof of Address</Label>
                        <Input
                          id="addressProof"
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setAddressProof(e.target.files?.[0] || null)}
                          required
                          data-testid="input-addressProof"
                        />
                        <p className="text-sm text-slate-400">
                          Utility bill, bank statement, or rental agreement (within last 3 months)
                        </p>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={uploading}
                      data-testid="button-submit"
                    >
                      {uploading ? (
                        "Uploading..."
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Submit KYC Documents
                        </>
                      )}
                    </Button>
                  </form>
                )}

                {user.kycStatus === "rejected" && (
                  <div className="bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-red-400 mb-2">KYC Rejected</h3>
                    <p className="text-slate-400">
                      Your KYC documents were not approved. Please ensure your documents are clear,
                      valid, and match the information in your profile. You can resubmit your documents above.
                    </p>
                  </div>
                )}

                {/* Submitted Documents Section */}
                {user.kycDocuments && (user.kycDocuments.idCard || user.kycDocuments.selfie || user.kycDocuments.addressProof) && (
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-semibold text-white">Submitted Documents</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {user.kycDocuments.idCard && (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <p className="text-sm text-slate-400 mb-2">ID Card / Passport</p>
                          <a
                            href={user.kycDocuments.idCard}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                            data-testid="link-view-idcard"
                          >
                            <Eye className="w-4 h-4" />
                            View Document
                          </a>
                        </div>
                      )}
                      {user.kycDocuments.selfie && (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <p className="text-sm text-slate-400 mb-2">Selfie with ID</p>
                          <a
                            href={user.kycDocuments.selfie}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                            data-testid="link-view-selfie"
                          >
                            <Eye className="w-4 h-4" />
                            View Document
                          </a>
                        </div>
                      )}
                      {user.kycDocuments.addressProof && (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <p className="text-sm text-slate-400 mb-2">Proof of Address</p>
                          <a
                            href={user.kycDocuments.addressProof}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                            data-testid="link-view-addressproof"
                          >
                            <Eye className="w-4 h-4" />
                            View Document
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="bank" className="space-y-6 mt-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Bank Account Verification</h3>
                    <p className="text-sm text-slate-400">
                      Add your bank details for withdrawals
                    </p>
                  </div>
                  {getBankDetailsStatusBadge()}
                </div>

                {user.kycStatus !== "approved" && (
                  <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-yellow-200">
                        Complete and get your KYC approved before submitting bank details
                      </p>
                    </div>
                  </div>
                )}

                {user.bankDetails && user.bankDetailsStatus !== "not_submitted" ? (
                  <div className="space-y-4">
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Current Bank Details</h3>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm text-slate-400">Account Name</Label>
                          <p className="font-medium text-white" data-testid="text-existing-accountName">
                            {user.bankDetails.accountName}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-slate-400">Bank Name</Label>
                          <p className="font-medium text-white" data-testid="text-existing-bankName">
                            {user.bankDetails.bankName}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-slate-400">Account Number</Label>
                          <p className="font-mono font-medium text-white" data-testid="text-existing-accountNumber">
                            {maskAccountNumber(user.bankDetails.accountNumberEncrypted || "")}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-slate-400">Status</Label>
                          <div className="mt-1">{getBankDetailsStatusBadge()}</div>
                        </div>
                      </div>
                    </div>

                    {user.bankDetailsStatus === "pending" && (
                      <div className="text-center py-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl">
                        <Clock className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                        <p className="text-sm text-slate-400">
                          Your bank details are under review by our team
                        </p>
                      </div>
                    )}

                    {user.bankDetailsStatus === "approved" && (
                      <div className="text-center py-6 bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl">
                        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                        <p className="text-sm text-slate-400">
                          Your bank details have been verified and approved
                        </p>
                      </div>
                    )}

                    {user.bankDetailsStatus === "rejected" && (
                      <div className="bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20 rounded-xl p-4">
                        <h3 className="text-lg font-semibold text-red-400 mb-2">Bank Details Rejected</h3>
                        <p className="text-slate-400">
                          Your bank details were not approved. Please submit again with correct information.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleBankDetailsSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="accountName" className="text-white">Account Name</Label>
                        <Input
                          id="accountName"
                          type="text"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          required
                          data-testid="input-accountName"
                        />
                        <p className="text-sm text-slate-400">
                          Full name as shown on your bank account
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accountNumber" className="text-white">Account Number</Label>
                        <Input
                          id="accountNumber"
                          type="text"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                          placeholder="10-digit NUBAN"
                          maxLength={10}
                          required
                          data-testid="input-accountNumber"
                        />
                        <p className="text-sm text-slate-400">
                          10-digit Nigerian bank account number (NUBAN)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bankName" className="text-white">Bank Name</Label>
                        <Select
                          value={bankName}
                          onValueChange={(value) => {
                            setBankName(value);
                            const bank = NIGERIAN_BANKS.find(b => b.name === value);
                            if (bank) {
                              setBankCode(bank.code);
                            }
                          }}
                          required
                        >
                          <SelectTrigger data-testid="select-bankName">
                            <SelectValue placeholder="Select your bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {NIGERIAN_BANKS.map((bank) => (
                              <SelectItem key={bank.code} value={bank.name}>
                                {bank.name} ({bank.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bankCode" className="text-white">Bank Code</Label>
                        <Input
                          id="bankCode"
                          type="text"
                          value={bankCode}
                          readOnly
                          required
                          data-testid="input-bankCode"
                          className="bg-white/5"
                        />
                        <p className="text-sm text-slate-400">
                          Automatically filled when you select a bank
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="verificationDoc" className="text-white">Verification Document</Label>
                        <Input
                          id="verificationDoc"
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setVerificationDocument(e.target.files?.[0] || null)}
                          required
                          data-testid="input-verificationDoc"
                        />
                        <p className="text-sm text-slate-400">
                          Upload a recent bank statement (max 5MB, image or PDF)
                        </p>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={submittingBankDetails || user.kycStatus !== "approved"}
                      data-testid="button-submit-bank"
                    >
                      {submittingBankDetails ? (
                        "Submitting..."
                      ) : (
                        <>
                          <Building2 className="w-4 h-4 mr-2" />
                          Submit Bank Details
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
