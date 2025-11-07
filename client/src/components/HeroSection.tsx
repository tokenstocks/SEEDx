import { Button } from "@/components/ui/button";
import { Shield, Globe, Sprout, Leaf } from "lucide-react";
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
        <div 
          className="absolute inset-0 z-[1]"
          style={{
            background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.3) 50%, rgba(0, 0, 0, 0.6) 100%)'
          }}
        />
      </div>
      <CircuitOverlay />
      <div className="relative h-full flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 text-center z-10">
        <div className="max-w-4xl space-y-3 sm:space-y-4 md:space-y-5">
          <h1 className="text-[40px] md:text-[52px] lg:text-[64px] font-bold text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-[1.1]">
            Plant capital.<br/>Grow sustainable impact.
          </h1>
          <h2 className="text-[20px] lg:text-[28px] text-white/70 font-normal tracking-wide drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] mt-3">
            The Regenerative Capital Exchange
          </h2>
          <p className="text-[16px] lg:text-[20px] text-white/80 font-light max-w-3xl mx-auto drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] mt-4">
            Connecting capital with verified agricultural opportunities across Africa.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center pt-6 md:pt-8 w-full px-2 sm:px-0">
            <Button
              size="lg"
              onClick={onGetStarted}
              className="w-full sm:flex-1 sm:min-w-[240px] sm:max-w-md overflow-visible bg-blue-600/95 backdrop-blur-sm border border-blue-500/40 shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:-translate-y-1 rounded-2xl"
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
              className="w-full sm:flex-1 sm:min-w-[240px] sm:max-w-md overflow-visible bg-green-500/95 backdrop-blur-sm border border-green-400/40 shadow-2xl hover:shadow-green-500/50 transition-all duration-300 hover:-translate-y-1 rounded-2xl"
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

          <div className="flex flex-wrap gap-6 sm:gap-8 md:gap-12 justify-center pt-8 sm:pt-10 md:pt-12 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base font-medium">Blockchain Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base font-medium">Trusted Globally</span>
            </div>
            <div className="flex items-center gap-2">
              <Sprout className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base font-medium">Farm-to-Token Pipeline</span>
            </div>
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base font-medium">Regenerative Capital Model</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
