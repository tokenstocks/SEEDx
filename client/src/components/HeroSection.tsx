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
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/40" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/60 to-transparent" />
      </div>
      <CircuitOverlay />
      <div className="relative h-full flex flex-col items-center justify-center px-4 text-center z-10">
        <div className="max-w-4xl space-y-6">
          <div className="mb-4">
            <h1 className="md:text-8xl font-bold text-white tracking-tight mb-2 text-[76px]">
              SEEDx
            </h1>
            <p className="text-base md:text-lg text-white/70 font-light tracking-wide">
              The Regenerative Capital Exchange
            </p>
          </div>
          <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
            Plant capital.<br/>Grow sustainable impact.
          </h2>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">Connecting purpose driven funds with verified 
          agricultural opportunities that regenerate land, livelihoods and liquidity</p>

          <div className="flex flex-wrap gap-6 justify-center pt-6 max-w-4xl mx-auto">
            <Button
              size="lg"
              onClick={onGetStarted}
              className="flex-1 min-w-[280px] max-w-md overflow-visible bg-blue-600 backdrop-blur-sm border border-blue-500/30"
              data-testid="button-become-primer"
            >
              <div className="flex flex-col gap-1 py-2">
                <span className="text-lg font-bold text-white">Become a Primer</span>
                <span className="text-xs text-white/90 leading-relaxed font-normal">
                  Fund agricultural deployment and participate in the regenerative cycle
                </span>
              </div>
            </Button>
            <Button
              size="lg"
              onClick={onExplore}
              className="flex-1 min-w-[280px] max-w-md overflow-visible bg-green-500 backdrop-blur-sm border border-green-400/30"
              data-testid="button-become-regenerator"
            >
              <div className="flex flex-col gap-1 py-2">
                <span className="text-lg font-bold text-white">Become a Regenerator</span>
                <span className="text-xs text-white/90 leading-relaxed font-normal">
                  Acquire and trade tokens backed by verified agricultural projects
                </span>
              </div>
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
