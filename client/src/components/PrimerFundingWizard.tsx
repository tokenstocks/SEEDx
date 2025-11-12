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

type BankAccountDetails = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  routingCode: string;
};

type FeePreview = {
  amountNGN: string;
  platformFeePercent: string;
  platformFeeNGN: string;
  netNGNTS: string;
  exchangeRate: string;
};

type PaymentMethod = "bank_transfer" | "usdc" | null;
type WizardStep = 1 | 2 | 3;

interface PrimerFundingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrimerFundingWizard({ open, onOpenChange }: PrimerFundingWizardProps) {
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

  useEffect(() => {
    if (!open) {
      handleReset();
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const parsedAmount = parseFloat(amount);
  const isAmountValid = parsedAmount >= 1000 && parsedAmount <= 100000000;
  const shouldFetchFees = isAmountValid && step === 2;
  
  const { data: feePreview, isLoading: feeLoading, error: feeError } = useQuery<FeePreview>({
    queryKey: ["/api/primer/contribution-preview", amount],
    queryFn: async () => {
      const res = await fetch("/api/primer/contribution-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
        body: JSON.stringify({ amountNGN: amount }),
      });
      if (!res.ok) {
        throw new Error("Failed to load fees");
      }
      return res.json();
    },
    enabled: shouldFetchFees,
    refetchInterval: false,
    staleTime: 30000,
  });

  const canProceedToStep3 = isAmountValid && feePreview && !feeError;

  const { data: bankAccount, isLoading: bankLoading } = useQuery<BankAccountDetails>({
    queryKey: ["/api/settings/bank-account"],
    queryFn: async () => {
      const res = await fetch("/api/settings/bank-account", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to load bank account details");
      }
      return res.json();
    },
    enabled: step === 3,
    staleTime: 60000,
  });

  const createContributionMutation = useMutation({
    mutationFn: async () => {
      if (!feePreview) throw new Error("Fee preview not loaded");
      if (!paymentMethod) throw new Error("Payment method not selected");
      
      // Generate unique reference code if not already set
      const refCode = referenceCode || `PRIMER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const formData = new FormData();
      formData.append("grossAmountNgn", amount);
      formData.append("platformFeeNgn", feePreview.platformFeeNGN);
      formData.append("amountNgnts", feePreview.netNGNTS);
      formData.append("paymentMethod", paymentMethod);
      formData.append("referenceCode", refCode);
      if (proofFile) {
        formData.append("paymentProof", proofFile);
      }

      const response = await fetch("/api/primer/contributions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit contribution");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/primer/contributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/primer/wallet/balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/primer/stats"] });

      toast({
        title: "Contribution submitted!",
        description: "Your LP Pool contribution is now pending review. You'll be notified once it's approved.",
      });

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
    if (!bankAccount) {
      toast({
        title: "Bank details unavailable",
        description: "Please wait for bank details to load or try again",
        variant: "destructive",
      });
      return;
    }
    createContributionMutation.mutate();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      setProofFile(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <Coins className="w-7 h-7 text-blue-400" />
            Contribute to LP Pool
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
                    backgroundColor: step >= s ? "rgb(59, 130, 246)" : "rgb(51, 65, 85)",
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold relative z-10 shadow-lg"
                  data-testid={`primer-funding-step-indicator-${s}`}
                >
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </motion.div>
                {s < 3 && (
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: step > s ? "rgb(59, 130, 246)" : "rgb(51, 65, 85)",
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
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
                      Step 1 of 3
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Choose Your Payment Method
                  </h3>
                  <p className="text-sm text-slate-400">
                    Select how you'd like to contribute NGN to the Liquidity Pool
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
                          ? "border-blue-500/50 ring-2 ring-blue-500/20"
                          : "border-white/10"
                      )}
                      onClick={() => setPaymentMethod("bank_transfer")}
                      data-testid="primer-payment-method-bank-transfer"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center",
                            paymentMethod === "bank_transfer"
                              ? "bg-blue-500/20 border border-blue-500/30"
                              : "bg-white/5 border border-white/10"
                          )}>
                            <Building2 className={cn(
                              "w-6 h-6",
                              paymentMethod === "bank_transfer"
                                ? "text-blue-400"
                                : "text-slate-400"
                            )} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-white">Bank Transfer</h4>
                              <Badge variant="outline" className="text-xs border-green-500/30 text-green-400 bg-green-500/10">
                                NGN
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-400">
                              Transfer Nigerian Naira to platform account and receive NGNTS tokens
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
                              className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"
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
                    data-testid="primer-payment-method-usdc"
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
                            Send USDC directly for instant conversion to NGNTS
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
                    data-testid="button-cancel-primer-funding"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!paymentMethod}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
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
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
                      Step 2 of 3
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Enter Contribution Amount
                  </h3>
                  <p className="text-sm text-slate-400">
                    How much would you like to contribute to the LP Pool?
                  </p>
                </div>

                {/* You Send Card */}
                <Card className="bg-white/5 backdrop-blur-md border-white/10">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">You Send</span>
                        <Badge variant="outline" className="text-xs border-green-500/30 text-green-400 bg-green-500/10">
                          NGN
                        </Badge>
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="text-3xl font-bold h-16 bg-white/5 border-white/10 text-white pr-16"
                          data-testid="input-contribution-amount"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                          NGN
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Min: ₦1,000</span>
                        <span>Max: ₦100,000,000</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Calculation Breakdown */}
                {(feeLoading || feePreview) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-md border-blue-500/20">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Calculator className="w-5 h-5 text-blue-400" />
                          <h4 className="font-semibold text-white">Calculation Breakdown</h4>
                        </div>

                        {feeLoading ? (
                          <div className="flex items-center gap-3 text-slate-400">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Calculating fees...</span>
                          </div>
                        ) : feePreview ? (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-white/10">
                              <span className="text-sm text-slate-400">Amount to Send</span>
                              <span className="font-semibold text-white">
                                ₦{parseFloat(feePreview.amountNGN).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/10">
                              <span className="text-sm text-slate-400 flex items-center gap-2">
                                <Fuel className="w-4 h-4" />
                                Platform Fee ({feePreview.platformFeePercent}%)
                              </span>
                              <span className="text-orange-400 font-medium">
                                -₦{parseFloat(feePreview.platformFeeNGN).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-3 bg-blue-500/10 rounded-lg px-3 mt-4">
                              <span className="text-sm font-semibold text-white">You'll Receive</span>
                              <span className="text-xl font-bold text-blue-400" data-testid="text-net-ngnts">
                                {parseFloat(feePreview.netNGNTS).toLocaleString()} NGNTS
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                              Rate: 1 NGN = 1 NGNTS (after fees)
                            </p>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Error Display */}
                {feeError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="bg-red-500/10 border border-red-500/20 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm">Failed to calculate fees. Please try again.</span>
                    </div>
                  </motion.div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!canProceedToStep3}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-next-step"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
                      Step 3 of 3
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Complete Your Contribution
                  </h3>
                  <p className="text-sm text-slate-400">
                    Transfer funds and upload payment proof
                  </p>
                </div>

                {/* Bank Details Card */}
                <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-md border-blue-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Building2 className="w-5 h-5 text-blue-400" />
                      <h4 className="font-semibold text-white">Transfer to this Account</h4>
                    </div>

                    {bankLoading ? (
                      <div className="flex items-center gap-3 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading bank details...</span>
                      </div>
                    ) : bankAccount ? (
                      <div className="space-y-3">
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-xs text-slate-400 mb-1">Bank Name</div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white" data-testid="text-bank-name">{bankAccount.bankName}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopy(bankAccount.bankName)}
                              className="h-6"
                              data-testid="button-copy-bank-name"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-xs text-slate-400 mb-1">Account Number</div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white text-lg" data-testid="text-account-number">{bankAccount.accountNumber}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopy(bankAccount.accountNumber)}
                              className="h-6"
                              data-testid="button-copy-account-number"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-xs text-slate-400 mb-1">Account Name</div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white" data-testid="text-account-name">{bankAccount.accountName}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopy(bankAccount.accountName)}
                              className="h-6"
                              data-testid="button-copy-account-name"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-4">
                          <div className="text-xs text-blue-400 mb-1">Amount to Transfer</div>
                          <div className="text-2xl font-bold text-white" data-testid="text-amount-to-transfer">
                            ₦{parseFloat(amount).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-red-400">Failed to load bank details</div>
                    )}
                  </CardContent>
                </Card>

                {/* Upload Proof */}
                <Card className="bg-white/5 backdrop-blur-md border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Upload className="w-5 h-5 text-slate-400" />
                      <h4 className="font-semibold text-white">Upload Payment Proof</h4>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      data-testid="input-proof-file"
                    />

                    {!proofFile ? (
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-dashed border-white/20 h-32 hover-elevate"
                        data-testid="button-upload-proof"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-8 h-8 text-slate-400" />
                          <span className="text-sm text-slate-400">
                            Click to upload receipt/screenshot
                          </span>
                          <span className="text-xs text-slate-500">
                            PDF, PNG, JPG (max 10MB)
                          </span>
                        </div>
                      </Button>
                    ) : (
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                            {proofFile.type.includes("pdf") ? (
                              <FileText className="w-6 h-6 text-blue-400" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-blue-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <FileCheck className="w-4 h-4 text-green-400" />
                              <span className="text-sm font-semibold text-white">File uploaded</span>
                            </div>
                            <p className="text-sm text-slate-400 truncate">{proofFile.name}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {(proofFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setProofFile(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = "";
                              }
                            }}
                            className="text-red-400 hover:text-red-300"
                            data-testid="button-remove-proof"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-slate-500 mt-3">
                      Upload your bank transfer receipt, mobile banking screenshot, or payment confirmation
                    </p>
                  </CardContent>
                </Card>

                {/* Navigation Buttons */}
                <div className="flex justify-between gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1"
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!proofFile || createContributionMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-submit-contribution"
                  >
                    {createContributionMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Contribution
                        <Check className="w-4 h-4 ml-2" />
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
