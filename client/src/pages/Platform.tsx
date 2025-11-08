import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DollarSign
} from "lucide-react";

export default function Platform() {
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
              The SEEDx Platform
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed" data-testid="text-hero-description">
              A blockchain-powered Regenerative Capital Exchange (RCX) that transforms grants into perpetual impact engines through tokenization, liquidity pools, and AI-verified impact measurement.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Platform Video Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center text-foreground" data-testid="text-video-title">
              See the Platform in Action
            </h2>
            <p className="text-lg text-muted-foreground mb-12 text-center max-w-3xl mx-auto">
              Discover how SEEDx makes regenerative capital accessible, transparent, and perpetually renewable.
            </p>

            <div className="max-w-4xl mx-auto">
              <Card className="overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-0">
                  <div className="aspect-video flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950 text-white p-12 text-center">
                    <PlayCircle className="w-20 h-20 mb-6 opacity-90" data-testid="icon-video-placeholder" />
                    <h3 className="text-2xl md:text-3xl font-bold mb-4">Platform Demo Video</h3>
                    <p className="text-lg opacity-85 max-w-2xl">
                      Coming Soon: Watch how Primers, Regenerators, and Project Owners interact with the SEEDx ecosystem
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Platform Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center text-foreground" data-testid="text-features-title">
              Platform Features
            </h2>
            <p className="text-lg text-muted-foreground mb-12 text-center max-w-3xl mx-auto">
              Built for transparency, security, and seamless user experience across all stakeholders.
            </p>

            <motion.div 
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={staggerChildren}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {[
                {
                  icon: Lock,
                  title: "Blockchain Tokenization",
                  desc: "Real-world assets transformed into tradeable digital tokens on the Stellar blockchain. Every token is backed by verified productive assets with immutable ownership records and transparent transaction histories."
                },
                {
                  icon: BarChart3,
                  title: "Liquidity Pool Mechanics",
                  desc: "Patient capital from grants and CSR funds pools together to de-risk projects and create recyclable capital. One-time grants become evergreen funds that regenerate perpetually across multiple projects."
                },
                {
                  icon: Lightbulb,
                  title: "AI-Powered Verification",
                  desc: "Automated impact measurement using IoT sensors, satellite data, computer vision, and machine learning. Real-time verification eliminates trust gaps and provides transparent accountability to all stakeholders."
                },
                {
                  icon: Users,
                  title: "Cooperative Governance",
                  desc: "Democratic ownership model where Regenerators are members, not just customers. One member, one vote ensures long-term stakeholder alignment and shared prosperity from platform success."
                },
                {
                  icon: TrendingUp,
                  title: "Real-Time Impact Dashboard",
                  desc: "Live tracking of capital deployment, project performance, and verified impact metrics. Primers and Regenerators see exactly where their capital goes and the measurable outcomes it creates."
                },
                {
                  icon: CreditCard,
                  title: "Seamless Payments",
                  desc: "Integrated fiat on-ramps via Flutterwave and Paystack. Invest in NGN or USD with familiar payment methods. Stablecoin infrastructure ensures price stability and easy conversion."
                }
              ].map((feature, idx) => (
                <motion.div key={idx} variants={fadeInUp}>
                  <Card className="h-full hover-elevate" data-testid={`feature-card-${idx}`}>
                    <CardHeader>
                      <div className="w-14 h-14 bg-primary rounded-lg flex items-center justify-center mb-4">
                        <feature.icon className="w-7 h-7 text-primary-foreground" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Technology Stack Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center text-foreground" data-testid="text-tech-title">
              Technology Stack
            </h2>
            <p className="text-lg text-muted-foreground mb-12 text-center max-w-3xl mx-auto">
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
                <Card key={idx} className="text-center border-2 hover-elevate" data-testid={`tech-${idx}`}>
                  <CardHeader>
                    <tech.icon className="w-10 h-10 text-primary mx-auto mb-3" />
                    <CardTitle className="text-lg">{tech.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{tech.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* User Journey Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center text-foreground" data-testid="text-journey-title">
              Your Journey on SEEDx
            </h2>
            <p className="text-lg text-muted-foreground mb-12 text-center max-w-3xl mx-auto">
              Getting started is simple. Here's how to begin your regenerative capital journey.
            </p>

            <div className="max-w-3xl mx-auto space-y-8">
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
                  variants={fadeInUp}
                  className="flex gap-6 items-start"
                  data-testid={`journey-step-${idx}`}
                >
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold">
                      {step.num}
                    </div>
                  </div>
                  <Card className="flex-1 hover-elevate">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <step.icon className="w-6 h-6 text-primary" />
                        <CardTitle className="text-xl">{step.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Security & Compliance Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center text-foreground" data-testid="text-security-title">
              Security & Compliance
            </h2>
            <p className="text-lg text-muted-foreground mb-12 text-center max-w-3xl mx-auto">
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
                <Card key={idx} className="border-l-4 border-l-primary hover-elevate" data-testid={`security-${idx}`}>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
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
              Ready to Experience the Platform?
            </h2>
            <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
              Join the regenerative capital movement. Create your account today and start participating in verified impact projects.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100" data-testid="button-get-started">
                  Get Started Now
                </Button>
              </Link>
              <Link href="/learn">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" data-testid="button-learn-more">
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
