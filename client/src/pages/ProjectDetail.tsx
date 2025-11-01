import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TrendingUp, MapPin, Calendar, Package, ArrowLeft, FileDown, Upload, CheckCircle, ExternalLink } from "lucide-react";
import { Link } from "wouter";

interface Project {
  id: string;
  name: string;
  description: string;
  location: string;
  targetAmount: string;
  raisedAmount: string;
  tokenSymbol: string;
  tokensIssued: string;
  tokensSold: string;
  pricePerToken: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  images: string[] | null;
  documents: string[] | null;
  stellarIssuerPublicKey: string | null;
  stellarDistributionPublicKey: string | null;
  stellarAssetCode: string | null;
  stellarIssuerTx: string | null;
  stellarDistributionTx: string | null;
  stellarTrustlineTx: string | null;
  stellarMintTx: string | null;
  onChainSynced: boolean;
}

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const [, setLocation] = useLocation();
  const { toast} = useToast();
  const [user, setUser] = useState<any>(null);
  const [investDialogOpen, setInvestDialogOpen] = useState(false);
  const [tokenAmount, setTokenAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      setLocation("/login");
      return;
    }

    setUser(JSON.parse(userData));
  }, [setLocation]);

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/projects", params?.id],
    enabled: !!params?.id,
  });

  const investMutation = useMutation({
    mutationFn: async (data: { tokenAmount: string; currency: string }) => {
      const res = await apiRequest("POST", `/api/projects/${params?.id}/invest`, {
        tokenAmount: data.tokenAmount,
        currency: data.currency,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Investment successful!",
        description: "Your investment has been processed. View your portfolio to see your tokens.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", params?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      setInvestDialogOpen(false);
      setTokenAmount("");
    },
    onError: (error: any) => {
      toast({
        title: "Investment failed",
        description: error.message || "Failed to process investment",
        variant: "destructive",
      });
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("document", file);
      
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/projects/${params?.id}/documents`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Document uploaded!",
        description: "Teaser document has been uploaded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", params?.id] });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: string) => {
    return `₦${parseFloat(amount).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculateProgress = (raised: string, target: string) => {
    const percentage = (parseFloat(raised) / parseFloat(target)) * 100;
    return Math.min(percentage, 100).toFixed(1);
  };

  const calculateTotalCost = () => {
    if (!tokenAmount || !project) return 0;
    return parseFloat(tokenAmount) * parseFloat(project.pricePerToken);
  };

  const handleInvest = () => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You must be logged in to invest",
        variant: "destructive",
      });
      return;
    }

    if (user.kycStatus !== "approved") {
      toast({
        title: "KYC required",
        description: "Please complete your KYC verification to start investing",
        variant: "destructive",
      });
      setLocation("/kyc");
      return;
    }

    setInvestDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file",
        variant: "destructive",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadDocument = () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file to upload",
        variant: "destructive",
      });
      return;
    }

    uploadDocumentMutation.mutate(selectedFile);
  };

  const handleDownloadDocument = (documentUrl: string) => {
    window.open(documentUrl, "_blank");
  };

  if (isLoading || !project) {
    return (
      <div className="min-h-screen bg-muted/30 p-4">
        <div className="max-w-5xl mx-auto py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-64 w-full mb-6" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  const tokensAvailable = parseFloat(project.tokensIssued) - parseFloat(project.tokensSold);
  const isFullyFunded = tokensAvailable <= 0 || project.status === "funded";

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-5xl mx-auto p-4 py-8">
        <div className="mb-8">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="link-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to projects
          </Link>
        </div>

        {/* Hero Image */}
        {project.images && project.images.length > 0 ? (
          <div className="h-64 md:h-96 rounded-lg overflow-hidden mb-6">
            <img
              src={project.images[0]}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-64 md:h-96 bg-muted rounded-lg flex items-center justify-center mb-6">
            <TrendingUp className="w-24 h-24 text-muted-foreground" />
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-3xl mb-2">{project.name}</CardTitle>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {project.location}
                      </div>
                      {project.startDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(project.startDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{project.description}</p>
              </CardContent>
            </Card>

            {/* Funding Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Funding Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {calculateProgress(project.raisedAmount, project.targetAmount)}%
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${calculateProgress(project.raisedAmount, project.targetAmount)}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Raised</p>
                    <p className="text-2xl font-bold">{formatCurrency(project.raisedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Goal</p>
                    <p className="text-2xl font-bold">{formatCurrency(project.targetAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documents Section */}
            <Card>
              <CardHeader>
                <CardTitle>Project Documents</CardTitle>
                <CardDescription>Download investment teasers and project documentation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.documents && project.documents.length > 0 ? (
                  <div className="space-y-2">
                    {project.documents.map((doc, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={() => handleDownloadDocument(doc)}
                        data-testid={`button-download-document-${index}`}
                      >
                        <FileDown className="w-4 h-4" />
                        Download Document {index + 1}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No documents available yet</p>
                )}

                {user?.role === "admin" && (
                  <Button
                    variant="secondary"
                    className="w-full gap-2"
                    onClick={() => setUploadDialogOpen(true)}
                    data-testid="button-upload-document"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Teaser Document
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Investment Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Investment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Token Symbol</p>
                  <p className="text-lg font-semibold">{project.tokenSymbol}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price per Token</p>
                  <p className="text-lg font-semibold">{formatCurrency(project.pricePerToken)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tokens Available</p>
                  <p className="text-lg font-semibold">{tokensAvailable.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tokens</p>
                  <p className="text-lg font-semibold">{parseFloat(project.tokensIssued).toLocaleString()}</p>
                </div>

                <Button
                  className="w-full"
                  onClick={handleInvest}
                  disabled={isFullyFunded}
                  data-testid="button-invest"
                >
                  {isFullyFunded ? "Fully Funded" : "Invest Now"}
                </Button>

                {isFullyFunded && (
                  <p className="text-xs text-muted-foreground text-center">
                    This project has reached its funding goal
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Blockchain Information Card */}
            {(project.stellarIssuerPublicKey || project.stellarMintTx) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Blockchain Info
                  </CardTitle>
                  <CardDescription>Stellar network details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.onChainSynced && (
                    <Badge variant="default" className="w-full justify-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      On-Chain Synced
                    </Badge>
                  )}
                  
                  {project.stellarAssetCode && (
                    <div>
                      <p className="text-xs text-muted-foreground">Asset Code</p>
                      <p className="text-sm font-mono">{project.stellarAssetCode}</p>
                    </div>
                  )}
                  
                  {project.stellarIssuerPublicKey && (
                    <div>
                      <p className="text-xs text-muted-foreground">Issuer Account</p>
                      <a 
                        href={`https://stellar.expert/explorer/testnet/account/${project.stellarIssuerPublicKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono break-all hover:underline text-primary"
                      >
                        {project.stellarIssuerPublicKey.substring(0, 12)}...{project.stellarIssuerPublicKey.substring(project.stellarIssuerPublicKey.length - 8)}
                      </a>
                    </div>
                  )}
                  
                  {project.stellarDistributionPublicKey && (
                    <div>
                      <p className="text-xs text-muted-foreground">Distribution Account</p>
                      <a 
                        href={`https://stellar.expert/explorer/testnet/account/${project.stellarDistributionPublicKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono break-all hover:underline text-primary"
                      >
                        {project.stellarDistributionPublicKey.substring(0, 12)}...{project.stellarDistributionPublicKey.substring(project.stellarDistributionPublicKey.length - 8)}
                      </a>
                    </div>
                  )}

                  {(project.stellarIssuerTx || project.stellarMintTx) && (
                    <div className="pt-4 border-t space-y-2">
                      <p className="text-xs font-medium">Transaction Hashes</p>
                      {project.stellarIssuerTx && (
                        <div>
                          <p className="text-xs text-muted-foreground">Issuer Creation</p>
                          <a 
                            href={`https://stellar.expert/explorer/testnet/tx/${project.stellarIssuerTx}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono break-all hover:underline text-primary flex items-center gap-1"
                          >
                            {project.stellarIssuerTx.substring(0, 16)}...
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>
                      )}
                      {project.stellarDistributionTx && (
                        <div>
                          <p className="text-xs text-muted-foreground">Distribution Creation</p>
                          <a 
                            href={`https://stellar.expert/explorer/testnet/tx/${project.stellarDistributionTx}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono break-all hover:underline text-primary flex items-center gap-1"
                          >
                            {project.stellarDistributionTx.substring(0, 16)}...
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>
                      )}
                      {project.stellarTrustlineTx && (
                        <div>
                          <p className="text-xs text-muted-foreground">Trustline</p>
                          <a 
                            href={`https://stellar.expert/explorer/testnet/tx/${project.stellarTrustlineTx}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono break-all hover:underline text-primary flex items-center gap-1"
                          >
                            {project.stellarTrustlineTx.substring(0, 16)}...
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>
                      )}
                      {project.stellarMintTx && (
                        <div>
                          <p className="text-xs text-muted-foreground">Token Minting</p>
                          <a 
                            href={`https://stellar.expert/explorer/testnet/tx/${project.stellarMintTx}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono break-all hover:underline text-primary flex items-center gap-1"
                          >
                            {project.stellarMintTx.substring(0, 16)}...
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Upload Document Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Teaser Document</DialogTitle>
              <DialogDescription>
                Upload a PDF document for investors to download
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="document-upload">Select PDF Document</Label>
                <input
                  ref={fileInputRef}
                  id="document-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-select-file"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {selectedFile ? "Change File" : "Select File"}
                </Button>
                {selectedFile && (
                  <p className="text-sm text-muted-foreground" data-testid="text-selected-filename">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={handleUploadDocument}
                disabled={!selectedFile || uploadDocumentMutation.isPending}
                data-testid="button-upload"
              >
                {uploadDocumentMutation.isPending ? "Uploading..." : "Upload Document"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Investment Dialog */}
        <Dialog open={investDialogOpen} onOpenChange={setInvestDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invest in {project.name}</DialogTitle>
              <DialogDescription>
                Enter the number of tokens you want to purchase
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tokenAmount">Number of Tokens</Label>
                <Input
                  id="tokenAmount"
                  type="number"
                  placeholder="100"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  min="1"
                  max={tokensAvailable}
                  data-testid="input-tokenAmount"
                />
                <p className="text-sm text-muted-foreground">
                  Maximum: {tokensAvailable.toLocaleString()} tokens
                </p>
              </div>

              {tokenAmount && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Tokens</span>
                    <span className="font-medium">{parseFloat(tokenAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Price per token</span>
                    <span className="font-medium">{formatCurrency(project.pricePerToken)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Total Cost</span>
                    <span className="text-lg font-bold">{formatCurrency(calculateTotalCost().toFixed(2))}</span>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => investMutation.mutate({ tokenAmount, currency })}
                disabled={!tokenAmount || investMutation.isPending || parseFloat(tokenAmount) > tokensAvailable}
                data-testid="button-confirm-invest"
              >
                {investMutation.isPending ? "Processing..." : "Confirm Investment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
