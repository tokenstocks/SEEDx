import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Lock,
  BarChart3,
  Lightbulb,
  Users,
  TrendingUp,
  CreditCard,
  PlayCircle,
  Code,
  Server,
  Shield,
  Globe,
  CheckCircle2,
  UserCheck,
  FileCheck,
  Wallet,
  TrendingDown,
  DollarSign,
  ArrowRight
} from "lucide-react";

export default function Platform() {
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
          <div className="absolute top-[10%] left-[15%] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[15%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <motion.div {...fadeInUp}>
            <div className="inline-block px-5 py-2 mb-6 bg-blue-500/10 border border-blue-500/30 rounded-full">
              <span className="text-blue-400 text-xs font-bold tracking-[0.2em] uppercase">
                Platform Overview
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent tracking-tight" data-testid="text-hero-title">
              The SEEDx Platform
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-4xl mx-auto leading-relaxed" data-testid="text-hero-description">
              A blockchain-powered Regenerative Capital Exchange (RCX) that transforms grants into perpetual impact engines through tokenization, liquidity pools, and AI-verified impact measurement.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Platform Video Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-center bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent" data-testid="text-video-title">
              See the Platform in Action
            </h2>
            <p className="text-lg text-slate-400 mb-12 text-center max-w-3xl mx-auto">
              Discover how SEEDx makes regenerative capital accessible, transparent, and perpetually renewable.
            </p>

            <div className="max-w-4xl mx-auto">
              <div className="relative bg-gradient-to-br from-blue-950/40 to-emerald-950/20 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
                
                <div className="aspect-video flex flex-col items-center justify-center p-12 text-center cursor-pointer">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg" data-testid="icon-video-placeholder">
                    <PlayCircle className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Platform Demo Video</h3>
                  <p className="text-lg text-slate-400 max-w-2xl">
                    Coming Soon: Watch how Primers, Regenerators, and Project Owners interact with the SEEDx ecosystem
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Platform Features Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-center bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent" data-testid="text-features-title">
              Platform Features
            </h2>
            <p className="text-lg text-slate-400 mb-12 text-center max-w-3xl mx-auto">
              Built for transparency, security, and seamless user experience across all stakeholders.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Lock,
                  title: "Blockchain Tokenization",
                  desc: "Real-world assets transformed into tradeable digital tokens on the Stellar blockchain. Every token is backed by verified productive assets with immutable ownership records and transparent transaction histories.",
                  gradient: "from-blue-600 to-blue-800"
                },
                {
                  icon: BarChart3,
                  title: "Liquidity Pool Mechanics",
                  desc: "Patient capital from grants and CSR funds pools together to de-risk projects and create recyclable capital. One-time grants become evergreen funds that regenerate perpetually across multiple projects.",
                  gradient: "from-emerald-500 to-emerald-700"
                },
                {
                  icon: Lightbulb,
                  title: "AI-Powered Verification",
                  desc: "Automated impact measurement using IoT sensors, satellite data, computer vision, and machine learning. Real-time verification eliminates trust gaps and provides transparent accountability to all stakeholders.",
                  gradient: "from-amber-500 to-amber-700"
                },
                {
                  icon: Users,
                  title: "Cooperative Governance",
                  desc: "Democratic ownership model where Regenerators are members, not just customers. One member, one vote ensures long-term stakeholder alignment and shared prosperity from platform success.",
                  gradient: "from-purple-600 to-purple-800"
                },
                {
                  icon: TrendingUp,
                  title: "Real-Time Impact Dashboard",
                  desc: "Live tracking of capital deployment, project performance, and verified impact metrics. Primers and Regenerators see exactly where their capital goes and the measurable outcomes it creates.",
                  gradient: "from-green-600 to-green-800"
                },
                {
                  icon: CreditCard,
                  title: "Seamless Payments",
                  desc: "Integrated fiat on-ramps via Flutterwave and Paystack. Invest in NGN or USD with familiar payment methods. Stablecoin infrastructure ensures price stability and easy conversion.",
                  gradient: "from-cyan-600 to-cyan-800"
                }
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                >
                  <div className="relative h-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 transition-all duration-300 hover:bg-white/10 hover:-translate-y-2 hover:shadow-2xl group" data-testid={`feature-card-${idx}`}>
                    <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-transparent ${feature.gradient === "from-blue-600 to-blue-800" ? "via-blue-500/60" : feature.gradient === "from-emerald-500 to-emerald-700" ? "via-emerald-500/60" : feature.gradient === "from-amber-500 to-amber-700" ? "via-amber-500/60" : feature.gradient === "from-purple-600 to-purple-800" ? "via-purple-500/60" : feature.gradient === "from-green-600 to-green-800" ? "via-green-500/60" : "via-cyan-500/60"} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Technology Stack Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-center bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent" data-testid="text-tech-title">
              Technology Stack
            </h2>
            <p className="text-lg text-slate-400 mb-12 text-center max-w-3xl mx-auto">
              Built on battle-tested, enterprise-grade technologies for security, scalability, and reliability.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Code, title: "Stellar Blockchain", desc: "Fast, low-cost tokenization and transactions" },
                { icon: Server, title: "PostgreSQL Database", desc: "Reliable data storage with ACID compliance" },
                { icon: Shield, title: "AES-256 Encryption", desc: "Bank-level security for sensitive data" },
                { icon: Globe, title: "React + TypeScript", desc: "Modern, type-safe frontend development" },
                { icon: Lock, title: "JWT Authentication", desc: "Secure, stateless user sessions" },
                { icon: Code, title: "Express.js API", desc: "RESTful backend architecture" },
                { icon: Server, title: "Supabase Storage", desc: "Scalable file storage for documents" },
                { icon: Shield, title: "Multi-sig Wallets", desc: "Enhanced security for platform funds" }
              ].map((tech, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: idx * 0.05 }}
                >
                  <div className="relative bg-white/5 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-6 text-center transition-all duration-300 hover:bg-white/10 hover:border-emerald-500/40 hover:-translate-y-1 group" data-testid={`tech-${idx}`}>
                    <tech.icon className="w-10 h-10 text-emerald-400 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
                    <h4 className="text-lg font-semibold text-white mb-2">{tech.title}</h4>
                    <p className="text-sm text-slate-400">{tech.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* User Journey Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-center bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent" data-testid="text-journey-title">
              Your Journey on SEEDx
            </h2>
            <p className="text-lg text-slate-400 mb-12 text-center max-w-3xl mx-auto">
              Getting started is simple. Here's how to begin your regenerative capital journey.
            </p>

            <div className="max-w-4xl mx-auto space-y-6">
              {[
                {
                  num: 1,
                  icon: UserCheck,
                  title: "Create Your Account",
                  desc: "Sign up with your email and complete our simple KYC verification process. We verify your identity to ensure platform security and regulatory compliance."
                },
                {
                  num: 2,
                  icon: Wallet,
                  title: "Activate Your Wallet",
                  desc: "Set up your multi-currency wallet supporting NGN, USDC, and XLM. Your Stellar blockchain wallet is created automatically with bank-level encryption."
                },
                {
                  num: 3,
                  icon: DollarSign,
                  title: "Fund Your Account",
                  desc: "Deposit funds using familiar payment methods via Flutterwave or Paystack. Convert fiat to NGNTS stablecoins instantly for on-chain participation."
                },
                {
                  num: 4,
                  icon: FileCheck,
                  title: "Browse Verified Projects",
                  desc: "Explore de-risked projects backed by liquidity pools. Every project includes verified impact metrics, financial projections, and risk assessments."
                },
                {
                  num: 5,
                  icon: TrendingUp,
                  title: "Participate in Projects",
                  desc: "Purchase project tokens and gain fractional ownership in verified regenerative assets. Track your portfolio performance and impact metrics in real-time."
                },
                {
                  num: 6,
                  icon: TrendingDown,
                  title: "Trade or Hold",
                  desc: "Hold tokens for long-term impact and returns, or trade them on the internal marketplace. Enjoy liquidity when you need it, impact when you want it."
                }
              ].map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                  className="relative"
                  data-testid={`journey-step-${idx}`}
                >
                  <div className="flex gap-6 items-start bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:bg-white/10 hover:-translate-x-2 hover:shadow-2xl hover:shadow-blue-600/10 group">
                    <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-transparent ${idx % 2 === 0 ? 'via-blue-500/60' : 'via-emerald-500/60'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    
                    <div className={`flex-shrink-0 w-14 h-14 bg-gradient-to-br ${idx % 2 === 0 ? 'from-blue-600 to-blue-800' : 'from-emerald-500 to-emerald-700'} rounded-full flex items-center justify-center text-2xl font-bold text-white group-hover:scale-110 transition-transform duration-300`}>
                      {step.num}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <step.icon className={`w-6 h-6 ${idx % 2 === 0 ? 'text-blue-400' : 'text-emerald-400'} group-hover:scale-110 transition-transform duration-300`} />
                        <h4 className={`text-xl font-semibold text-white group-hover:${idx % 2 === 0 ? 'text-blue-400' : 'text-emerald-400'} transition-colors`}>{step.title}</h4>
                      </div>
                      <p className="text-slate-400 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Security & Compliance Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-center bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent" data-testid="text-security-title">
              Security & Compliance
            </h2>
            <p className="text-lg text-slate-400 mb-12 text-center max-w-3xl mx-auto">
              Your security and regulatory compliance are our top priorities.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: "KYC/AML Compliance",
                  desc: "Comprehensive identity verification and anti-money laundering checks for all users. Regulatory compliance built into every transaction."
                },
                {
                  title: "Encrypted Wallet Keys",
                  desc: "AES-256-CBC encryption for all Stellar secret keys. Your private keys never leave the server unencrypted."
                },
                {
                  title: "Multi-Signature Wallets",
                  desc: "Platform treasury and liquidity pool wallets require multiple approvals for enhanced security and fraud prevention."
                },
                {
                  title: "Blockchain Transparency",
                  desc: "Every transaction recorded on Stellar's immutable ledger. Full audit trail for complete accountability."
                },
                {
                  title: "Secure Sessions",
                  desc: "JWT-based authentication with secure, httpOnly cookies. Session management designed to prevent unauthorized access."
                },
                {
                  title: "Regular Security Audits",
                  desc: "Third-party security audits and penetration testing. Continuous monitoring for vulnerabilities and threats."
                }
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                >
                  <div className="relative h-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:bg-white/10 hover:-translate-y-1 hover:shadow-xl group" data-testid={`security-${idx}`}>
                    <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute left-0 top-6 bottom-6 w-[3px] rounded-l-2xl bg-gradient-to-b from-transparent via-emerald-500/60 to-transparent" />
                    
                    <div className="flex items-start gap-3 mb-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-300" />
                      <h4 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">{item.title}</h4>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed pl-9">{item.desc}</p>
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
            className="relative bg-gradient-to-br from-blue-950/60 to-emerald-950/40 backdrop-blur-md border border-white/10 rounded-3xl p-12 md:p-16 text-center overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6" data-testid="text-cta">
              Ready to Experience the Platform?
            </h2>
            <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
              Join the regenerative capital movement. Create your account today and start participating in verified impact projects.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-blue-800 hover:opacity-90 text-white px-8 py-6 text-lg font-semibold shadow-lg hover:-translate-y-1 transition-all duration-300" data-testid="button-get-started">
                  Get Started Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/learn">
                <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/10 text-white px-8 py-6 text-lg font-semibold hover:-translate-y-1 transition-all duration-300" data-testid="button-learn-more">
                  Learn More
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
