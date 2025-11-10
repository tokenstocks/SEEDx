import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import UnifiedHeader from "@/components/UnifiedHeader";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function WalletFundingRequest() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: walletData, isLoading } = useQuery<{
    activated: boolean;
    activationStatus: string;
    publicKey: string;
    balances: {
      xlm: string;
      usdc: string;
      ngnts: string;
    };
  }>({
    queryKey: ["/api/regenerator/wallet/balances"],
  });

  const requestFundingMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/regenerator/wallet/request-funding");
    },
    onSuccess: () => {
      toast({
        title: "Funding Request Submitted",
        description: "Your wallet activation funding request has been submitted for admin review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/regenerator/wallet/balances"] });
      navigate("/regenerator-profile");
    },
    onError: (error: any) => {
      toast({
        title: "Request Failed",
        description: error.message || "Failed to submit funding request. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Redirect if wallet is already activated or funding is pending
  if (walletData?.activated || walletData?.activationStatus === "pending") {
    navigate("/regenerator-profile");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <UnifiedHeader />

      <div className="container mx-auto p-6 max-w-3xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/regenerator-profile")}
          className="mb-6 text-slate-400 hover:text-white"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile
        </Button>

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-white flex items-center gap-3" data-testid="text-page-title">
            <Wallet className="w-8 h-8 text-yellow-400" />
            Request Wallet Funding
          </h1>
          <p className="text-slate-400 mt-2">
            Activate your Stellar wallet to enable blockchain transactions
          </p>
        </motion.div>

        {/* Main Card */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Wallet Activation</CardTitle>
            <CardDescription className="text-slate-400">
              Your wallet needs funding to be activated on the Stellar network
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info Alert */}
            <Alert className="bg-blue-500/10 border-blue-500/20" data-testid="alert-info">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300 text-sm">
                Stellar requires a minimum balance of 1 XLM to activate an account. This prevents spam and ensures network security. Our admin will fund your wallet with the activation amount.
              </AlertDescription>
            </Alert>

            {/* Wallet Details */}
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-lg border border-white/10" data-testid="card-wallet-details">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Your Wallet Details</h3>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Public Key</p>
                    <p className="text-sm font-mono text-white break-all" data-testid="text-public-key">
                      {walletData?.publicKey || "Loading..."}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-1">Current Status</p>
                    <p className="text-sm text-orange-400 font-medium" data-testid="text-current-status">
                      Not Activated
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-1">Required Activation Amount</p>
                    <p className="text-sm text-white font-medium">
                      1.5 XLM (minimum network requirement + gas reserve)
                    </p>
                  </div>
                </div>
              </div>

              {/* What Happens Next */}
              <div className="p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/20" data-testid="card-next-steps">
                <h3 className="text-sm font-medium text-emerald-400 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  What Happens Next
                </h3>
                <ol className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">1.</span>
                    Your funding request is submitted to the admin team
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">2.</span>
                    Admin reviews and approves your request (typically within 24 hours)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">3.</span>
                    Your wallet is automatically activated on the Stellar network
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">4.</span>
                    You can start trading tokens and receiving cashflow distributions
                  </li>
                </ol>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                onClick={() => requestFundingMutation.mutate()}
                disabled={requestFundingMutation.isPending || isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                data-testid="button-submit-request"
              >
                {requestFundingMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Submit Funding Request
                  </>
                )}
              </Button>
              <p className="text-xs text-slate-500 text-center mt-3">
                You will be notified when your wallet is activated
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
