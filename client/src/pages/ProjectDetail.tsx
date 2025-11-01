import { useState, useEffect } from "react";
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
import { TrendingUp, MapPin, Calendar, Package, ArrowLeft } from "lucide-react";
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
}

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [investDialogOpen, setInvestDialogOpen] = useState(false);
  const [tokenAmount, setTokenAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");

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
          </div>
        </div>

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
