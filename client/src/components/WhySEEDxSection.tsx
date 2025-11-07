import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, Box, Satellite, Leaf, HandCoins, Users, Eye, DollarSign, CheckCircle2, XCircle, ArrowRight, BookOpen, TrendingUp, Globe, Tractor, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";

export default function WhySEEDxSection() {
  const shouldReduceMotion = useReducedMotion();
  const [, setLocation] = useLocation();

  const fadeInUp = {
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
  };

  const benefits = [
    {
      icon: ShieldCheck,
      title: "Rigorously Verified",
      description: "Every farm undergoes comprehensive due diligence including legal review, financial audits, site visits, and environmental assessments before listing.",
      features: [
        "Legal Documentation Review",
        "Financial Audit & Analysis",
        "On-Site Physical Verification",
        "Environmental Impact Assessment"
      ],
      stat: { number: "100%", label: "Projects Verified" },
      gradient: "from-emerald-500 to-emerald-600",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
      delay: 0.1
    },
    {
      icon: Box,
      title: "Full Transparency",
      description: "All transactions, fund allocations, and milestone completions are recorded on-chain. Track every dollar from funding to farm in real-time.",
      features: [
        "On-Chain Transaction Records",
        "Real-Time Fund Tracking",
        "Milestone-Based Releases",
        "Immutable Audit Trail"
      ],
      stat: { number: "$2.5M+", label: "Tracked On-Chain" },
      gradient: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      delay: 0.2
    },
    {
      icon: Satellite,
      title: "Live Farm Monitoring",
      description: "IoT sensors, satellite imagery, and regular photo updates give you unprecedented visibility into farm operations and progress.",
      features: [
        "IoT Sensor Data (Soil, Weather)",
        "Satellite Imagery Analysis",
        "Weekly Photo Updates",
        "Farmer Progress Reports"
      ],
      stat: { number: "24/7", label: "Monitoring Active" },
      gradient: "from-violet-500 to-violet-600",
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-500",
      delay: 0.3
    },
    {
      icon: Leaf,
      title: "Regenerative Impact",
      description: "Every project prioritizes soil health, biodiversity, and community development. Participate in agriculture that heals the planet.",
      features: [
        "Soil Carbon Sequestration",
        "Biodiversity Enhancement",
        "Local Job Creation",
        "Community Development"
      ],
      stat: { number: "500+", label: "Jobs Created" },
      gradient: "from-emerald-500 to-emerald-600",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
      delay: 0.4
    },
    {
      icon: HandCoins,
      title: "Low Barriers to Entry",
      description: "Participate in agricultural projects with amounts that work for you. No minimum thresholds, no complex paperwork.",
      features: [
        "Flexible Participation Amounts",
        "Simple Onboarding Process",
        "Multiple Payment Options",
        "User-Friendly Dashboard"
      ],
      stat: { number: "5 min", label: "To Get Started" },
      gradient: "from-amber-500 to-amber-600",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
      delay: 0.5
    },
    {
      icon: Users,
      title: "Expert Guidance",
      description: "Our team of agricultural experts, financial analysts, and blockchain specialists support you every step of the way.",
      features: [
        "Agricultural Expert Team",
        "Financial Analysis Support",
        "24/7 Customer Service",
        "Educational Resources"
      ],
      stat: { number: "98%", label: "Satisfaction Rate" },
      gradient: "from-pink-500 to-pink-600",
      iconBg: "bg-pink-500/10",
      iconColor: "text-pink-500",
      delay: 0.6
    }
  ];

  const comparisonRows = [
    {
      icon: Eye,
      name: "Transparency",
      seedx: "Full on-chain visibility",
      traditional: "Limited reporting"
    },
    {
      icon: DollarSign,
      name: "Minimum Amount",
      seedx: "Flexible amounts",
      traditional: "$50K+ typically"
    },
    {
      icon: ShieldCheck,
      name: "Project Verification",
      seedx: "Comprehensive due diligence",
      traditional: "Varies widely"
    },
    {
      icon: Satellite,
      name: "Real-Time Monitoring",
      seedx: "IoT + Satellite tracking",
      traditional: "Quarterly reports only"
    },
    {
      icon: TrendingUp,
      name: "Token Access",
      seedx: "Utility tokens available",
      traditional: "Locked until maturity"
    },
    {
      icon: Leaf,
      name: "Impact Metrics",
      seedx: "Live environmental data",
      traditional: "Rarely tracked"
    }
  ];

  const trustStats = [
    { icon: Users, number: "1,200+", label: "Active Participants" },
    { icon: Globe, number: "15", label: "African Countries" },
    { icon: Tractor, number: "50+", label: "Active Farms" },
    { icon: Sprout, number: "1,200+", label: "Hectares Under Management" }
  ];

  return (
    <section className="relative py-20 md:py-28 px-4 overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(37,99,235,0.08)_0%,transparent_50%),radial-gradient(circle_at_80%_70%,rgba(16,185,129,0.08)_0%,transparent_50%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16 md:mb-20"
          {...fadeInUp}
        >
          <div 
            className="inline-block px-5 py-2 mb-6 rounded-full border text-xs font-bold tracking-wider uppercase bg-blue-500/10 border-blue-500/30 text-blue-500"
            data-testid="label-seedx-advantage"
          >
            THE SEEDX ADVANTAGE
          </div>
          <h2 
            className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent"
            data-testid="heading-why-choose-seedx"
          >
            Why Choose SEEDx?
          </h2>
          <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto">
            The first regenerative capital exchange built for African agriculture. 
            Transparent, verified, and designed for impact.
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-16 md:mb-20">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.6, 
                  delay: benefit.delay,
                  ease: [0.4, 0, 0.2, 1] 
                }}
              >
                <Card 
                  className="h-full p-8 bg-white/5 backdrop-blur-sm border-white/10 hover-elevate transition-all duration-500 group"
                  data-testid={`card-benefit-${benefit.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {/* Icon */}
                  <div className="relative w-20 h-20 mb-7">
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${benefit.gradient} opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500`} />
                    <div className={`relative w-20 h-20 rounded-2xl ${benefit.iconBg} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                      <Icon className={`w-8 h-8 ${benefit.iconColor}`} />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 
                    className="text-2xl font-bold text-white mb-4"
                    data-testid={`heading-${benefit.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {benefit.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-300 mb-7 leading-relaxed">
                    {benefit.description}
                  </p>

                  {/* Features List */}
                  <div className="space-y-3 mb-7">
                    {benefit.features.map((feature, featureIndex) => (
                      <div 
                        key={featureIndex} 
                        className="flex items-start gap-3"
                        data-testid={`feature-${benefit.title.toLowerCase().replace(/\s+/g, '-')}-${featureIndex}`}
                      >
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-400">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Stat */}
                  <div className="pt-6 border-t border-white/10 text-center">
                    <div 
                      className="text-3xl font-bold bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent mb-1"
                      data-testid={`stat-number-${benefit.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {benefit.stat.number}
                    </div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                      {benefit.stat.label}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <motion.div
          className="mb-16 md:mb-20"
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: [0.4, 0, 0.2, 1] }}
        >
          <h3 
            className="text-3xl md:text-4xl font-bold text-center mb-10 text-white"
            data-testid="heading-comparison-table"
          >
            SEEDx vs Traditional Agriculture Funding
          </h3>

          <Card className="overflow-hidden bg-white/5 backdrop-blur-sm border-white/10">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="p-4 text-left"></th>
                    <th className="p-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-semibold">
                        <span>SEEDx</span>
                      </div>
                    </th>
                    <th className="p-4 text-slate-400 font-semibold">Traditional Methods</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, index) => {
                    const Icon = row.icon;
                    return (
                      <tr 
                        key={row.name} 
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        data-testid={`comparison-row-${row.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3 text-white font-medium">
                            <Icon className="w-5 h-5 text-slate-400" />
                            <span>{row.name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2 text-emerald-400">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm">{row.seedx}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2 text-slate-500">
                            <XCircle className="w-5 h-5" />
                            <span className="text-sm">{row.traditional}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4 p-4">
              {comparisonRows.map((row, index) => {
                const Icon = row.icon;
                return (
                  <div 
                    key={row.name} 
                    className="p-4 rounded-lg bg-white/5 border border-white/10"
                    data-testid={`comparison-card-${row.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center gap-3 text-white font-medium mb-4">
                      <Icon className="w-5 h-5 text-slate-400" />
                      <span>{row.name}</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-500 text-xs font-semibold">SEEDx</div>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm text-slate-300">{row.seedx}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded bg-slate-700/50 text-slate-400 text-xs font-semibold">Traditional</div>
                        <XCircle className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-400">{row.traditional}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16 md:mb-20"
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          {trustStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={stat.label}
                className="p-6 text-center bg-white/5 backdrop-blur-sm border-white/10 hover-elevate"
                data-testid={`trust-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-10 h-10 mx-auto mb-4 text-emerald-500" />
                <div className="text-3xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                  {stat.label}
                </div>
              </Card>
            );
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9, ease: [0.4, 0, 0.2, 1] }}
        >
          <Card className="p-10 md:p-16 text-center bg-white/5 backdrop-blur-sm border-white/10">
            <h3 
              className="text-3xl md:text-4xl font-bold text-white mb-4"
              data-testid="heading-cta-ready"
            >
              Ready to Make an Impact?
            </h3>
            <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
              Join thousands of participants funding the future of African agriculture
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/30"
                onClick={() => setLocation('/register')}
                data-testid="button-get-started-cta"
              >
                <span>Get Started</span>
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-blue-500/30 text-blue-500"
                onClick={() => setLocation('/register')}
                data-testid="button-learn-more-cta"
              >
                <span>Learn More</span>
                <BookOpen className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
