import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, DollarSign } from "lucide-react";
import CircuitOverlay from "./CircuitOverlay";

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

      <CircuitOverlay />

      <div className="relative h-full flex flex-col items-center justify-center px-4 text-center z-10">
        <div className="max-w-4xl space-y-6">
          <div className="mb-4">
            <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tight mb-2">
              SEEDx
            </h1>
          </div>
          <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
            Plant capital.<br/>Grow sustainable impact.
          </h2>
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
            A regenerative capital exchange
          </p>

          <div className="flex flex-wrap gap-4 justify-center pt-6">
            <Button 
              size="lg" 
              className="text-lg px-8 bg-blue-600 hover:bg-blue-700 text-white border-0"
              onClick={onGetStarted}
              data-testid="button-become-primer"
            >
              Become a Primer
            </Button>
            <Button 
              size="lg" 
              className="text-lg px-8 bg-green-500 hover:bg-green-600 text-white border-0"
              onClick={onExplore}
              data-testid="button-become-regenerator"
            >
              Become a Regenerator
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
