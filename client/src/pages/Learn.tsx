import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Sprout,
  TrendingDown,
  Eye,
  Users,
  Shield,
  Scale,
  CheckCircle,
  ArrowRight,
  Leaf,
  Zap,
  Droplets,
  Building,
  GraduationCap,
  Heart,
  Home,
  Globe,
  Target,
  BarChart3,
  Lock,
  Clock,
  Workflow
} from "lucide-react";

export default function Learn() {
  const shouldReduceMotion = useReducedMotion();

  const fadeInUp = {
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: shouldReduceMotion ? 0 : 0.8, ease: "easeOut" }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[10%] right-[10%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] left-[10%] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <motion.div {...fadeInUp}>
            <div className="inline-block px-5 py-2 mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
              <span className="text-emerald-400 text-xs font-bold tracking-[0.2em] uppercase">
                Education Center
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent tracking-tight" data-testid="text-hero-title">
              Understanding Regenerative Capital
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-4xl mx-auto leading-relaxed" data-testid="text-hero-description">
              Learn how SEED & SEEDx transform one-time grants into perpetual impact engines—financing verified social impact projects across agriculture, renewable energy, water, education, healthcare, and beyond.
            </p>
          </motion.div>
        </div>
      </section>

      {/* What is SEED Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent" data-testid="text-what-is-seed">
              What is SEED & SEEDx?
            </h2>
            <p className="text-lg text-slate-300 mb-4">
              <strong className="text-white">SEED (Sustainable Ecosystem for Economic Development)</strong> is a regenerative capital ecosystem that transforms how impact capital flows to communities and projects across Africa and beyond.
            </p>
            <p className="text-lg text-slate-300 mb-12">
              <strong className="text-white">SEEDx</strong> is the Regenerative Capital Exchange (RCX) platform—the technology that makes SEED's vision real. Together, they create a system where grants don't disappear after one use, but regenerate perpetually to finance project after project.
            </p>

            {/* Innovation Box */}
            <div className="relative bg-gradient-to-br from-emerald-950/40 to-emerald-900/20 backdrop-blur-md border border-emerald-500/30 rounded-3xl p-8 md:p-12 overflow-hidden">
              {/* Glow effect */}
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
              
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-8">The Core Innovation</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { icon: CheckCircle, title: "Blockchain Tokenization", desc: "Real-world assets become tradeable digital tokens with transparent ownership" },
                  { icon: Workflow, title: "Liquidity Pool Mechanics", desc: "Patient capital pools together to de-risk projects and create recyclable capital" },
                  { icon: Users, title: "Cooperative Ownership", desc: "Democratic governance ensures communities and investors co-own the platform" },
                  { icon: Target, title: "AI-Powered Verification", desc: "Automated impact measurement provides real-time accountability" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 group" data-testid={`innovation-${idx}`}>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <strong className="text-white text-lg block mb-1">{item.title}</strong>
                      <span className="text-slate-400">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-lg text-slate-300 mt-8 pt-8 border-t border-emerald-500/20">
                <strong className="text-white">Result:</strong> One-time grants become evergreen capital that continuously finances verified social impact projects—achieving 5-10x capital efficiency while building community wealth and environmental regeneration.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent" data-testid="text-problem-title">
              The Problem We're Solving
            </h2>
            <p className="text-lg text-slate-400 mb-12">
              Traditional impact capital is broken. Over $50 billion flows into Africa annually through CSR and philanthropy, yet less than 15% achieves measurable, sustained impact. Here's why:
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: TrendingDown, title: "One-Time Deployment", desc: "Grants are spent once and gone forever. No recycling, no compounding, no regeneration. Each new project requires entirely new funding." },
                { icon: Eye, title: "Zero Transparency", desc: "Impact reports arrive 6-12 months late, data is self-reported and unverified. Donors rarely see real-time, verified outcomes." },
                { icon: Users, title: "Beneficiary Exclusion", desc: "Communities and impact-driven individuals lack access to patient capital. No collateral, no credit history, too small for traditional finance." },
                { icon: Lock, title: "No Market Access", desc: "Millions want to invest in verified impact projects but have no accessible, transparent entry point. Impact assets remain illiquid and inaccessible." },
                { icon: Shield, title: "Risk Transfer", desc: "Development finance often comes with 8-15% interest rates. One setback creates a debt spiral. Communities bear all downside risk." },
                { icon: Scale, title: "Scale Paradox", desc: "Pilot projects succeed, but scaling requires proportional capital increase. Without regeneration, scale remains a fantasy." }
              ].map((problem, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                >
                  <div className="relative h-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 transition-all duration-300 hover:bg-white/10 hover:-translate-y-2 hover:shadow-2xl hover:shadow-red-600/10 group" data-testid={`problem-card-${idx}`}>
                    <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-transparent via-red-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <problem.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-red-400 transition-colors">{problem.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{problem.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent" data-testid="text-how-it-works">
              How the Regenerative Cycle Works
            </h2>
            <p className="text-lg text-slate-400 mb-12">
              SEED & SEEDx create a perpetual cycle where capital regenerates, projects thrive, and impact compounds across generations.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { num: 1, title: "Primers Fund Liquidity Pools", desc: "Philanthropists, CSR departments, and impact investors deposit patient capital into themed liquidity pools (agriculture, energy, water, etc.)." },
                { num: 2, title: "Pools De-Risk Projects", desc: "Liquidity pools invest in pre-vetted regenerative projects, absorbing early-stage risk and providing patient capital breathing room." },
                { num: 3, title: "Projects Get Tokenized", desc: "Verified projects are tokenized on the blockchain—creating tradeable digital assets backed by real farms, solar installations, water systems, and more." },
                { num: 4, title: "Regenerators Buy Tokens", desc: "Impact investors (Regenerators) purchase tokens, gaining fractional ownership in de-risked projects. Capital flows back to liquidity pools." },
                { num: 5, title: "Projects Generate Returns", desc: "As projects succeed (harvest sales, energy generation, water subscriptions), returns flow to token holders and liquidity pools." },
                { num: 6, title: "Capital Regenerates", desc: "Liquidity pools use replenished capital to fund new projects. The cycle repeats perpetually—same capital finances 5-10+ projects over time." }
              ].map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                >
                  <div className="relative h-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center transition-all duration-300 hover:bg-white/10 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-600/10 group" data-testid={`step-${idx}`}>
                    <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                      {step.num}
                    </div>
                    <h4 className="text-xl font-semibold text-white mb-4 group-hover:text-emerald-400 transition-colors">{step.title}</h4>
                    <p className="text-slate-400 leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Who Participates Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent" data-testid="text-participants">
              Who Participates in the Ecosystem?
            </h2>
            <p className="text-lg text-slate-400 mb-12">
              SEED & SEEDx bring together three key stakeholder groups, each playing a vital role in the regenerative capital cycle.
            </p>

            <div className="grid lg:grid-cols-3 gap-8">
              {[
                {
                  title: "Primers",
                  subtitle: "Patient Capital Partners",
                  who: "Philanthropists, family foundations, corporate CSR departments, development finance institutions, and impact-focused family offices.",
                  benefits: [
                    "5-10x capital efficiency through perpetual recycling",
                    "Real-time, AI-verified impact data",
                    "Control over fund deployment and sector allocation",
                    "Legacy impact that compounds annually",
                    "Transparent, blockchain-verified reporting"
                  ],
                  active: true
                },
                {
                  title: "Regenerators",
                  subtitle: "Cooperative Members & Impact Investors",
                  who: "African diaspora professionals, local middle class, farmer cooperatives, impact funds, and values-driven investors globally.",
                  benefits: [
                    "Access to de-risked impact investment opportunities",
                    "Tokens backed by verified real-world assets",
                    "Democratic governance and cooperative ownership",
                    "Target yields of 8-20% annually",
                    "Liquidity through secondary token trading",
                    "Direct connection to transformative projects"
                  ],
                  active: true
                },
                {
                  title: "Project Owners",
                  subtitle: "Coming Soon",
                  who: "Social enterprises, cooperatives, community-based organizations, and impact ventures across agriculture, energy, water, education, healthcare, and infrastructure.",
                  benefits: [
                    "Patient capital at favorable terms",
                    "No predatory debt or extractive finance",
                    "Cooperative member support and engagement",
                    "Access to AI verification and technology",
                    "Transparent impact measurement",
                    "Pathway to sustainable, scalable operations"
                  ],
                  active: false
                }
              ].map((stakeholder, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                >
                  <div className={`relative h-full ${stakeholder.active ? 'bg-white/5' : 'bg-white/[0.02]'} backdrop-blur-md border ${stakeholder.active ? 'border-emerald-500/30' : 'border-white/10'} rounded-2xl p-8 transition-all duration-300 hover:bg-white/10 hover:-translate-y-2 hover:shadow-2xl ${stakeholder.active ? 'hover:shadow-emerald-600/10' : ''}`} data-testid={`card-${idx === 0 ? 'primers' : idx === 1 ? 'regenerators' : 'project-owners'}`}>
                    <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-transparent ${stakeholder.active ? 'via-emerald-500/60' : 'via-slate-500/30'} to-transparent`} />
                    
                    <h4 className="text-2xl font-bold text-white mb-2">{stakeholder.title}</h4>
                    <div className="mb-4">
                      {stakeholder.active ? (
                        <span className="text-sm text-emerald-400 italic">{stakeholder.subtitle}</span>
                      ) : (
                        <Badge variant="secondary" className="text-xs">{stakeholder.subtitle}</Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-400 mb-6">
                      <strong className="text-white">Who they are:</strong> {stakeholder.who}
                    </p>
                    
                    <div>
                      <p className="text-sm font-semibold text-white mb-3">What they get:</p>
                      <ul className="space-y-2">
                        {stakeholder.benefits.map((benefit, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-2 text-sm text-slate-400">
                            <ArrowRight className={`w-4 h-4 ${stakeholder.active ? 'text-emerald-400' : 'text-slate-600'} flex-shrink-0 mt-0.5`} />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Impact Metrics (Compact Version) */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-12 bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent text-center" data-testid="text-impact">
              Our Impact Vision (2025-2030)
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {[
                { value: "100K+", label: "Beneficiaries Across Sectors" },
                { value: "$500M+", label: "Regenerating Capital" },
                { value: "10M", label: "Tons CO₂ Reduced/Sequestered" },
                { value: "1M+", label: "People with Improved Access" }
              ].map((metric, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                >
                  <div className="relative bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-8 text-center overflow-hidden group hover:scale-105 transition-transform duration-300" data-testid={`metric-${idx}`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative">
                      <div className="text-4xl md:text-5xl font-bold text-white mb-2">{metric.value}</div>
                      <div className="text-sm text-emerald-100 opacity-90">{metric.label}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative bg-gradient-to-br from-emerald-950/60 to-blue-950/40 backdrop-blur-md border border-white/10 rounded-3xl p-12 md:p-16 text-center overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6" data-testid="text-cta">
              Ready to Join the Regenerative Capital Movement?
            </h2>
            <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
              Whether you're a philanthropist looking to maximize impact, an investor seeking verified returns, or simply curious about how regenerative finance works—there's a place for you in the SEED ecosystem.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-emerald-700 hover:opacity-90 text-white px-8 py-6 text-lg font-semibold shadow-lg hover:-translate-y-1 transition-all duration-300" data-testid="button-get-started">
                  Get Started Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/10 text-white px-8 py-6 text-lg font-semibold hover:-translate-y-1 transition-all duration-300" data-testid="button-learn-more">
                  Learn About Our Story
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
