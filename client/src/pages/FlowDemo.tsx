import { CapitalFlowVisualization } from "@/components/CapitalFlowVisualization";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, Sprout } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

export default function FlowDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
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
              <RefreshCw className="w-3 h-3 mr-1" />
              Regenerative Finance
            </Badge>
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Capital Flow Visualization
          </h1>
          <p className="text-lg text-slate-400 max-w-3xl">
            Watch how SEEDx automatically distributes project cashflow to ensure sustainable capital regeneration
          </p>
        </motion.div>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <Card className="bg-white/5 backdrop-blur-md border-white/10">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Sprout className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Regenerative Share</div>
                  <div className="text-xl font-bold text-white">70%</div>
                  <div className="text-[10px] text-slate-400">Treasury + Reinvestment</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-md border-white/10">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Stakeholder Returns</div>
                  <div className="text-xl font-bold text-white">20%</div>
                  <div className="text-[10px] text-slate-400">LP Investors</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-md border-white/10">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-500/10">
                  <RefreshCw className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Platform Operations</div>
                  <div className="text-xl font-bold text-white">10%</div>
                  <div className="text-[10px] text-slate-400">Maintenance & Dev</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Flow Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <CapitalFlowVisualization />
        </motion.div>

        {/* Explainer Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8"
        >
          <Card className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-md border-white/10">
            <CardContent className="pt-6 pb-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                How Regenerative Capital Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sprout className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-white font-medium">Sustainable Growth</h4>
                  </div>
                  <p>
                    70% of project cashflow returns to the treasury and reinvestment pools, ensuring
                    the platform can continuously fund new regenerative projects without external capital.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    <h4 className="text-white font-medium">Fair Returns</h4>
                  </div>
                  <p>
                    20% goes directly to LP investors who provide initial capital, creating a
                    sustainable return model that rewards early supporters of regenerative agriculture.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="w-4 h-4 text-orange-400" />
                    <h4 className="text-white font-medium">Automated Distribution</h4>
                  </div>
                  <p>
                    Every cashflow event automatically triggers the distribution logic, removing
                    manual intervention and ensuring consistent, transparent capital regeneration.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <h4 className="text-white font-medium">Platform Sustainability</h4>
                  </div>
                  <p>
                    10% operational fees fund ongoing platform development, security audits, and
                    customer support, ensuring long-term viability.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
