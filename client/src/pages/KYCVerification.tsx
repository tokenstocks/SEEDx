import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function KYCVerification() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [idCard, setIdCard] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      setLocation("/login");
      return;
    }

    setUser(JSON.parse(userData));
  }, [setLocation]);

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

      const data = await response.json();
      
      // Update user data in localStorage
      const updatedUser = { ...user, kycStatus: "submitted" };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);

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

  const getStatusBadge = () => {
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
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-2xl">KYC Verification</CardTitle>
                <CardDescription>
                  Upload your identification documents to start investing
                </CardDescription>
              </div>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {user.kycStatus === "rejected" && (
          <Card className="mt-4 border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">KYC Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Your KYC documents were not approved. Please ensure your documents are clear,
                valid, and match the information in your profile. You can resubmit your documents above.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
