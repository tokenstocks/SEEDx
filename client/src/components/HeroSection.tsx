import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Shield, TrendingUp, DollarSign } from "lucide-react";

interface HeroSectionProps {
  heroImage: string;
  onGetStarted?: () => void;
  onExplore?: () => void;
}

export default function HeroSection({ heroImage, onGetStarted, onExplore }: HeroSectionProps) {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Agricultural landscape" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      </div>

      <div className="relative h-full flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-4xl space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
            Plant capital. Grow impact.
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
            A regenerative capital exchange for sustainable agricultural investments on the Stellar blockchain.
          </p>

          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              className="text-lg px-8 bg-primary hover:bg-primary"
              onClick={onGetStarted}
              data-testid="button-get-started"
            >
              Start Investing
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
              onClick={onExplore}
              data-testid="button-explore"
            >
              Explore Opportunities
            </Button>
          </div>

          <div className="flex flex-wrap gap-6 justify-center pt-8 text-white/90">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm">Blockchain Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm">Regulated</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm">$5.2M in Assets</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
