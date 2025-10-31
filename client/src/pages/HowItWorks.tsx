import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { UserPlus, Upload, Wallet, TrendingUp, ArrowRight } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: UserPlus,
    title: "Create Your Account",
    description: "Sign up in minutes with just your email and basic information. No complicated paperwork required.",
  },
  {
    number: 2,
    icon: Upload,
    title: "Complete KYC Verification",
    description: "Upload your ID, selfie, and proof of address for quick verification. This ensures security and regulatory compliance.",
  },
  {
    number: 3,
    icon: Wallet,
    title: "Fund Your Wallet",
    description: "Deposit funds via bank transfer (NGN) or cryptocurrency (USDC/XLM). Multiple payment options for your convenience.",
  },
  {
    number: 4,
    icon: TrendingUp,
    title: "Start Investing",
    description: "Browse verified agricultural projects and invest with as little as $100. Earn returns as farms generate profits.",
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-24 pb-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="text-title">
            How TokenStocks Works
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-subtitle">
            Start investing in tokenized agricultural assets in four simple steps
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid gap-8 md:gap-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                      <Icon className="w-8 h-8 text-primary-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-bold text-primary">STEP {step.number}</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-3" data-testid={`text-step-${step.number}-title`}>
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-lg" data-testid={`text-step-${step.number}-description`}>
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute left-8 top-16 w-0.5 h-16 bg-border" />
                )}
              </div>
            );
          })}
        </div>

        <Card className="mt-16 bg-primary text-primary-foreground">
          <CardContent className="p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Blockchain?</h2>
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div>
                <h3 className="font-bold mb-2">Transparency</h3>
                <p className="text-primary-foreground/90">
                  Every transaction is recorded on the blockchain, providing complete visibility into your investments.
                </p>
              </div>
              <div>
                <h3 className="font-bold mb-2">Security</h3>
                <p className="text-primary-foreground/90">
                  Immutable records and smart contracts ensure your assets are protected and ownership is guaranteed.
                </p>
              </div>
              <div>
                <h3 className="font-bold mb-2">Liquidity</h3>
                <p className="text-primary-foreground/90">
                  Trade your tokenized assets easily without the traditional barriers of agricultural investments.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of investors earning passive income from agricultural investments
          </p>
          <Link href="/register">
            <Button size="lg" className="gap-2" data-testid="button-get-started">
              Create Your Account
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
