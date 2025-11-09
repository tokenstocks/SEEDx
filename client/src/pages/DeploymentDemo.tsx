import AppHeader from "@/components/AppHeader";
import { CapitalDeploymentWizard } from "@/components/CapitalDeploymentWizard";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function DeploymentDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <AppHeader />
      
      <div className="max-w-7xl mx-auto p-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
              <TrendingUp className="w-3 h-3 mr-1" />
              Treasury Management
            </Badge>
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Capital Deployment
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Deploy treasury capital to regenerative farm projects with multisig approval workflow
          </p>
        </motion.div>

        {/* Deployment Wizard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <CapitalDeploymentWizard />
        </motion.div>
      </div>
    </div>
  );
}
