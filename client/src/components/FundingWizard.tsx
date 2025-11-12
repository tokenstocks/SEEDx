import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Building2, Coins, Check, ChevronRight, ArrowDown, Calculator, Fuel, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { BankDepositFeePreview } from "@shared/schema";

type PaymentMethod = "bank_transfer" | "usdc" | null;
type WizardStep = 1 | 2 | 3;

interface FundingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FundingWizard({ open, onOpenChange }: FundingWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [amount, setAmount] = useState("");

  const handleReset = () => {
    setStep(1);
    setPaymentMethod(null);
    setAmount("");
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

          {/* Step 3: Review & Submit (Placeholder for now) */}
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
                  Review & Submit
                </h3>
                <p className="text-sm text-slate-400">
                  Step 3 implementation coming next
                </p>
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
                    onClick={handleClose}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    data-testid="button-submit-funding"
                  >
                    I have sent the money
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
