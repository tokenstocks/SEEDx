import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Building2, Coins, Check, ChevronRight, ArrowDown, Calculator, Fuel, AlertCircle, Loader2, Copy, Upload, FileText, Image as ImageIcon, FileCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { BankDepositFeePreview } from "@shared/schema";

type BankAccountDetails = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  routingCode: string;
};

type PaymentMethod = "bank_transfer" | "usdc" | null;
type WizardStep = 1 | 2 | 3;

interface FundingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FundingWizard({ open, onOpenChange }: FundingWizardProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<WizardStep>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [amount, setAmount] = useState("");
  const [referenceCode, setReferenceCode] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const handleReset = () => {
    setStep(1);
    setPaymentMethod(null);
    setAmount("");
    setReferenceCode("");
    setProofFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Reset wizard state immediately when dialog closes
  useEffect(() => {
    if (!open) {
      handleReset();
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  // Fee preview query - only fetch when amount is valid
  const parsedAmount = parseFloat(amount);
  const isAmountValid = parsedAmount >= 1000 && parsedAmount <= 10000000;
  const shouldFetchFees = isAmountValid && step === 2;
  
  const { data: feePreview, isLoading: feeLoading, error: feeError } = useQuery<BankDepositFeePreview>({
    queryKey: ["/api/regenerator/bank-deposit/fee-preview", { amount }],
    enabled: shouldFetchFees,
    refetchInterval: false,
    staleTime: 30000,
  });

  const canProceedToStep3 = isAmountValid && feePreview && !feeError;

  // Bank account details query - fetch when user reaches Step 3
  const { data: bankAccount, isLoading: bankLoading } = useQuery<BankAccountDetails>({
    queryKey: ["/api/admin/settings/bank-account"],
    enabled: step === 3,
    staleTime: 60000,
  });

  // Generate reference code when moving to Step 3
  useEffect(() => {
    if (step === 3 && !referenceCode) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      setReferenceCode(`NGN-${timestamp}-${random}`);
    }
  }, [step, referenceCode]);

  // File upload handler
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only PNG, JPG, and PDF files are allowed",
        variant: "destructive",
      });
      return;
    }

    setProofFile(file);
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  // Submit deposit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!proofFile || !feePreview) {
        throw new Error("Missing required data");
      }

      const formData = new FormData();
      formData.append("amountNGN", feePreview.amountNGN.toFixed(2));
      formData.append("referenceCode", referenceCode);
      formData.append("proof", proofFile);

      const response = await fetch("/api/regenerator/bank-deposits", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit deposit");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/regenerator/bank-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/regenerator/wallet/balances"] });

      // Show success toast
      toast({
        title: "Deposit submitted!",
        description: "Your deposit is now pending review. You'll be notified once it's approved.",
      });

      // Close modal
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    submitMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <Coins className="w-7 h-7 text-emerald-400" />
            Fund Your Wallet
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <motion.div
                  initial={false}
                  animate={{
                    scale: step >= s ? 1 : 0.9,
                    backgroundColor: step >= s ? "rgb(16, 185, 129)" : "rgb(51, 65, 85)",
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold relative z-10 shadow-lg"
                  data-testid={`funding-step-indicator-${s}`}
                >
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </motion.div>
                {s < 3 && (
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: step > s ? "rgb(16, 185, 129)" : "rgb(51, 65, 85)",
                    }}
                    className="h-1 flex-1 mx-2"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2 px-1">
            <span>Payment Method</span>
            <span>Enter Amount</span>
            <span>Review & Submit</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Payment Method Selection */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                      Step 1 of 3
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Choose Your Payment Method
                  </h3>
                  <p className="text-sm text-slate-400">
                    Select how you'd like to fund your wallet with NGNTS
                  </p>
                </div>

                {/* Payment Method Options */}
                <div className="grid gap-4">
                  {/* Bank Transfer Option */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Card
                      className={cn(
                        "cursor-pointer transition-all duration-200",
                        "bg-white/5 backdrop-blur-md hover-elevate active-elevate-2",
                        paymentMethod === "bank_transfer"
                          ? "border-emerald-500/50 ring-2 ring-emerald-500/20"
                          : "border-white/10"
                      )}
                      onClick={() => setPaymentMethod("bank_transfer")}
                      data-testid="payment-method-bank-transfer"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center",
                            paymentMethod === "bank_transfer"
                              ? "bg-emerald-500/20 border border-emerald-500/30"
                              : "bg-white/5 border border-white/10"
                          )}>
                            <Building2 className={cn(
                              "w-6 h-6",
                              paymentMethod === "bank_transfer"
                                ? "text-emerald-400"
                                : "text-slate-400"
                            )} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-white">Bank Transfer</h4>
                              <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 bg-blue-500/10">
                                NGN
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-400">
                              Transfer Nigerian Naira to our bank account and receive NGNTS tokens
                            </p>
                            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                              <span>• 2% platform fee</span>
                              <span>• Manual verification (1-24 hours)</span>
                            </div>
                          </div>
                          {paymentMethod === "bank_transfer" && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"
                            >
                              <Check className="w-4 h-4 text-white" />
                            </motion.div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* USDC Option (Disabled) */}
                  <Card
                    className="bg-white/5 backdrop-blur-md border-white/10 opacity-50 cursor-not-allowed"
                    data-testid="payment-method-usdc"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                          <Coins className="w-6 h-6 text-slate-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-white">USDC Transfer</h4>
                            <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400 bg-purple-500/10">
                              Coming Soon
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-400">
                            Send USDC directly to your wallet for instant conversion to NGNTS
                          </p>
                          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                            <span>• Instant settlement</span>
                            <span>• Lower fees</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                    data-testid="button-cancel-funding"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!paymentMethod}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    data-testid="button-next-step"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Amount Entry */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                      Step 2 of 3
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Enter Amount
                  </h3>
                  <p className="text-sm text-slate-400">
                    How much would you like to add to your wallet?
                  </p>
                </div>

                {/* You Send Card */}
                <Card className="bg-white/5 backdrop-blur-md border-white/10">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">You Send</span>
                        <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 bg-blue-500/10">
                          NGN
                        </Badge>
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="text-4xl font-bold h-auto py-4 px-0 border-0 bg-transparent text-white focus-visible:ring-0 focus-visible:ring-offset-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          data-testid="input-deposit-amount"
                        />
                      </div>
                      {!isAmountValid && amount && (
                        <p className="text-xs text-orange-400">
                          {parsedAmount < 1000 ? "Minimum: ₦1,000" : "Maximum: ₦10,000,000"}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Arrow Separator */}
                <div className="flex justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <ArrowDown className="w-5 h-5 text-slate-400" />
                  </div>
                </div>

                {/* You Receive Card */}
                <Card className="bg-white/5 backdrop-blur-md border-white/10">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">You Receive</span>
                        <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                          NGNTS
                        </Badge>
                      </div>
                      <div className="text-4xl font-bold text-white">
                        {feeLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                            <span className="text-2xl text-slate-400">Calculating...</span>
                          </div>
                        ) : feeError ? (
                          <div className="flex items-center gap-2 text-red-400">
                            <AlertCircle className="w-6 h-6" />
                            <span className="text-lg">Error loading fees</span>
                          </div>
                        ) : feePreview ? (
                          `${feePreview.ngntsAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-slate-500">0.00</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Fee Breakdown */}
                {(feeLoading || feePreview || feeError) && (
                  <Card className="bg-white/5 backdrop-blur-md border-white/10">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-slate-400" />
                        Fee Breakdown
                      </h4>
                      {feeLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-4 bg-white/5 rounded animate-pulse" />
                          ))}
                        </div>
                      ) : feeError ? (
                        <p className="text-sm text-red-400">Failed to load fee breakdown</p>
                      ) : feePreview ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between text-slate-300">
                            <span>Deposit Amount</span>
                            <span className="font-mono">₦{feePreview.amountNGN.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="flex items-center gap-1">
                              <Calculator className="w-3 h-3" />
                              Platform Fee (2%)
                            </span>
                            <span className="font-mono text-orange-400">-₦{feePreview.platformFee.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="flex items-center gap-1">
                              <Fuel className="w-3 h-3" />
                              Network Gas Fee
                            </span>
                            <span className="font-mono text-orange-400">-₦{feePreview.gasFeeNGN.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="border-t border-white/10 pt-2 flex justify-between text-white font-semibold">
                            <span>Net NGNTS</span>
                            <span className="font-mono text-emerald-400">₦{feePreview.ngntsAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                    data-testid="button-back-step-2"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!canProceedToStep3}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                    data-testid="button-next-step-2"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Invoice Review */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                    Step 3 of 3
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Complete Your Deposit
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  Transfer funds to the account below and upload your proof of payment
                </p>

                {/* Invoice Card */}
                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                  <CardContent className="p-6 space-y-6">
                    {/* Reference Code */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Reference Code</p>
                        <p className="text-lg font-mono font-semibold text-emerald-400">{referenceCode}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(referenceCode, "Reference code")}
                        className="hover-elevate"
                        data-testid="button-copy-reference"
                      >
                        <Copy className="w-4 h-4 text-emerald-400" />
                      </Button>
                    </div>

                    {/* Bank Account Details */}
                    {bankLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : bankAccount ? (
                      <div className="space-y-3">
                        <div className="flex items-start justify-between p-4 rounded-lg bg-slate-800/50 border border-white/10">
                          <div className="flex-1">
                            <p className="text-xs text-slate-400 mb-1">Bank Name</p>
                            <p className="text-base font-medium text-white">{bankAccount.bankName}</p>
                          </div>
                        </div>

                        <div className="flex items-start justify-between p-4 rounded-lg bg-slate-800/50 border border-white/10">
                          <div className="flex-1">
                            <p className="text-xs text-slate-400 mb-1">Account Name</p>
                            <p className="text-base font-medium text-white">{bankAccount.accountName}</p>
                          </div>
                        </div>

                        <div className="flex items-start justify-between p-4 rounded-lg bg-slate-800/50 border border-white/10">
                          <div className="flex-1">
                            <p className="text-xs text-slate-400 mb-1">Account Number</p>
                            <p className="text-lg font-mono font-semibold text-white">{bankAccount.accountNumber}</p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => copyToClipboard(bankAccount.accountNumber, "Account number")}
                            className="hover-elevate"
                            data-testid="button-copy-account"
                          >
                            <Copy className="w-4 h-4 text-slate-400" />
                          </Button>
                        </div>

                        {bankAccount.routingCode && (
                          <div className="flex items-start justify-between p-4 rounded-lg bg-slate-800/50 border border-white/10">
                            <div className="flex-1">
                              <p className="text-xs text-slate-400 mb-1">Routing Code</p>
                              <p className="text-base font-mono font-medium text-white">{bankAccount.routingCode}</p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => copyToClipboard(bankAccount.routingCode, "Routing code")}
                              className="hover-elevate"
                              data-testid="button-copy-routing"
                            >
                              <Copy className="w-4 h-4 text-slate-400" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-red-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Failed to load bank details</p>
                      </div>
                    )}

                    {/* Amount to Send */}
                    {feePreview && (
                      <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20">
                        <p className="text-xs text-slate-400 mb-2">Amount to Send</p>
                        <p className="text-3xl font-bold text-white font-mono">
                          ₦{feePreview.amountNGN.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-1 text-sm">
                          <div className="flex justify-between text-slate-300">
                            <span>You will receive</span>
                            <span className="font-mono text-emerald-400">₦{feePreview.ngntsAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} NGNTS</span>
                          </div>
                          <div className="flex justify-between text-slate-400 text-xs">
                            <span>After fees</span>
                            <span className="font-mono">-₦{feePreview.totalFeesNGN.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Proof of Payment Upload */}
                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                  <CardContent className="p-6">
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      Upload Proof of Payment
                    </h4>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      data-testid="input-file-upload"
                    />
                    
                    {proofFile ? (
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex-shrink-0">
                          {proofFile.type.startsWith('image/') ? (
                            <ImageIcon className="w-8 h-8 text-emerald-400" />
                          ) : (
                            <FileText className="w-8 h-8 text-emerald-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{proofFile.name}</p>
                          <p className="text-xs text-slate-400">
                            {(proofFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setProofFile(null)}
                          className="hover-elevate"
                          data-testid="button-remove-file"
                        >
                          <AlertCircle className="w-4 h-4 text-orange-400" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full p-8 rounded-lg border-2 border-dashed border-white/20 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-center hover-elevate active-elevate-2"
                        data-testid="button-select-file"
                      >
                        <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        <p className="text-sm text-slate-300 mb-1">Click to upload</p>
                        <p className="text-xs text-slate-500">PNG, JPG or PDF (max 5MB)</p>
                      </button>
                    )}
                  </CardContent>
                </Card>

                {/* Navigation Buttons */}
                <div className="flex justify-between gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1"
                    data-testid="button-back-step-3"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!proofFile || submitMutation.isPending}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                    data-testid="button-submit-funding"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-4 h-4 mr-2" />
                        I have sent the money
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
