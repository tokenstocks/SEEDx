import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { useLocation } from "wouter";
import { 
  SearchCheck, 
  HandCoins, 
  Sprout,
  Store,
  ArrowLeftRight,
  TrendingUp,
  ShieldCheck,
  FileText,
  PieChart,
  Lock,
  CheckCircle2,
  Satellite,
  Camera,
  Coins,
  Layers,
  Leaf,
  Smartphone,
  Play,
  Clock,
  Eye,
  ThumbsUp,
  ArrowRight,
  ExternalLink,
  Zap,
  Droplets,
  Shield
} from "lucide-react";
import { Button } from "./ui/button";

type Audience = "primer" | "regenerator";

interface StepData {
  number: string;
  icon: typeof SearchCheck;
  title: string;
  description: string;
  highlights: { icon: typeof ShieldCheck; text: string }[];
  stats: { value: string; label: string }[];
}

const primerSteps: StepData[] = [
  {
    number: "01",
    icon: SearchCheck,
    title: "Browse Verified Farms",
    description: "Explore curated agricultural projects across Africa. Each farm is verified, with detailed financials, impact metrics, and risk assessments.",
    highlights: [
      { icon: ShieldCheck, text: "Due Diligence Complete" },
      { icon: FileText, text: "Legal Documentation" },
      { icon: PieChart, text: "Risk Assessment" }
    ],
    stats: [
      { value: "50+", label: "Active Projects" },
      { value: "15", label: "Countries" }
    ]
  },
  {
    number: "02",
    icon: HandCoins,
    title: "Deploy Capital",
    description: "Fund projects directly through smart contracts. Your capital is deployed transparently with milestone-based releases tracked on-chain.",
    highlights: [
      { icon: Lock, text: "Smart Contract Secured" },
      { icon: CheckCircle2, text: "Milestone-Based Release" },
      { icon: TrendingUp, text: "Real-Time Tracking" }
    ],
    stats: [
      { value: "$2.5M+", label: "Deployed" },
      { value: "98%", label: "Success Rate" }
    ]
  },
  {
    number: "03",
    icon: Sprout,
    title: "Track Impact & Returns",
    description: "Monitor farm progress with real-time updates, photos, and IoT data. Receive returns as farms generate revenue from harvests.",
    highlights: [
      { icon: Satellite, text: "IoT Monitoring" },
      { icon: Camera, text: "Photo Updates" },
      { icon: Coins, text: "Automated Returns" }
    ],
    stats: [
      { value: "12-18%", label: "Avg. Returns" },
      { value: "6-12mo", label: "Timeline" }
    ]
  }
];

const regeneratorSteps: StepData[] = [
  {
    number: "01",
    icon: Store,
    title: "Browse Token Marketplace",
    description: "Explore farm-backed tokens representing fractional ownership in real agricultural assets. Each token is backed by verified projects.",
    highlights: [
      { icon: Coins, text: "Fractional Ownership" },
      { icon: Sprout, text: "Real Asset Backing" },
      { icon: Leaf, text: "Pan-African Access" }
    ],
    stats: [
      { value: "100+", label: "Token Types" },
      { value: "24/7", label: "Trading" }
    ]
  },
  {
    number: "02",
    icon: ArrowLeftRight,
    title: "Acquire & Trade Tokens",
    description: "Purchase tokens on the exchange with instant settlement. Trade freely with other regenerators in a liquid, transparent marketplace.",
    highlights: [
      { icon: Zap, text: "Instant Settlement" },
      { icon: Droplets, text: "High Liquidity" },
      { icon: Shield, text: "Secure Trading" }
    ],
    stats: [
      { value: "500+", label: "Active Traders" },
      { value: "$50K+", label: "Daily Volume" }
    ]
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Grow Your Portfolio",
    description: "Diversify across crops, regions, and seasons. Track your portfolio performance and impact metrics in real-time.",
    highlights: [
      { icon: Layers, text: "Portfolio Diversification" },
      { icon: Leaf, text: "Impact Tracking" },
      { icon: Smartphone, text: "Mobile Dashboard" }
    ],
    stats: [
      { value: "15+", label: "Crop Types" },
      { value: "1,200+", label: "Hectares" }
    ]
  }
];

