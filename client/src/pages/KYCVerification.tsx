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
import { Upload, CheckCircle, XCircle, Clock, ArrowLeft, Building2, AlertCircle } from "lucide-react";
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

      toast({
        title: "KYC documents uploaded!",
        description: "Your documents are being reviewed. You'll be notified once approved.",
      });

      setTimeout(() => setLocation("/dashboard"), 2000);
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

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="link-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Verification Center</CardTitle>
            <CardDescription>
              Complete your identity and bank account verification
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                    <h3 className="text-lg font-semibold">KYC Documents</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload your identification documents to start investing
                    </p>
                  </div>
                  {getKYCStatusBadge()}
                </div>

                {user.kycStatus === "approved" ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">KYC Approved</h3>
                    <p className="text-muted-foreground">
                      Your identity has been verified. You can now invest in projects.
                    </p>
                  </div>
                ) : user.kycStatus === "submitted" ? (
                  <div className="text-center py-8">
                    <Clock className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Under Review</h3>
                    <p className="text-muted-foreground">
                      Your documents are being reviewed. This usually takes 1-2 business days.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="idCard">ID Card / Passport</Label>
                        <Input
                          id="idCard"
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setIdCard(e.target.files?.[0] || null)}
                          required
                          data-testid="input-idCard"
                        />
                        <p className="text-sm text-muted-foreground">
                          Upload a clear photo of your government-issued ID or passport
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="selfie">Selfie with ID</Label>
                        <Input
                          id="selfie"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setSelfie(e.target.files?.[0] || null)}
                          required
                          data-testid="input-selfie"
                        />
                        <p className="text-sm text-muted-foreground">
                          Take a selfie holding your ID card next to your face
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="addressProof">Proof of Address</Label>
                        <Input
                          id="addressProof"
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setAddressProof(e.target.files?.[0] || null)}
                          required
                          data-testid="input-addressProof"
                        />
                        <p className="text-sm text-muted-foreground">
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
                  <Card className="border-destructive">
                    <CardHeader>
                      <CardTitle className="text-destructive">KYC Rejected</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Your KYC documents were not approved. Please ensure your documents are clear,
                        valid, and match the information in your profile. You can resubmit your documents above.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="bank" className="space-y-6 mt-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-lg font-semibold">Bank Account Verification</h3>
                    <p className="text-sm text-muted-foreground">
                      Add your bank details for withdrawals
                    </p>
                  </div>
                  {getBankDetailsStatusBadge()}
                </div>

                {user.kycStatus !== "approved" && (
                  <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                    <CardContent className="flex items-start gap-3 p-4">
                      <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Complete and get your KYC approved before submitting bank details
                      </p>
                    </CardContent>
                  </Card>
                )}

                {user.bankDetails && user.bankDetailsStatus !== "not_submitted" ? (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Current Bank Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Account Name</Label>
                          <p className="font-medium" data-testid="text-existing-accountName">
                            {user.bankDetails.accountName}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Bank Name</Label>
                          <p className="font-medium" data-testid="text-existing-bankName">
                            {user.bankDetails.bankName}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Account Number</Label>
                          <p className="font-mono font-medium" data-testid="text-existing-accountNumber">
                            {maskAccountNumber(user.bankDetails.accountNumberEncrypted || "")}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Status</Label>
                          <div className="mt-1">{getBankDetailsStatusBadge()}</div>
                        </div>
                      </CardContent>
                    </Card>

                    {user.bankDetailsStatus === "pending" && (
                      <div className="text-center py-4">
                        <Clock className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Your bank details are under review by our team
                        </p>
                      </div>
                    )}

                    {user.bankDetailsStatus === "approved" && (
                      <div className="text-center py-4">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Your bank details have been verified and approved
                        </p>
                      </div>
                    )}

                    {user.bankDetailsStatus === "rejected" && (
                      <Card className="border-destructive">
                        <CardHeader>
                          <CardTitle className="text-destructive">Bank Details Rejected</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">
                            Your bank details were not approved. Please submit again with correct information.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleBankDetailsSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="accountName">Account Name</Label>
                        <Input
                          id="accountName"
                          type="text"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          required
                          data-testid="input-accountName"
                        />
                        <p className="text-sm text-muted-foreground">
                          Full name as shown on your bank account
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accountNumber">Account Number</Label>
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
                        <p className="text-sm text-muted-foreground">
                          10-digit Nigerian bank account number (NUBAN)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bankName">Bank Name</Label>
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
                        <Label htmlFor="bankCode">Bank Code</Label>
                        <Input
                          id="bankCode"
                          type="text"
                          value={bankCode}
                          readOnly
                          required
                          data-testid="input-bankCode"
                          className="bg-muted"
                        />
                        <p className="text-sm text-muted-foreground">
                          Automatically filled when you select a bank
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="verificationDoc">Verification Document</Label>
                        <Input
                          id="verificationDoc"
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setVerificationDocument(e.target.files?.[0] || null)}
                          required
                          data-testid="input-verificationDoc"
                        />
                        <p className="text-sm text-muted-foreground">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
