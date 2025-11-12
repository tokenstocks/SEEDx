import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Wallet, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Sprout, 
  Shield,
  TrendingUp,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, optionalAuthQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Project = {
  id: string;
  name: string;
  description: string;
  location: string;
  targetAmount: string;
  raisedAmount: string;
  status: string;
  navPerToken: string;
};

type WizardStep = 1 | 2 | 3 | 4;

interface CapitalDeploymentWizardProps {
  onComplete?: () => void;
}

export function CapitalDeploymentWizard({ onComplete }: CapitalDeploymentWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [deploymentAmount, setDeploymentAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Fetch active projects
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch treasury balance (with optional auth - returns null on 401 without redirecting)
  const { data: treasuryData, isLoading: treasuryLoading } = useQuery({
    queryKey: ["/api/system/treasury-balance"],
    queryFn: optionalAuthQueryFn as () => Promise<{ balance: string; currency: string } | null>,
  });

  const selectedProject = projects?.find(p => p.id === selectedProjectId);
  // Use mock data if auth fails (demo mode)
  const treasuryBalance = parseFloat((treasuryData as any)?.balance || "500000");
  const isDemo = !treasuryData;
  const requestedAmount = parseFloat(deploymentAmount || "0");
  const isAmountValid = requestedAmount > 0 && requestedAmount <= treasuryBalance;

  const handleDeploy = async () => {
    if (!selectedProjectId || !deploymentAmount) return;

    setIsSubmitting(true);
    try {
      // This would be a real API call to create a deployment transaction
      // For now, we'll simulate it with a treasury pool transaction
      await apiRequest("POST", "/api/admin/treasury/allocate", {
        projectId: selectedProjectId,
        amountNgnts: parseFloat(deploymentAmount),
        metadata: {
          deploymentType: "capital_allocation",
          notes: `Capital deployment to ${selectedProject?.name}`,
        },
      });

      setStep(4);
      toast({
        title: "Deployment Initiated",
        description: "Your capital deployment request has been submitted for multisig approval.",
      });
    } catch (error: any) {
      toast({
        title: "Deployment Failed",
        description: error.message || "Failed to initiate capital deployment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = () => {
    setStep(1);
    setSelectedProjectId("");
    setDeploymentAmount("");
    onComplete?.();
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <motion.div
                initial={false}
                animate={{
                  scale: step >= s ? 1 : 0.9,
                  backgroundColor: step >= s ? "rgb(16, 185, 129)" : "rgb(51, 65, 85)",
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold relative z-10"
                data-testid={`step-indicator-${s}`}
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
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>Select Project</span>
          <span>Enter Amount</span>
          <span>Review & Confirm</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Select Project */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-white/5 backdrop-blur-md border-white/10">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Sprout className="w-5 h-5 text-emerald-400" />
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                    Step 1 of 3
                  </Badge>
                </div>
                <CardTitle className="text-white">Select Farm Project</CardTitle>
                <CardDescription className="text-slate-400">
                  Choose a project to deploy capital from the treasury pool
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projectsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-24 bg-white/5 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <RadioGroup value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <div className="space-y-3">
                      {projects?.map(project => (
                        <motion.div
                          key={project.id}
                          whileHover={{ scale: 1.01 }}
                          className="relative"
                        >
                          <label
                            htmlFor={project.id}
                            className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                              selectedProjectId === project.id
                                ? "border-emerald-500/50 bg-emerald-500/10"
                                : "border-white/10 bg-white/5 hover:bg-white/10"
                            }`}
                            data-testid={`project-option-${project.id}`}
                          >
                            <RadioGroupItem value={project.id} id={project.id} className="mt-1" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="font-semibold text-white">{project.name}</h4>
                                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                                  Active
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-400 mb-2">{project.description}</p>
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Sprout className="w-3 h-3" />
                                  {project.location}
                                </span>
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  NAV: ₦{parseFloat(project.navPerToken).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </label>
                        </motion.div>
                      ))}
                    </div>
                  </RadioGroup>
                )}

                <div className="flex justify-end mt-6">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!selectedProjectId}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-700"
                    data-testid="button-next-step1"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Enter Amount */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-white/5 backdrop-blur-md border-white/10">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-5 h-5 text-blue-400" />
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
                    Step 2 of 3
                  </Badge>
                </div>
                <CardTitle className="text-white">Enter Deployment Amount</CardTitle>
                <CardDescription className="text-slate-400">
                  Specify how much capital to deploy to {selectedProject?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Treasury Balance Display */}
                <div className="mb-6 p-4 rounded-lg bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Available Treasury Balance</span>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                      NGNTS
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold text-white" data-testid="text-treasury-balance">
                    ₦{treasuryLoading ? "..." : new Intl.NumberFormat('en-NG').format(treasuryBalance)}
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount" className="text-white mb-2 block">
                      Deployment Amount (NGNTS)
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={deploymentAmount}
                      onChange={(e) => setDeploymentAmount(e.target.value)}
                      className="text-lg h-12 bg-white/5 border-white/10 text-white"
                      data-testid="input-deployment-amount"
                    />
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {[25, 50, 75, 100].map(percent => (
                      <Button
                        key={percent}
                        variant="outline"
                        size="sm"
                        onClick={() => setDeploymentAmount((treasuryBalance * percent / 100).toFixed(2))}
                        className="border-white/10 text-slate-300 hover:bg-white/10"
                        data-testid={`button-quick-${percent}`}
                      >
                        {percent}%
                      </Button>
                    ))}
                  </div>

                  {/* Validation Alert */}
                  {deploymentAmount && !isAmountValid && (
                    <Alert className="border-red-500/30 bg-red-500/10">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <AlertDescription className="text-red-400 text-sm">
                        {requestedAmount > treasuryBalance
                          ? "Insufficient treasury balance"
                          : "Please enter a valid amount"}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Success Indicator */}
                  {isAmountValid && (
                    <Alert className="border-emerald-500/30 bg-emerald-500/10">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <AlertDescription className="text-emerald-400 text-sm">
                        Amount validated. Remaining balance: ₦{new Intl.NumberFormat('en-NG').format(treasuryBalance - requestedAmount)}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="border-white/10 text-slate-300"
                    data-testid="button-back-step2"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!isAmountValid}
                    className="bg-gradient-to-r from-blue-500 to-blue-700"
                    data-testid="button-next-step2"
                  >
                    Review Deployment
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Review & Confirm */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-white/5 backdrop-blur-md border-white/10">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/10">
                    Step 3 of 3
                  </Badge>
                </div>
                <CardTitle className="text-white">Review & Confirm Deployment</CardTitle>
                <CardDescription className="text-slate-400">
                  Verify all details before submitting for multisig approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Deployment Summary */}
                <div className="space-y-4 mb-6">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-slate-500 block mb-1">Project</span>
                        <span className="text-white font-medium">{selectedProject?.name}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block mb-1">Location</span>
                        <span className="text-white font-medium">{selectedProject?.location}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block mb-1">Deployment Amount</span>
                        <span className="text-2xl font-bold text-emerald-400" data-testid="text-review-amount">
                          ₦{new Intl.NumberFormat('en-NG').format(requestedAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block mb-1">Currency</span>
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                          NGNTS
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Multisig Requirement Notice */}
                  <Alert className="border-blue-500/30 bg-blue-500/10">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <AlertDescription className="text-blue-400 text-sm">
                      <div className="font-medium mb-1">Multisig Approval Required</div>
                      This deployment requires 2-of-3 signatures from authorized treasury signers (CFO, COO, CEO).
                      You'll be notified once the required approvals are collected.
                    </AlertDescription>
                  </Alert>

                  {/* Impact Preview */}
                  <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium text-white">Expected Impact</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">Farm Funding</span>
                        <p className="text-white font-medium">+₦{new Intl.NumberFormat('en-NG').format(requestedAmount)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Treasury Balance</span>
                        <p className="text-white font-medium">₦{new Intl.NumberFormat('en-NG').format(treasuryBalance - requestedAmount)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    disabled={isSubmitting}
                    className="border-white/10 text-slate-300"
                    data-testid="button-back-step3"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleDeploy}
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-purple-500 to-purple-700"
                    data-testid="button-submit-deployment"
                  >
                    {isSubmitting ? "Submitting..." : "Submit for Approval"}
                    <Check className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 backdrop-blur-md border-emerald-500/30">
              <CardContent className="pt-12 pb-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="inline-block mb-6"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </div>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold text-white mb-3"
                >
                  Deployment Submitted!
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-slate-400 mb-2"
                >
                  Your capital deployment request has been submitted for multisig approval.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="inline-block px-4 py-2 rounded-lg bg-white/5 border border-white/10 mb-8"
                >
                  <span className="text-sm text-slate-400">Deployment Amount: </span>
                  <span className="text-lg font-bold text-emerald-400">
                    ₦{new Intl.NumberFormat('en-NG').format(requestedAmount)}
                  </span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button
                    onClick={handleComplete}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-700"
                    data-testid="button-complete-deployment"
                  >
                    Deploy Another Project
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
