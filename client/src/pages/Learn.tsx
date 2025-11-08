import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: shouldReduceMotion ? 0 : 0.6 }
  };

  const staggerChildren = {
    animate: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div 
          className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)'
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <motion.div {...fadeInUp}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6" data-testid="text-hero-title">
              Understanding Regenerative Capital
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed" data-testid="text-hero-description">
              Learn how SEED & SEEDx transform one-time grants into perpetual impact engines—financing verified social impact projects across agriculture, renewable energy, water, education, healthcare, and beyond.
            </p>
          </motion.div>
        </div>
      </section>

      {/* What is SEED Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground" data-testid="text-what-is-seed">
              What is SEED & SEEDx?
            </h2>
            <p className="text-lg text-muted-foreground mb-4">
              <strong className="text-foreground">SEED (Sustainable Ecosystem for Economic Development)</strong> is a regenerative capital ecosystem that transforms how impact capital flows to communities and projects across Africa and beyond.
            </p>
            <p className="text-lg text-muted-foreground mb-8">
              <strong className="text-foreground">SEEDx</strong> is the Regenerative Capital Exchange (RCX) platform—the technology that makes SEED's vision real. Together, they create a system where grants don't disappear after one use, but regenerate perpetually to finance project after project.
            </p>

            <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800">
              <CardHeader>
                <CardTitle className="text-2xl text-emerald-900 dark:text-emerald-100">The Core Innovation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { icon: CheckCircle, title: "Blockchain Tokenization", desc: "Real-world assets become tradeable digital tokens with transparent ownership" },
                  { icon: Workflow, title: "Liquidity Pool Mechanics", desc: "Patient capital pools together to de-risk projects and create recyclable capital" },
                  { icon: Users, title: "Cooperative Ownership", desc: "Democratic governance ensures communities and investors co-own the platform" },
                  { icon: Target, title: "AI-Powered Verification", desc: "Automated impact measurement provides real-time accountability" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3" data-testid={`innovation-${idx}`}>
                    <item.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">{item.title}:</strong>{" "}
                      <span className="text-muted-foreground">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <p className="text-lg text-muted-foreground mt-8">
              <strong className="text-foreground">Result:</strong> One-time grants become evergreen capital that continuously finances verified social impact projects—achieving 5-10x capital efficiency while building community wealth and environmental regeneration.
            </p>
          </motion.div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground" data-testid="text-problem-title">
              The Problem We're Solving
            </h2>
            <p className="text-lg text-muted-foreground mb-12">
              Traditional impact capital is broken. Over $50 billion flows into Africa annually through CSR and philanthropy, yet less than 15% achieves measurable, sustained impact. Here's why:
            </p>

            <motion.div 
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={staggerChildren}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {[
                { icon: TrendingDown, title: "One-Time Deployment", desc: "Grants are spent once and gone forever. No recycling, no compounding, no regeneration. Each new project requires entirely new funding." },
                { icon: Eye, title: "Zero Transparency", desc: "Impact reports arrive 6-12 months late, data is self-reported and unverified. Donors rarely see real-time, verified outcomes." },
                { icon: Users, title: "Beneficiary Exclusion", desc: "Communities and impact-driven individuals lack access to patient capital. No collateral, no credit history, too small for traditional finance." },
                { icon: Lock, title: "No Market Access", desc: "Millions want to invest in verified impact projects but have no accessible, transparent entry point. Impact assets remain illiquid and inaccessible." },
                { icon: Shield, title: "Risk Transfer", desc: "Development finance often comes with 8-15% interest rates. One setback creates a debt spiral. Communities bear all downside risk." },
                { icon: Scale, title: "Scale Paradox", desc: "Pilot projects succeed, but scaling requires proportional capital increase. Without regeneration, scale remains a fantasy." }
              ].map((problem, idx) => (
                <motion.div key={idx} variants={fadeInUp}>
                  <Card className="h-full border-l-4 border-l-destructive hover-elevate" data-testid={`problem-card-${idx}`}>
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <problem.icon className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
                        <CardTitle className="text-xl text-destructive">{problem.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{problem.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground" data-testid="text-how-it-works">
              How the Regenerative Cycle Works
            </h2>
            <p className="text-lg text-muted-foreground mb-12">
              SEED & SEEDx create a perpetual cycle where capital regenerates, projects thrive, and impact compounds across generations.
            </p>

            <motion.div 
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={staggerChildren}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {[
                { num: 1, title: "Primers Fund Liquidity Pools", desc: "Philanthropists, CSR departments, and impact investors deposit patient capital into themed liquidity pools (agriculture, energy, water, etc.)." },
                { num: 2, title: "Pools De-Risk Projects", desc: "Liquidity pools invest in pre-vetted regenerative projects, absorbing early-stage risk and providing patient capital breathing room." },
                { num: 3, title: "Projects Get Tokenized", desc: "Verified projects are tokenized on the blockchain—creating tradeable digital assets backed by real farms, solar installations, water systems, and more." },
                { num: 4, title: "Regenerators Buy Tokens", desc: "Impact investors (Regenerators) purchase tokens, gaining fractional ownership in de-risked projects. Capital flows back to liquidity pools." },
                { num: 5, title: "Projects Generate Returns", desc: "As projects succeed (harvest sales, energy generation, water subscriptions), returns flow to token holders and liquidity pools." },
                { num: 6, title: "Capital Regenerates", desc: "Liquidity pools use replenished capital to fund new projects. The cycle repeats perpetually—same capital finances 5-10+ projects over time." }
              ].map((step, idx) => (
                <motion.div key={idx} variants={fadeInUp}>
                  <Card className="h-full text-center hover-elevate" data-testid={`step-${idx}`}>
                    <CardContent className="pt-6">
                      <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                        {step.num}
                      </div>
                      <h4 className="text-xl font-semibold mb-3 text-foreground">{step.title}</h4>
                      <p className="text-muted-foreground">{step.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Who Participates Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground" data-testid="text-participants">
              Who Participates in the Ecosystem?
            </h2>
            <p className="text-lg text-muted-foreground mb-12">
              SEED & SEEDx bring together three key stakeholder groups, each playing a vital role in the regenerative capital cycle.
            </p>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Primers */}
              <Card className="border-t-4 border-t-primary hover-elevate" data-testid="card-primers">
                <CardHeader>
                  <CardTitle className="text-2xl">Primers</CardTitle>
                  <CardDescription className="text-base italic">Patient Capital Partners</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Who they are:</strong> Philanthropists, family foundations, corporate CSR departments, development finance institutions, and impact-focused family offices.
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">What they get:</p>
                    <ul className="space-y-2">
                      {[
                        "5-10x capital efficiency through perpetual recycling",
                        "Real-time, AI-verified impact data",
                        "Control over fund deployment and sector allocation",
                        "Legacy impact that compounds annually",
                        "Transparent, blockchain-verified reporting"
                      ].map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ArrowRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Regenerators */}
              <Card className="border-t-4 border-t-primary hover-elevate" data-testid="card-regenerators">
                <CardHeader>
                  <CardTitle className="text-2xl">Regenerators</CardTitle>
                  <CardDescription className="text-base italic">Cooperative Members & Impact Investors</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Who they are:</strong> African diaspora professionals, local middle class, farmer cooperatives, impact funds, and values-driven investors globally.
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">What they get:</p>
                    <ul className="space-y-2">
                      {[
                        "Access to de-risked impact investment opportunities",
                        "Tokens backed by verified real-world assets",
                        "Democratic governance and cooperative ownership",
                        "Target yields of 8-20% annually",
                        "Liquidity through secondary token trading",
                        "Direct connection to transformative projects"
                      ].map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ArrowRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Project Owners */}
              <Card className="border-t-4 border-t-muted hover-elevate" data-testid="card-project-owners">
                <CardHeader>
                  <CardTitle className="text-2xl">Project Owners</CardTitle>
                  <CardDescription className="text-base italic">
                    <Badge variant="secondary">Coming Soon</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Who they are:</strong> Social enterprises, cooperatives, community-based organizations, and impact ventures across agriculture, energy, water, education, healthcare, and infrastructure.
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">What they get:</p>
                    <ul className="space-y-2">
                      {[
                        "Patient capital at favorable terms",
                        "No predatory debt or extractive finance",
                        "Cooperative member support and engagement",
                        "Access to AI verification and technology",
                        "Transparent impact measurement",
                        "Pathway to sustainable, scalable operations"
                      ].map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground" data-testid="text-impact">
              Measuring Impact That Matters
            </h2>
            <p className="text-lg text-muted-foreground mb-12">
              Every project on SEEDx is verified for real-world impact across environmental, social, and economic dimensions. We track what matters—and prove it with data.
            </p>

            <h3 className="text-2xl font-bold mb-8 text-foreground">Our Impact Vision (2025-2030)</h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {[
                { value: "100K+", label: "Beneficiaries Across Sectors" },
                { value: "$500M+", label: "Regenerating Capital" },
                { value: "10M", label: "Tons CO₂ Reduced/Sequestered" },
                { value: "1M+", label: "People with Improved Access" }
              ].map((metric, idx) => (
                <Card key={idx} className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-center" data-testid={`metric-${idx}`}>
                  <CardContent className="pt-8 pb-6">
                    <div className="text-4xl md:text-5xl font-bold mb-2">{metric.value}</div>
                    <div className="text-sm opacity-90">{metric.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <h3 className="text-2xl font-bold mb-6 text-foreground">Impact Metrics We Track</h3>
            <p className="text-lg text-muted-foreground mb-8">
              Aligned with the UN Sustainable Development Goals (SDGs), we measure impact across multiple dimensions:
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: BarChart3, title: "Economic Impact", desc: "Jobs created, income uplift, revenue generated, wealth building, fair wages, and economic mobility." },
                { icon: Leaf, title: "Environmental Impact", desc: "Carbon sequestered, land restored, biodiversity enhanced, water efficiency, emissions reduced." },
                { icon: Heart, title: "Social Impact", desc: "Energy access, clean water access, educational outcomes, healthcare improvements, community ownership." },
                { icon: Users, title: "Governance Impact", desc: "Democratic participation, cooperative membership, transparent decision-making, community voice." }
              ].map((metric, idx) => (
                <Card key={idx} className="border-2 hover-elevate" data-testid={`impact-dimension-${idx}`}>
                  <CardHeader>
                    <metric.icon className="w-8 h-8 text-primary mb-2" />
                    <CardTitle className="text-lg">{metric.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{metric.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground" data-testid="text-technology">
              Technology: Blockchain + AI for Transparency
            </h2>
            <p className="text-lg text-muted-foreground mb-12">
              SEED & SEEDx leverage cutting-edge technology to deliver transparency, security, and verified impact at scale.
            </p>

            <h3 className="text-2xl font-bold mb-6 text-foreground">Blockchain Infrastructure (Stellar Network)</h3>
            <p className="text-lg text-muted-foreground mb-8">
              We use the Stellar blockchain for tokenization and transactions because it offers:
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {[
                { icon: Clock, title: "Low Cost", desc: "$0.00001 per transaction—making micro-investments economically viable." },
                { icon: Zap, title: "Speed", desc: "3-5 second transaction finality—instant token purchases and transfers." },
                { icon: Eye, title: "Transparency", desc: "Every transaction recorded on an immutable public ledger—full audit trail." },
                { icon: Shield, title: "Security", desc: "Multi-signature wallets, encryption, and battle-tested infrastructure since 2014." }
              ].map((feature, idx) => (
                <Card key={idx} className="border-2 hover-elevate" data-testid={`blockchain-feature-${idx}`}>
                  <CardHeader>
                    <feature.icon className="w-8 h-8 text-primary mb-2" />
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <h3 className="text-2xl font-bold mb-6 text-foreground">AI-Powered Verification</h3>
            <p className="text-lg text-muted-foreground mb-8">
              We combine blockchain transparency with AI-driven impact verification:
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Globe, title: "Satellite Monitoring", desc: "Track land use, vegetation health, infrastructure development, and environmental changes in real-time." },
                { icon: Eye, title: "Computer Vision", desc: "Verify project progress through automated image analysis—construction stages, crop growth, asset existence." },
                { icon: Target, title: "IoT Sensors", desc: "Real-time data from soil sensors, weather stations, energy meters, and water flow monitors." },
                { icon: BarChart3, title: "Predictive Analytics", desc: "Machine learning models forecast project performance, assess risk, and detect anomalies." }
              ].map((feature, idx) => (
                <Card key={idx} className="border-2 hover-elevate" data-testid={`ai-feature-${idx}`}>
                  <CardHeader>
                    <feature.icon className="w-8 h-8 text-primary mb-2" />
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sectors Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground" data-testid="text-sectors">
              Sectors We Serve
            </h2>
            <p className="text-lg text-muted-foreground mb-12">
              SEED is sector-agnostic by design. We can tokenize and finance any verified social impact project. Our regenerative capital model works universally across:
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { icon: Sprout, title: "Agriculture", desc: "Regenerative farms, cooperatives, processing infrastructure, value chains—from cassava to cocoa." },
                { icon: Zap, title: "Renewable Energy", desc: "Solar mini-grids, home systems, biogas, biomass—bringing clean energy to off-grid communities." },
                { icon: Droplets, title: "Water Infrastructure", desc: "Boreholes, purification systems, irrigation—delivering clean water and sanitation access." },
                { icon: Building, title: "Sustainable Mining", desc: "Formalizing artisanal mining, processing infrastructure, ethical sourcing, land reclamation." },
                { icon: GraduationCap, title: "Education", desc: "Vocational training, school infrastructure, EdTech platforms—closing skills gaps and expanding access." },
                { icon: Heart, title: "Healthcare", desc: "Primary clinics, medical equipment, health insurance cooperatives—improving health outcomes." },
                { icon: Home, title: "Real Estate", desc: "Affordable housing, cooperative housing, community development—dignified living spaces." },
                { icon: Globe, title: "Infrastructure", desc: "Roads, bridges, community facilities—building the foundations for thriving communities." }
              ].map((sector, idx) => (
                <Card key={idx} className="border-2 hover-elevate" data-testid={`sector-${idx}`}>
                  <CardHeader>
                    <sector.icon className="w-8 h-8 text-primary mb-2" />
                    <CardTitle className="text-lg">{sector.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{sector.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="text-lg text-muted-foreground">
              <strong className="text-foreground">Why launch with agriculture?</strong> Strategic convenience, not identity. The founder's 50-hectare cassava farm provides a low-risk, controlled MVP environment to prove the regenerative capital model before expanding across all sectors.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-foreground text-center" data-testid="text-faq">
              Frequently Asked Questions
            </h2>

            <div className="space-y-6">
              {[
                {
                  q: "Do I need to understand blockchain or cryptocurrency to participate?",
                  a: "No. We've designed SEEDx to be accessible to everyone, regardless of technical knowledge. The blockchain works behind the scenes—you interact with a simple, user-friendly web platform. We handle the complexity so you can focus on impact."
                },
                {
                  q: "What returns can Regenerators expect?",
                  a: "Target yields range from 8-20% annually, depending on project type and risk profile. Returns come from real project revenue (harvest sales, energy generation, water subscriptions, etc.)—not speculation. Past performance doesn't guarantee future results, and all investments carry risk."
                },
                {
                  q: "How is impact verified?",
                  a: "We use a combination of AI-powered tools (satellite imagery, computer vision, IoT sensors), third-party audits, and blockchain transparency. Every impact claim is backed by verifiable data, and all reports are published on the platform."
                },
                {
                  q: "Can I sell my tokens if I need liquidity?",
                  a: "Yes. SEEDx includes a secondary marketplace where Regenerators can trade tokens peer-to-peer. Liquidity depends on market demand, but we're building mechanisms (automated market makers, periodic buybacks) to enhance liquidity over time."
                },
                {
                  q: "What happens if a project fails?",
                  a: "Not all projects will succeed—that's the nature of impact investing. Liquidity pools diversify across multiple projects to mitigate risk. We conduct thorough due diligence, provide agronomic/technical support, and maintain transparency about challenges. Regenerators should only invest what they can afford to lose."
                },
                {
                  q: "How does SEED make money?",
                  a: "SEED & SEEDx generate revenue through platform transaction fees (0.5-2% on token purchases), liquidity pool management fees (1-3% annually), and advisory services. This ensures the platform is self-sustaining while keeping costs low for users."
                },
                {
                  q: "Is this available in my country?",
                  a: "We're launching in Nigeria first (2025), with expansion to West, East, and Southern Africa over the next 3-5 years. Regenerators from anywhere in the world can participate, subject to local regulations. We're building compliance infrastructure to expand globally."
                }
              ].map((faq, idx) => (
                <Card key={idx} data-testid={`faq-${idx}`}>
                  <CardHeader>
                    <CardTitle className="text-xl">{faq.q}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{faq.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 overflow-hidden">
        <div 
          className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)'
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6" data-testid="text-cta">
              Ready to Join the Regenerative Capital Movement?
            </h2>
            <p className="text-lg text-gray-300 mb-10">
              Whether you're a philanthropist looking to maximize impact, an investor seeking verified returns, or simply curious about how regenerative finance works—there's a place for you in the SEED ecosystem.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100" data-testid="button-get-started">
                  Get Started Now
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" data-testid="button-learn-more">
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
