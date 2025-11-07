import { Card } from "@/components/ui/card";
import { PieChart, Shield, TrendingUp, Zap } from "lucide-react";

export default function BenefitsSection() {
  const benefits = [
    {
      icon: PieChart,
      title: "Fractional Ownership",
      description: "Invest with as little as $100 and own a piece of profitable farmland."
    },
    {
      icon: Shield,
      title: "Blockchain Security",
      description: "Every transaction is secured and verified on the Stellar network."
    },
    {
      icon: TrendingUp,
      title: "Transparent Returns",
      description: "Track your investments and returns in real-time on the blockchain."
    },
    {
      icon: Zap,
      title: "Easy Liquidity",
      description: "Trade your tokens on secondary markets whenever you want to exit."
    }
  ];

  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 sm:mb-16 px-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">Why SEEDx?</h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Plant capital. Grow impact. The future of regenerative capital is here.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <Card key={index} className="p-6 hover-elevate">
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2" data-testid={`text-benefit-${benefit.title}`}>
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
