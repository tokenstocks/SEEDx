import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, Percent, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const platformFeesSchema = z.object({
  depositFeePercent: z.coerce.number().min(0, "Must be at least 0%").max(10, "Must not exceed 10%"),
  withdrawalFeePercent: z.coerce.number().min(0, "Must be at least 0%").max(10, "Must not exceed 10%"),
});

type PlatformFeesForm = z.infer<typeof platformFeesSchema>;

interface PlatformFees {
  depositFeePercent: number;
  withdrawalFeePercent: number;
}

export default function AdminPlatformFees() {
  const { toast } = useToast();

  const form = useForm<PlatformFeesForm>({
    resolver: zodResolver(platformFeesSchema),
    defaultValues: {
      depositFeePercent: 2,
      withdrawalFeePercent: 2,
    },
  });

  const { data: feesData, isLoading } = useQuery<PlatformFees>({
    queryKey: ["/api/admin/settings/platform-fees"],
  });

  useEffect(() => {
    if (feesData) {
      form.reset({
        depositFeePercent: feesData.depositFeePercent,
        withdrawalFeePercent: feesData.withdrawalFeePercent,
      });
    }
  }, [feesData, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: PlatformFeesForm) => {
      const response = await apiRequest("PUT", "/api/admin/settings/platform-fees", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Fees Updated",
        description: "Platform fee configuration has been saved",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/platform-fees"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PlatformFeesForm) => {
    updateMutation.mutate(data);
  };

  const depositFeeWatch = form.watch("depositFeePercent");
  const withdrawalFeeWatch = form.watch("withdrawalFeePercent");
  const hasChanges = form.formState.isDirty;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white" data-testid="text-platform-fees-title">
          Platform Fees
        </h2>
        <p className="text-slate-400 mt-1">
          Configure deposit and withdrawal fee percentages
        </p>
      </div>

      {/* Fee Configuration Card */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            Fee Configuration
          </CardTitle>
          <CardDescription className="text-slate-400">
            Set platform fees for deposit and withdrawal operations (0-10%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Deposit Fee */}
                <FormField
                  control={form.control}
                  name="depositFeePercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300 text-base">
                        Deposit Fee (NGN → NGNTS)
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            className="bg-white/5 border-white/10 text-white pr-12 text-lg"
                            placeholder="2.0"
                            data-testid="input-deposit-fee"
                            {...field}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            %
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription className="text-slate-500">
                        Fee charged when users deposit NGN via bank transfer to mint NGNTS
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {depositFeeWatch && depositFeeWatch > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-primary/10 border border-primary/20 rounded-lg p-3"
                  >
                    <p className="text-sm text-slate-300">
                      <span className="font-medium text-primary">Example:</span> ₦10,000 deposit = 
                      ₦{(10000 * (1 - depositFeeWatch / 100)).toLocaleString()} NGNTS 
                      (₦{(10000 * depositFeeWatch / 100).toLocaleString()} fee)
                    </p>
                  </motion.div>
                )}

                {/* Withdrawal Fee */}
                <FormField
                  control={form.control}
                  name="withdrawalFeePercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300 text-base">
                        Withdrawal Fee (NGNTS → NGN)
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            className="bg-white/5 border-white/10 text-white pr-12 text-lg"
                            placeholder="2.0"
                            data-testid="input-withdrawal-fee"
                            {...field}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            %
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription className="text-slate-500">
                        Fee charged when users withdraw NGNTS and receive NGN to their bank account
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {withdrawalFeeWatch && withdrawalFeeWatch > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-primary/10 border border-primary/20 rounded-lg p-3"
                  >
                    <p className="text-sm text-slate-300">
                      <span className="font-medium text-primary">Example:</span> ₦10,000 NGNTS withdrawal = 
                      ₦{(10000 * (1 - withdrawalFeeWatch / 100)).toLocaleString()} received 
                      (₦{(10000 * withdrawalFeeWatch / 100).toLocaleString()} fee)
                    </p>
                  </motion.div>
                )}

                {/* Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-300">
                        Fee Structure Guidelines
                      </p>
                      <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
                        <li>Fees must be between 0% and 10%</li>
                        <li>Deposit fees apply to NGN bank deposits (before NGNTS minting)</li>
                        <li>Withdrawal fees apply to NGNTS redemptions (before NGN payout)</li>
                        <li>Gas fees are calculated separately based on network conditions</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={!hasChanges || updateMutation.isPending}
                    data-testid="button-save-fees"
                  >
                    {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
