import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TrendingUp, MapPin, Calendar, Package, ArrowLeft, FileDown, Upload, CheckCircle, ExternalLink, History, Leaf, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import type { NavEntry } from "@/types/phase4";
import UnifiedHeader from "@/components/UnifiedHeader";
import { motion } from "framer-motion";
import InvestmentAnalytics from "@/components/project/InvestmentAnalytics";

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
  const [investDialogOpen, setInvestDialogOpen] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [navAmount, setNavAmount] = useState("");
  const [navNotes, setNavNotes] = useState("");

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

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/projects", params?.id],
    enabled: !!params?.id,
  });

  const investMutation = useMutation({
    mutationFn: async (data: { amount: string; projectId: string }) => {
      const res = await apiRequest("POST", "/api/investments/create", {
        amount: data.amount,
        projectId: data.projectId,
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Investment successful!",
        description: data.message || "Your investment has been processed. View your portfolio to see your tokens.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", params?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments/portfolio"] });
      setInvestDialogOpen(false);
      setInvestmentAmount("");
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

  const { data: navHistory } = useQuery<{ history: NavEntry[] }>({
    queryKey: ["/api/admin/projects", params?.id, "nav"],
    enabled: !!params?.id && user?.role === "admin",
  });

  const createNavMutation = useMutation({
    mutationFn: async (data: { navPerToken: string; notes?: string }) => {
      const res = await apiRequest("POST", `/api/admin/projects/${params?.id}/nav`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "NAV updated successfully",
        description: "New NAV entry has been created and superseded previous entry",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects", params?.id, "nav"] });
      setNavAmount("");
      setNavNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "NAV update failed",
        description: error.message || "Failed to create NAV entry",
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

  const calculateTokensToReceive = () => {
    if (!investmentAmount || !project) return 0;
    return parseFloat(investmentAmount) / parseFloat(project.pricePerToken);
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

  const getStatusStyle = (status: string) => {
    const styles: Record<string, { bg: string, text: string, border: string }> = {
      active: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
      funded: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
      completed: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
      draft: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" },
    };
    return styles[status] || styles.draft;
  };

  if (isLoading || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <UnifiedHeader />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-8 bg-white/10" />
          <Skeleton className="h-64 md:h-96 w-full mb-6 bg-white/10 rounded-2xl" />
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Skeleton className="h-48 w-full bg-white/10 rounded-2xl" />
            </div>
            <Skeleton className="h-96 w-full bg-white/10 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const tokensAvailable = parseFloat(project.tokensIssued) - parseFloat(project.tokensSold);
  const isFullyFunded = tokensAvailable <= 0 || project.status === "funded";
  const statusStyle = getStatusStyle(project.status);
  const progress = parseFloat(calculateProgress(project.raisedAmount, project.targetAmount));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <UnifiedHeader />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            data-testid="link-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to projects
          </Link>
        </motion.div>

        {/* Hero Image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {project.images && project.images.length > 0 ? (
            <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden mb-8 group">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent z-10" />
              <img
                src={project.images[0]}
                alt={project.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          ) : (
            <div className="h-64 md:h-96 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center mb-8">
              <Leaf className="w-24 h-24 text-emerald-500/30" />
            </div>
          )}
        </motion.div>

        <Tabs defaultValue="overview" className="space-y-6">
          {user?.role === "admin" && (
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="overview" data-testid="tab-overview" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">Overview</TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">Investment Analytics</TabsTrigger>
              <TabsTrigger value="nav" data-testid="tab-nav" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">NAV Management</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="overview">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="md:col-span-2 space-y-6">
                {/* Project Overview Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                      <div className="flex-1">
                        <h1 className="text-3xl font-bold text-white mb-3">{project.name}</h1>
                        <div className="flex items-center gap-4 text-slate-400 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm">{project.location}</span>
                          </div>
                          {project.startDate && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-emerald-400" />
                              <span className="text-sm">{new Date(project.startDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border capitalize`}>
                        {project.status}
                      </Badge>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{project.description}</p>
                  </div>
                </motion.div>

                {/* Funding Progress Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden"
                >
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-white mb-6">Funding Progress</h2>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Progress</span>
                          <span className="font-medium text-white">{progress}%</span>
                        </div>
                        <div className="relative h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                          <p className="text-sm text-slate-400 mb-1">Raised</p>
                          <p className="text-2xl font-bold text-white">{formatCurrency(project.raisedAmount)}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                          <p className="text-sm text-slate-400 mb-1">Goal</p>
                          <p className="text-2xl font-bold text-white">{formatCurrency(project.targetAmount)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Documents Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden"
                >
                  <div className="p-6">
                    <div className="mb-4">
                      <h2 className="text-xl font-bold text-white mb-1">Project Documents</h2>
                      <p className="text-sm text-slate-400">Download investment teasers and project documentation</p>
                    </div>
                    
                    <div className="space-y-3">
                      {project.documents && project.documents.length > 0 ? (
                        <div className="space-y-2">
                          {project.documents.map((doc: string, index: number) => (
                            <Button
                              key={index}
                              variant="outline"
                              className="w-full justify-start gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10"
                              onClick={() => handleDownloadDocument(doc)}
                              data-testid={`button-download-document-${index}`}
                            >
                              <FileDown className="w-4 h-4 text-emerald-400" />
                              Download Document {index + 1}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
                          <FileDown className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                          <p className="text-sm text-slate-400">No documents available yet</p>
                        </div>
                      )}

                      {user?.role === "admin" && (
                        <Button
                          variant="outline"
                          className="w-full gap-2 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                          onClick={() => setUploadDialogOpen(true)}
                          data-testid="button-upload-document"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Teaser Document
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Sidebar - Investment Info */}
              <div className="space-y-6">
                {/* Investment Details Card */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden sticky top-24"
                >
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
                  
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-white mb-6">Investment Details</h2>
                    
                    <div className="space-y-4">
                      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Token Symbol</p>
                        <p className="text-lg font-bold text-white">{project.tokenSymbol}</p>
                      </div>
                      
                      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Price per Token</p>
                        <p className="text-lg font-bold text-white">{formatCurrency(project.pricePerToken)}</p>
                      </div>
                      
                      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Tokens Available</p>
                        <p className="text-lg font-bold text-white">{tokensAvailable.toLocaleString()}</p>
                      </div>
                      
                      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Total Tokens</p>
                        <p className="text-lg font-bold text-white">{parseFloat(project.tokensIssued).toLocaleString()}</p>
                      </div>

                      <Button
                        className={`w-full mt-2 ${isFullyFunded ? 'bg-slate-600' : 'bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400'}`}
                        onClick={handleInvest}
                        disabled={isFullyFunded}
                        data-testid="button-invest"
                      >
                        {isFullyFunded ? "Fully Funded" : "Invest Now"}
                      </Button>

                      {isFullyFunded && (
                        <p className="text-xs text-slate-400 text-center">
                          This project has reached its funding goal
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Blockchain Information Card */}
                {(project.stellarIssuerPublicKey || project.stellarMintTx) && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-6">
                        <Package className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-xl font-bold text-white">Blockchain Info</h2>
                      </div>
                      
                      <div className="space-y-4">
                        {project.onChainSynced && (
                          <Badge className="w-full justify-center bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            On-Chain Synced
                          </Badge>
                        )}
                        
                        {project.stellarAssetCode && (
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Asset Code</p>
                            <p className="text-sm font-mono text-white bg-white/5 rounded px-2 py-1">{project.stellarAssetCode}</p>
                          </div>
                        )}
                        
                        {project.stellarIssuerPublicKey && (
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Issuer Account</p>
                            <a 
                              href={`https://stellar.expert/explorer/testnet/account/${project.stellarIssuerPublicKey}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono break-all text-emerald-400 hover:text-emerald-300 transition-colors bg-white/5 rounded px-2 py-1 block"
                            >
                              {project.stellarIssuerPublicKey.substring(0, 12)}...{project.stellarIssuerPublicKey.substring(project.stellarIssuerPublicKey.length - 8)}
                            </a>
                          </div>
                        )}
                        
                        {project.stellarDistributionPublicKey && (
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Distribution Account</p>
                            <a 
                              href={`https://stellar.expert/explorer/testnet/account/${project.stellarDistributionPublicKey}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono break-all text-emerald-400 hover:text-emerald-300 transition-colors bg-white/5 rounded px-2 py-1 block"
                            >
                              {project.stellarDistributionPublicKey.substring(0, 12)}...{project.stellarDistributionPublicKey.substring(project.stellarDistributionPublicKey.length - 8)}
                            </a>
                          </div>
                        )}

                        {(project.stellarIssuerTx || project.stellarMintTx) && (
                          <div className="pt-4 border-t border-white/10 space-y-3">
                            <p className="text-xs font-medium text-white">Transaction Hashes</p>
                            {project.stellarIssuerTx && (
                              <div>
                                <p className="text-xs text-slate-400 mb-1">Issuer Creation</p>
                                <a 
                                  href={`https://stellar.expert/explorer/testnet/tx/${project.stellarIssuerTx}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-mono break-all text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 bg-white/5 rounded px-2 py-1"
                                >
                                  <span className="truncate">{project.stellarIssuerTx.substring(0, 16)}...</span>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              </div>
                            )}
                            {project.stellarDistributionTx && (
                              <div>
                                <p className="text-xs text-slate-400 mb-1">Distribution Creation</p>
                                <a 
                                  href={`https://stellar.expert/explorer/testnet/tx/${project.stellarDistributionTx}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-mono break-all text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 bg-white/5 rounded px-2 py-1"
                                >
                                  <span className="truncate">{project.stellarDistributionTx.substring(0, 16)}...</span>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              </div>
                            )}
                            {project.stellarTrustlineTx && (
                              <div>
                                <p className="text-xs text-slate-400 mb-1">Trustline</p>
                                <a 
                                  href={`https://stellar.expert/explorer/testnet/tx/${project.stellarTrustlineTx}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-mono break-all text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 bg-white/5 rounded px-2 py-1"
                                >
                                  <span className="truncate">{project.stellarTrustlineTx.substring(0, 16)}...</span>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              </div>
                            )}
                            {project.stellarMintTx && (
                              <div>
                                <p className="text-xs text-slate-400 mb-1">Token Minting</p>
                                <a 
                                  href={`https://stellar.expert/explorer/testnet/tx/${project.stellarMintTx}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-mono break-all text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 bg-white/5 rounded px-2 py-1"
                                >
                                  <span className="truncate">{project.stellarMintTx.substring(0, 16)}...</span>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Investment Analytics Tab (Admin Only) */}
          {user?.role === "admin" && params?.id && (
            <TabsContent value="analytics">
              <InvestmentAnalytics projectId={params.id} />
            </TabsContent>
          )}

          {/* NAV Management Tab (Admin Only) */}
          {user?.role === "admin" && (
            <TabsContent value="nav">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Update NAV Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden"
                >
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-white mb-2">Update NAV (Net Asset Value)</h2>
                    <p className="text-sm text-slate-400 mb-6">
                      Create a new NAV entry. This will supersede the previous entry.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="navAmount" className="text-white">NAV per Token (₦)</Label>
                        <Input
                          id="navAmount"
                          type="number"
                          step="0.01"
                          placeholder="1.50"
                          value={navAmount}
                          onChange={(e) => setNavAmount(e.target.value)}
                          className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
                          data-testid="input-nav-amount"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          Current market value of one project token in Naira
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="navNotes" className="text-white">Notes (Optional)</Label>
                        <Textarea
                          id="navNotes"
                          placeholder="Notes about this NAV update..."
                          value={navNotes}
                          onChange={(e) => setNavNotes(e.target.value)}
                          className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
                          data-testid="input-nav-notes"
                        />
                      </div>
                      <Button
                        onClick={() => createNavMutation.mutate({ navPerToken: navAmount, notes: navNotes || undefined })}
                        disabled={!navAmount || createNavMutation.isPending}
                        className="w-full bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400"
                        data-testid="button-update-nav"
                      >
                        {createNavMutation.isPending ? "Updating NAV..." : "Update NAV"}
                      </Button>
                    </div>
                  </div>
                </motion.div>

                {/* NAV History Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <History className="w-5 h-5 text-emerald-400" />
                      <h2 className="text-xl font-bold text-white">NAV History</h2>
                    </div>
                    
                    {navHistory && navHistory.history.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {navHistory.history.map((entry: NavEntry) => (
                          <div
                            key={entry.id}
                            className={`p-4 bg-white/5 border border-white/10 rounded-xl ${entry.isSuperseded ? 'opacity-50' : ''}`}
                            data-testid={`nav-entry-${entry.id}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xl font-bold text-white">
                                    ₦{parseFloat(entry.navPerToken).toFixed(2)}
                                  </span>
                                  {!entry.isSuperseded && (
                                    <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400">Current</Badge>
                                  )}
                                  {entry.isSuperseded && (
                                    <Badge variant="outline" className="border-white/20 text-slate-400">Superseded</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400">
                                  Updated {new Date(entry.effectiveAt).toLocaleString()}
                                </p>
                                {entry.notes && (
                                  <p className="text-sm mt-2 text-slate-300">{entry.notes}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <History className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">No NAV history</h3>
                        <p className="text-slate-400">
                          Create the first NAV entry for this project
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Upload Document Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="bg-slate-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Upload Teaser Document</DialogTitle>
              <DialogDescription className="text-slate-400">
                Upload a PDF document for investors to download
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="document-upload" className="text-white">Select PDF Document</Label>
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
                  className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-select-file"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {selectedFile ? "Change File" : "Select File"}
                </Button>
                {selectedFile && (
                  <p className="text-sm text-slate-400" data-testid="text-selected-filename">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>

              <Button
                className="w-full bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400"
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
          <DialogContent className="bg-slate-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Invest in {project.name}</DialogTitle>
              <DialogDescription className="text-slate-400">
                Enter the amount you want to invest (minimum ₦100)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="investmentAmount" className="text-white">Investment Amount (NGN)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    ₦
                  </span>
                  <Input
                    id="investmentAmount"
                    type="number"
                    placeholder="1000"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                    min="100"
                    className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
                    data-testid="input-investmentAmount"
                  />
                </div>
                <p className="text-sm text-slate-400">
                  Minimum investment: ₦100
                </p>
              </div>

              {!project.stellarMintTx && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400 font-medium text-center">
                    ⚠️ Tokens not available yet - This project's tokens haven't been minted on blockchain. Investments will be enabled once minting is complete.
                  </p>
                </div>
              )}

              {investmentAmount && parseFloat(investmentAmount) >= 100 && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">Investment Amount</span>
                    <span className="font-medium text-white">{formatCurrency(investmentAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">Price per Token</span>
                    <span className="font-medium text-white">{formatCurrency(project.pricePerToken)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between">
                    <span className="font-semibold text-white">Tokens You'll Receive</span>
                    <span className="text-lg font-bold text-emerald-400">{calculateTokensToReceive().toFixed(2)} {project.tokenSymbol}</span>
                  </div>
                  {calculateTokensToReceive() > tokensAvailable && (
                    <p className="text-xs text-red-400">
                      Only {tokensAvailable.toFixed(2)} tokens available
                    </p>
                  )}
                </div>
              )}

              <Button
                className="w-full bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400"
                onClick={() => investMutation.mutate({ amount: investmentAmount, projectId: params!.id })}
                disabled={
                  !investmentAmount || 
                  investMutation.isPending || 
                  parseFloat(investmentAmount) < 100 ||
                  calculateTokensToReceive() > tokensAvailable ||
                  !project.stellarMintTx
                }
                data-testid="button-confirm-invest"
              >
                {investMutation.isPending ? "Processing Investment..." : "Confirm Investment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
