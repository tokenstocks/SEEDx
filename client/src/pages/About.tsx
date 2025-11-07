import { motion, useReducedMotion } from "framer-motion";
import { 
  Leaf, 
  Target, 
  Coins, 
  Tractor, 
  Users, 
  Globe, 
  Shield, 
  TrendingUp, 
  Users2, 
  BookOpen,
  Sprout,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function About() {
  const shouldReduceMotion = useReducedMotion();

  const fadeInUp = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-16">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-emerald-500/10 pointer-events-none" />
        
        <motion.div 
          className="relative z-10 text-center max-w-4xl mx-auto px-6"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="mb-8">
            <Badge 
              className="bg-emerald-500/20 border-emerald-500/40 text-emerald-400 backdrop-blur-sm px-6 py-2 text-sm font-bold uppercase tracking-wider"
              data-testid="badge-our-story"
            >
              <Leaf className="w-4 h-4 mr-2" />
              Our Story
            </Badge>
          </motion.div>


          <motion.h1 
            variants={fadeInUp}
            className="text-6xl md:text-7xl lg:text-8xl font-black mb-6 bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent leading-tight"
            data-testid="text-about-title"
          >
            About SEEDx
          </motion.h1>

          <motion.p 
            variants={fadeInUp}
            className="text-xl md:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed"
            data-testid="text-about-subtitle"
          >
            Planting capital. Growing impact. A regenerative capital exchange.
          </motion.p>

          {/* Scroll Indicator */}
          <motion.div 
            variants={fadeInUp}
            className="flex flex-col items-center gap-3 mt-16"
            data-testid="scroll-indicator"
          >
            <div className="w-7 h-11 border-2 border-white/30 rounded-full relative">
              <motion.div
                className="w-1 h-2 bg-amber-500 rounded-full absolute top-2 left-1/2 -translate-x-1/2"
                animate={shouldReduceMotion ? {} : { y: [0, 12, 0], opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <span className="text-sm text-slate-500 font-semibold uppercase tracking-wider">Scroll to explore</span>
          </motion.div>
        </motion.div>
      </section>

      {/* Mission Section */}
      <section className="py-24 md:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-12">
              <Badge 
                className="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 mb-6 px-6 py-2 text-xs font-bold uppercase tracking-widest"
                data-testid="badge-our-mission"
              >
                <Target className="w-4 h-4 mr-2" />
                Our Mission
              </Badge>
              <h2 
                className="text-4xl md:text-5xl font-black text-foreground mb-8 tracking-tight"
                data-testid="heading-mission"
              >
                Revolutionizing Agricultural Participation
              </h2>
            </motion.div>

            <motion.div variants={fadeInUp} className="max-w-4xl mx-auto space-y-6 mb-16">
              <p className="text-xl md:text-2xl text-foreground leading-relaxed">
                <strong className="font-bold">SEEDx (Sustainable Ecosystem for Economic Development)</strong> is revolutionizing 
                agricultural participation through regenerative capital. Through the power of blockchain technology 
                on the Stellar network, we enable fractional participation in agricultural assets starting from just <strong className="font-bold">$100</strong>.
              </p>
              
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Our platform connects <strong className="font-semibold text-foreground">Regenerators</strong> and <strong className="font-semibold text-foreground">Primers</strong> with verified 
                agricultural projects, creating a sustainable cycle where Primers seed the liquidity pool and 
                Regenerators participate in projects that regenerate it through cashflows.
              </p>
            </motion.div>

            {/* Mission Stats */}
            <motion.div 
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16"
            >
              {[
                { icon: Coins, value: "$5.2M+", label: "Tokenized Assets", testId: "card-stat-assets" },
                { icon: Tractor, value: "47+", label: "Active Farms", testId: "card-stat-farms" },
                { icon: Users, value: "1,200+", label: "Community Members", testId: "card-stat-members" },
                { icon: Globe, value: "12", label: "Countries Reached", testId: "card-stat-countries" }
              ].map((stat, index) => (
                <motion.div key={index} variants={fadeInUp}>
                  <Card 
                    className="p-8 hover-elevate active-elevate-2 border-border bg-card"
                    data-testid={stat.testId}
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
                        <stat.icon className="w-7 h-7 text-slate-950" />
                      </div>
                      <div>
                        <div 
                          className="text-3xl md:text-4xl font-black text-foreground leading-none mb-2"
                          data-testid={`text-stat-value-${index}`}
                        >
                          {stat.value}
                        </div>
                        <div 
                          className="text-xs font-bold text-muted-foreground uppercase tracking-wide"
                          data-testid={`text-stat-label-${index}`}
                        >
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <Badge 
                className="bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 mb-6 px-6 py-2 text-xs font-bold uppercase tracking-widest"
                data-testid="badge-why-seedx"
              >
                <Leaf className="w-4 h-4 mr-2" />
                Why SEEDx
              </Badge>
              <h2 
                className="text-4xl md:text-5xl font-black text-foreground tracking-tight"
                data-testid="heading-features"
              >
                Built for the Future of Agriculture
              </h2>
            </motion.div>

            <motion.div 
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {[
                {
                  icon: Shield,
                  title: "Blockchain Security",
                  description: "All transactions are secured on the Stellar blockchain, providing transparent and immutable records of participation.",
                  testId: "card-feature-security"
                },
                {
                  icon: TrendingUp,
                  title: "Competitive Returns",
                  description: "Agricultural participation offers competitive returns of 15-25% APY, backed by real-world farming operations.",
                  testId: "card-feature-returns"
                },
                {
                  icon: Users2,
                  title: "Community Driven",
                  description: "Join thousands of participants supporting sustainable agriculture and building portfolios together.",
                  testId: "card-feature-community"
                },
                {
                  icon: Globe,
                  title: "Global Access",
                  description: "Participate from anywhere in the world with support for multiple currencies including NGN, USDC, and XLM.",
                  testId: "card-feature-global"
                }
              ].map((feature, index) => (
                <motion.div key={index} variants={fadeInUp}>
                  <Card 
                    className="p-8 md:p-10 text-center relative overflow-hidden border-border bg-card hover-elevate active-elevate-2 group"
                    data-testid={feature.testId}
                  >
                    {/* Top gradient bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                    
                    <div className="relative mb-6 inline-block">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                        <feature.icon className="w-9 h-9 text-amber-500" />
                      </div>
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-foreground mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-24 md:py-32 bg-background">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-12">
              <Badge 
                className="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 mb-6 px-6 py-2 text-xs font-bold uppercase tracking-widest"
                data-testid="badge-our-journey"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Our Journey
              </Badge>
              <h2 
                className="text-4xl md:text-5xl font-black text-foreground tracking-tight"
                data-testid="heading-story"
              >
                Our Story
              </h2>
            </motion.div>

            <motion.div variants={fadeInUp} className="space-y-6 mb-16">
              <p className="text-lg text-muted-foreground leading-relaxed">
                Founded in <strong className="text-foreground font-semibold">2024</strong>, SEEDx was born from a vision to bridge the gap between 
                traditional agriculture and regenerative finance. We recognized that while agriculture is 
                one of Nigeria's most important sectors, small-scale farmers often struggle to access funding, 
                and everyday participants miss out on opportunities to create lasting impact.
              </p>
              
              <p className="text-lg text-muted-foreground leading-relaxed">
                By leveraging blockchain technology and regenerative capital principles, we've created a 
                platform that benefits everyone: farmers get the funding they need to expand their operations, 
                Primers seed the liquidity that makes it possible, and Regenerators participate in projects that 
                perpetuate the cycle.
              </p>
              
              <Card className="p-8 border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-transparent">
                <p className="text-xl text-foreground leading-relaxed font-medium">
                  Today, SEEDx manages over <strong className="font-bold">$5.2M in tokenized agricultural assets</strong>, supporting 
                  sustainable farming practices while delivering consistent returns to our growing community of 
                  Primers and Regenerators.
                </p>
              </Card>
            </motion.div>

            {/* Timeline */}
            <motion.div variants={staggerContainer} className="relative pl-12">
              {/* Timeline line */}
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-500 via-amber-500/50 to-emerald-500" />

              {[
                { date: "Q1 2024", title: "Platform Launch", description: "SEEDx officially launches with 5 pilot farms", testId: "timeline-q1-2024" },
                { date: "Q2 2024", title: "$1M Milestone", description: "Reached $1M in tokenized agricultural assets", testId: "timeline-q2-2024" },
                { date: "Q3 2024", title: "Regional Expansion", description: "Expanded to 12 African countries", testId: "timeline-q3-2024" },
                { date: "Q4 2024", title: "$5M+ Assets", description: "Managing over $5.2M with 1,200+ community members", testId: "timeline-q4-2024" }
              ].map((item, index) => (
                <motion.div 
                  key={index} 
                  variants={fadeInUp}
                  className="relative pb-12 last:pb-0"
                  data-testid={item.testId}
                >
                  {/* Timeline marker */}
                  <div className="absolute -left-[49px] top-0 w-4 h-4 rounded-full bg-amber-500 border-4 border-background shadow-lg shadow-amber-500/30" />
                  
                  <div className="pl-6">
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                      {item.date}
                    </div>
                    <h4 className="text-xl font-bold text-foreground mb-2">
                      {item.title}
                    </h4>
                    <p className="text-base text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Foundation Section */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
          >
            <Card 
              className="p-10 md:p-12 relative overflow-hidden border-border bg-card"
              data-testid="card-seed-foundation"
            >
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/30">
                  <Sprout className="w-10 h-10 text-white" />
                </div>
                
                <div className="text-sm text-muted-foreground font-semibold uppercase tracking-wider mb-3">
                  An Initiative of
                </div>
                <h3 
                  className="text-3xl md:text-4xl font-black text-foreground mb-2"
                  data-testid="heading-seed-foundation"
                >
                  Sustainable Ecosystem for Economic Development
                </h3>
                <div className="text-lg text-muted-foreground font-semibold mb-6">(SEED)</div>
                
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8">
                  SEEDx is proudly developed and supported by the <strong className="text-foreground font-semibold">Sustainable Ecosystem for Economic 
                  Development (SEED)</strong> foundation, dedicated to creating innovative financial solutions 
                  that drive sustainable economic growth across Africa.
                </p>
                
                <Button 
                  variant="outline"
                  className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 group"
                  data-testid="button-learn-seed"
                >
                  <span>Learn more about SEED</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-emerald-500/10 pointer-events-none" />
        
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="max-w-4xl mx-auto px-6 text-center relative z-10"
        >
          <motion.h2 
            variants={fadeInUp}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight"
            data-testid="heading-cta"
          >
            Ready to Join the Movement?
          </motion.h2>
          <motion.p 
            variants={fadeInUp}
            className="text-xl md:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto"
            data-testid="text-cta-subtitle"
          >
            Start supporting regenerative agriculture and building your portfolio today.
          </motion.p>
          
          <motion.div 
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button 
              size="lg"
              className="bg-gradient-to-br from-amber-500 to-amber-700 hover:opacity-90 text-slate-950 px-8 h-14 text-lg font-semibold shadow-lg shadow-amber-500/30 w-full sm:w-auto"
              data-testid="button-get-started-cta"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 backdrop-blur-sm px-8 h-14 text-lg font-semibold w-full sm:w-auto"
              data-testid="button-browse-farms-cta"
            >
              <span>Browse Farms</span>
              <Leaf className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