export default function HowItWorksSection() {
  const [activeAudience, setActiveAudience] = useState<Audience>("primer");
  const prefersReducedMotion = useReducedMotion();
  const [, setLocation] = useLocation();

  const steps = activeAudience === "primer" ? primerSteps : regeneratorSteps;
  const gradientClass = activeAudience === "primer" 
    ? "from-blue-600 to-blue-800" 
    : "from-emerald-500 to-emerald-700";
  const glowClass = activeAudience === "primer"
    ? "group-hover:shadow-blue-600/20"
    : "group-hover:shadow-emerald-500/20";
  const topBorderClass = activeAudience === "primer"
    ? "from-transparent via-blue-500/60 to-transparent"
    : "from-transparent via-emerald-500/60 to-transparent";
  const textHoverClass = activeAudience === "primer"
    ? "group-hover:text-blue-400"
    : "group-hover:text-emerald-400";
  const iconColorClass = activeAudience === "primer"
    ? "text-blue-400"
    : "text-emerald-400";

  return (
    <MotionConfig reducedMotion={prefersReducedMotion ? "always" : "never"}>
      <section className="relative py-20 md:py-32 px-4 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" data-testid="section-how-it-works">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[20%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="inline-block px-5 py-2 mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
            <span className="text-emerald-400 text-xs font-bold tracking-[0.2em] uppercase">
              The Process
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent tracking-tight" data-testid="heading-how-it-works">
            How SEEDx Works
          </h2>
          <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed" data-testid="text-subtitle">
            From capital deployment to token trading—transparent, verified, and regenerative
          </p>
        </motion.div>

        {/* Audience Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="flex justify-center gap-4 mb-16"
        >
          <button
            onClick={() => setActiveAudience("primer")}
            className={`flex items-center gap-3 px-6 md:px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
              activeAudience === "primer"
                ? "bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg shadow-blue-600/30 scale-105"
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1"
            }`}
            data-testid="toggle-primer"
          >
            <HandCoins className="w-5 h-5" />
            <span>For Primers</span>
          </button>
          <button
            onClick={() => setActiveAudience("regenerator")}
            className={`flex items-center gap-3 px-6 md:px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
              activeAudience === "regenerator"
                ? "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/30 scale-105"
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1"
            }`}
            data-testid="toggle-regenerator"
          >
            <ArrowLeftRight className="w-5 h-5" />
            <span>For Regenerators</span>
          </button>
        </motion.div>

        {/* Process Steps */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-20">
          {steps.map((step, index) => (
            <motion.div
              key={`${activeAudience}-${index}`}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 + index * 0.1, ease: "easeOut" }}
              className="relative group"
              data-testid={`step-${index + 1}`}
            >
              {/* Card */}
              <div className={`relative h-full bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-10 transition-all duration-500 hover:bg-white/10 hover:-translate-y-3 hover:scale-[1.02] hover:shadow-2xl ${glowClass}`}>
                
                {/* Top Glow Border */}
                <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl bg-gradient-to-r ${topBorderClass} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                {/* Step Header */}
                <div className="flex items-center gap-4 mb-6">
                  <span className={`text-6xl font-extrabold bg-gradient-to-br ${gradientClass} bg-clip-text text-transparent leading-none group-hover:scale-110 transition-transform duration-300`} data-testid={`step-number-${index + 1}`}>
                    {step.number}
                  </span>
                  <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-lg group-hover:rotate-6 group-hover:scale-110 transition-all duration-300`} data-testid={`step-icon-${index + 1}`}>
                    <step.icon className="w-8 h-8 text-white group-hover:scale-125 transition-transform duration-300" />
                  </div>
                </div>

                <h3 className={`text-2xl font-bold text-white mb-4 ${textHoverClass} transition-colors duration-300`} data-testid={`step-title-${index + 1}`}>
                  {step.title}
                </h3>

                <p className="text-slate-300 leading-relaxed mb-6" data-testid={`step-description-${index + 1}`}>
                  {step.description}
                </p>

                {/* Highlights */}
                <div className="space-y-3 mb-6">
                  {step.highlights.map((highlight, hIndex) => (
                    <div key={hIndex} className="flex items-center gap-3 text-sm" data-testid={`step-${index + 1}-highlight-${hIndex + 1}`}>
                      <highlight.icon className={`w-4 h-4 ${iconColorClass} group-hover:scale-125 transition-transform duration-300`} />
                      <span className="text-slate-400">{highlight.text}</span>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                  {step.stats.map((stat, sIndex) => (
                    <div key={sIndex} data-testid={`step-${index + 1}-stat-${sIndex + 1}`}>
                      <div className={`text-2xl font-bold ${iconColorClass} mb-1`}>
                        {stat.value}
                      </div>
                      <div className="text-xs text-slate-500 uppercase tracking-wide">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flow Arrow (not on last item on desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-20">
                  <ArrowRight className={`w-8 h-8 ${activeAudience === "primer" ? "text-blue-500/40" : "text-emerald-500/40"}`} />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Explainer Video Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          className="mb-16"
        >
          <div className="grid md:grid-cols-2 gap-8 items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12">
            
            {/* Video Placeholder */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 group cursor-pointer hover:scale-[1.02] transition-transform duration-300" data-testid="video-placeholder">
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`} data-testid="button-play-video">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2" data-testid="text-video-title">See How It Works</h3>
                <p className="text-slate-400 text-sm" data-testid="text-video-subtitle">Watch our 2-minute explainer video</p>
              </div>
            </div>

            {/* Video Info */}
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4" data-testid="heading-video-info">
                Understanding the Regenerative Capital Flow
              </h3>
              <p className="text-slate-300 leading-relaxed mb-6" data-testid="text-video-description">
                Watch how capital moves from Primers to farms, gets deployed for regenerative 
                agriculture, and creates tradeable tokens for Regenerators—all tracked 
                transparently on the blockchain.
              </p>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2 text-slate-400" data-testid="stat-video-duration">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm">2 min watch</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400" data-testid="stat-video-views">
                  <Eye className="w-5 h-5" />
                  <span className="text-sm">10K+ views</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400" data-testid="stat-video-rating">
                  <ThumbsUp className="w-5 h-5" />
                  <span className="text-sm">98% helpful</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            size="lg"
            className={`bg-gradient-to-r ${gradientClass} hover:opacity-90 text-white px-8 py-6 text-lg font-semibold shadow-lg hover:-translate-y-1 transition-all duration-300 group`}
            onClick={() => setLocation("/register")}
            data-testid="button-start-journey"
          >
            <span>Start Your Journey</span>
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/20 hover:bg-white/10 text-white px-8 py-6 text-lg font-semibold hover:-translate-y-1 transition-all duration-300 group"
            onClick={() => setLocation("/register")}
            data-testid="button-view-projects"
          >
            <span>View Live Projects</span>
            <ExternalLink className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>

      </div>
    </section>
    </MotionConfig>
  );
}
