import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const contributionSchema = z.object({
  amountNgnts: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal"),
  paymentProof: z.string().optional(),
});

type ContributionFormData = z.infer<typeof contributionSchema>;

interface PrimerContributionFormProps {
  onClose: () => void;
}

export default function PrimerContributionForm({ onClose }: PrimerContributionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"form" | "success">("form");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContributionFormData>({
    resolver: zodResolver(contributionSchema),
  });

  const contributeMutation = useMutation({
    mutationFn: async (data: ContributionFormData) => {
      const response = await apiRequest("POST", "/api/primer/contribute", data);
      return await response.json();
    },
    onSuccess: () => {
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["/api/primer/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/primer/contributions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Contribution failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContributionFormData) => {
    contributeMutation.mutate(data);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Contribute to LP Pool</DialogTitle>
              <DialogDescription className="text-slate-400">
                Submit your contribution request for admin review and approval
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amountNgnts" className="text-slate-300">
                  Contribution Amount (NGNTS)
                </Label>
                <Input
                  id="amountNgnts"
                  type="text"
                  placeholder="10000.00"
                  {...register("amountNgnts")}
                  className="bg-white/5 border-white/10 text-white"
                  data-testid="input-amount"
                />
                {errors.amountNgnts && (
                  <p className="text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.amountNgnts.message}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Enter the amount you wish to contribute to the liquidity pool
                </p>
              </div>

              {/* Payment Proof (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="paymentProof" className="text-slate-300">
                  Payment Proof / Notes (Optional)
                </Label>
                <Textarea
                  id="paymentProof"
                  placeholder="Transaction reference, wire transfer details, or other proof..."
                  {...register("paymentProof")}
                  className="bg-white/5 border-white/10 text-white resize-none"
                  rows={3}
                  data-testid="input-payment-proof"
                />
                <p className="text-xs text-slate-500">
                  Provide any payment details or references to help with approval
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  How It Works
                </h4>
                <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                  <li>Your contribution request will be reviewed by an admin</li>
                  <li>Upon approval, funds will be added to the LP Pool</li>
                  <li>You'll receive a blockchain transaction hash for auditing</li>
                  <li>Your LP Pool share percentage will be calculated</li>
                  <li>Admin will allocate LP funds to agricultural projects</li>
                </ul>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-white/10 text-white hover:bg-white/5"
                  disabled={contributeMutation.isPending}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={contributeMutation.isPending}
                  data-testid="button-submit"
                >
                  {contributeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Contribution"
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
              </div>
              <DialogTitle className="text-2xl text-center">
                Contribution Submitted!
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-center">
                Your LP Pool contribution request has been submitted for admin review
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2">Next Steps</h4>
                <ul className="text-sm text-slate-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">1.</span>
                    <span>Admin will review your contribution request</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">2.</span>
                    <span>You'll receive email notification of approval status</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">3.</span>
                    <span>Upon approval, blockchain transaction will be recorded</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">4.</span>
                    <span>Your LP Pool share will be calculated and displayed</span>
                  </li>
                </ul>
              </div>

              <Button
                onClick={onClose}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                data-testid="button-done"
              >
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
