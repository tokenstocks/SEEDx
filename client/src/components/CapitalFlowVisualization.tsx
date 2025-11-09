import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, useReducedMotion } from "framer-motion";
import { 
  TrendingUp, 
  Users, 
  RefreshCw, 
  Building2,
  ArrowDown,
  ArrowRight,
  Sprout
} from "lucide-react";

interface FlowNode {
  id: string;
  label: string;
  percentage: number;
  color: string;
  icon: any;
  description: string;
}

export function CapitalFlowVisualization() {
  const shouldReduceMotion = useReducedMotion();

  // Fetch treasury balance for live metrics
  const { data: treasuryData } = useQuery<{ balance: string; currency: string }>({
    queryKey: ["/api/system/treasury-balance"],
  });

  const treasuryBalance = parseFloat(treasuryData?.balance || "0");

  // Define the regenerative capital flow nodes
  const flowNodes: FlowNode[] = [
    {
      id: "cashflow",
      label: "Project Cashflow",
      percentage: 100,
      color: "emerald",
      icon: Sprout,
      description: "Revenue from regenerative farm operations",
    },
    {
      id: "treasury",
      label: "Treasury Pool",
      percentage: 60,
      color: "blue",
      icon: Building2,
      description: "Capital reserve for future deployments",
    },
    {
      id: "lp-investors",
      label: "LP Investors",
      percentage: 20,
      color: "purple",
      icon: Users,
      description: "Returns distributed to liquidity providers",
    },
    {
      id: "reinvestment",
      label: "Reinvestment",
      percentage: 10,
      color: "orange",
      icon: RefreshCw,
      description: "Capital recycled into farm expansion",
    },
    {
      id: "operations",
      label: "Operational Fees",
      percentage: 10,
      color: "slate",
      icon: TrendingUp,
      description: "Platform maintenance and development",
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { border: string; bg: string; text: string }> = {
      emerald: { border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-400" },
      blue: { border: "border-blue-500/30", bg: "bg-blue-500/10", text: "text-blue-400" },
      purple: { border: "border-purple-500/30", bg: "bg-purple-500/10", text: "text-purple-400" },
      orange: { border: "border-orange-500/30", bg: "bg-orange-500/10", text: "text-orange-400" },
      slate: { border: "border-slate-500/30", bg: "bg-slate-500/10", text: "text-slate-400" },
    };
    return colors[color] || colors.slate;
  };

  return (
    <Card className="bg-white/5 backdrop-blur-md border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-400" />
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
              Live Flow
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Current Treasury</div>
            <div className="text-lg font-bold text-white" data-testid="text-flow-treasury-balance">
              ₦{new Intl.NumberFormat('en-NG').format(treasuryBalance)}
            </div>
          </div>
        </div>
        <CardTitle className="text-white">Regenerative Capital Flow</CardTitle>
        <CardDescription className="text-slate-400">
          Automated cashflow distribution ensuring sustainable capital regeneration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Source: Project Cashflow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {(() => {
              const sourceNode = flowNodes[0];
              const SourceIcon = sourceNode.icon;
              return (
                <div className={`p-6 rounded-xl border ${getColorClasses(sourceNode.color).border} ${getColorClasses(sourceNode.color).bg}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-3 rounded-lg bg-white/10`}>
                      <SourceIcon className={`w-6 h-6 ${getColorClasses(sourceNode.color).text}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-lg">{sourceNode.label}</h3>
                      <p className="text-sm text-slate-400">{sourceNode.description}</p>
                    </div>
                    <Badge variant="outline" className={`${getColorClasses(sourceNode.color).border} ${getColorClasses(sourceNode.color).text} ${getColorClasses(sourceNode.color).bg}`}>
                      100%
                    </Badge>
                  </div>
                </div>
              );
            })()}
          </motion.div>

          {/* Flow Arrow Down */}
          <div className="flex justify-center">
            <motion.div
              animate={shouldReduceMotion ? {} : {
                y: [0, 10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <ArrowDown className="w-8 h-8 text-emerald-400/50" />
            </motion.div>
          </div>

          {/* Distribution Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flowNodes.slice(1).map((node, idx) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="relative"
                data-testid={`flow-node-${node.id}`}
              >
                <div className={`p-4 rounded-lg border ${getColorClasses(node.color).border} bg-white/5 hover:bg-white/10 transition-colors`}>
                  {/* Animated Flow Indicator */}
                  <motion.div
                    animate={shouldReduceMotion ? {} : {
                      opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: idx * 0.3,
                    }}
                    className={`absolute top-0 left-0 right-0 h-[2px] ${
                      node.color === 'blue' ? 'bg-gradient-to-r from-transparent via-blue-500 to-transparent' :
                      node.color === 'purple' ? 'bg-gradient-to-r from-transparent via-purple-500 to-transparent' :
                      node.color === 'orange' ? 'bg-gradient-to-r from-transparent via-orange-500 to-transparent' :
                      'bg-gradient-to-r from-transparent via-slate-500 to-transparent'
                    }`}
                  />

                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getColorClasses(node.color).bg}`}>
                      <node.icon className={`w-5 h-5 ${getColorClasses(node.color).text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-white text-sm">{node.label}</h4>
                        <Badge 
                          variant="outline" 
                          className={`${getColorClasses(node.color).border} ${getColorClasses(node.color).text} ${getColorClasses(node.color).bg} text-xs`}
                        >
                          {node.percentage}%
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400">{node.description}</p>
                      
                      {/* Simulated Amount */}
                      <div className="mt-2 text-sm font-medium text-white">
                        ₦{new Intl.NumberFormat('en-NG').format(treasuryBalance * node.percentage / 100)}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Summary Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="p-4 rounded-lg bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10"
          >
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-slate-500 mb-1">Total Distributed</div>
                <div className="text-lg font-bold text-white">100%</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Regenerative Share</div>
                <div className="text-lg font-bold text-emerald-400">70%</div>
                <div className="text-[10px] text-slate-500">Treasury + Reinvestment</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Stakeholder Returns</div>
                <div className="text-lg font-bold text-purple-400">20%</div>
                <div className="text-[10px] text-slate-500">LP Investors</div>
              </div>
            </div>
          </motion.div>

          {/* Interactive Flow Legend */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <motion.div
              animate={shouldReduceMotion ? {} : {
                x: [0, 5, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <ArrowRight className="w-4 h-4 text-emerald-400/50" />
            </motion.div>
            <span className="text-xs text-slate-500">Real-time automated distribution</span>
            <motion.div
              animate={shouldReduceMotion ? {} : {
                rotate: [0, 360],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <RefreshCw className="w-4 h-4 text-emerald-400/50" />
            </motion.div>
            <span className="text-xs text-slate-500">Continuous capital regeneration</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
