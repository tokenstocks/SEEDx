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
        <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-gradient-to-t from-white via-white/60 to-transparent" />
      </div>
      <CircuitOverlay />
      <div className="relative h-full flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 text-center z-10">
        <div className="max-w-4xl space-y-4 sm:space-y-5 md:space-y-6">
          <div className="mb-2 sm:mb-3 md:mb-4">
            <p className="text-sm sm:text-base md:text-lg text-white font-light tracking-wide drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
              The Regenerative Capital Exchange
            </p>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-tight">
            Plant capital.<br/>Grow sustainable impact.
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-white max-w-2xl mx-auto drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] px-2">Connecting purpose driven funds with verified 
          agricultural opportunities that regenerate land, livelihoods and liquidity</p>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-4 sm:pt-6 w-full px-2 sm:px-0">
            <Button
              size="lg"
              onClick={onGetStarted}
              className="w-full sm:flex-1 sm:min-w-[240px] sm:max-w-md overflow-visible bg-blue-600/95 backdrop-blur-sm border border-blue-500/40 shadow-lg"
              data-testid="button-become-primer"
            >
              <div className="flex flex-col gap-1 py-2">
                <span className="text-base sm:text-lg font-bold text-white">Become a Primer</span>
                <span className="text-xs text-white/90 leading-relaxed font-normal">
                  Fund agricultural deployment and participate in the regenerative cycle
                </span>
              </div>
            </Button>
            <Button
              size="lg"
              onClick={onExplore}
              className="w-full sm:flex-1 sm:min-w-[240px] sm:max-w-md overflow-visible bg-green-500/95 backdrop-blur-sm border border-green-400/40 shadow-lg"
              data-testid="button-become-regenerator"
            >
              <div className="flex flex-col gap-1 py-2">
                <span className="text-base sm:text-lg font-bold text-white">Become a Regenerator</span>
                <span className="text-xs text-white/90 leading-relaxed font-normal">
                  Acquire and trade tokens backed by verified agricultural projects
                </span>
              </div>
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 sm:gap-6 justify-center pt-6 sm:pt-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm">Blockchain Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm">Regulated</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm">$5.2M in Assets</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
