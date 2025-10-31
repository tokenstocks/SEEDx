import FeatureCard from "./FeatureCard";
import { Search, ShoppingCart, TrendingUp } from "lucide-react";

export default function HowItWorksSection() {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start investing in agriculture in three simple steps
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={Search}
            title="Browse Farms"
            description="Explore verified agricultural investment opportunities from around the world."
          />
          <FeatureCard
            icon={ShoppingCart}
            title="Purchase Tokens"
            description="Buy fractional ownership tokens representing real farm assets on the Stellar blockchain."
          />
          <FeatureCard
            icon={TrendingUp}
            title="Earn Returns"
            description="Receive your share of profits as the farm generates revenue from harvests."
          />
        </div>
      </div>
    </section>
  );
}
