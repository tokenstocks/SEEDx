import { Button } from "@/components/ui/button";
import { Shield, Globe, Sprout, Leaf } from "lucide-react";
import CircuitOverlay from "./CircuitOverlay";
import { useState, useEffect, useRef } from "react";

interface HeroSectionProps {
  heroImage: string;
  onGetStarted?: () => void;
  onExplore?: () => void;
}

const TYPEWRITER_WORDS = ['sustainable', 'lasting', 'regenerative', 'measurable', 'global', 'transformative'];

export default function HeroSection({ heroImage, onGetStarted, onExplore }: HeroSectionProps) {
  const [displayText, setDisplayText] = useState('');
  const wordIndexRef = useRef(0);
  const charIndexRef = useRef(0);
  const isDeletingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const type = () => {
      const currentWord = TYPEWRITER_WORDS[wordIndexRef.current];
      const isDeleting = isDeletingRef.current;
      const charIndex = charIndexRef.current;

      if (!isDeleting) {
        if (charIndex < currentWord.length) {
          charIndexRef.current++;
          setDisplayText(currentWord.substring(0, charIndexRef.current));
          timeoutRef.current = setTimeout(type, 400);
        } else {
          timeoutRef.current = setTimeout(() => {
            isDeletingRef.current = true;
            type();
          }, 6000);
        }
      } else {
        if (charIndex > 0) {
          charIndexRef.current--;
          setDisplayText(currentWord.substring(0, charIndexRef.current));
          timeoutRef.current = setTimeout(type, 240);
        } else {
          isDeletingRef.current = false;
          timeoutRef.current = setTimeout(() => {
            wordIndexRef.current = (wordIndexRef.current + 1) % TYPEWRITER_WORDS.length;
            type();
          }, 1600);
        }
      }
    };

    timeoutRef.current = setTimeout(type, 400);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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
            background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.4) 40%, rgba(0, 0, 0, 0.5) 60%, rgba(0, 0, 0, 0.65) 100%)'
          }}
        />
        <div 
          className="absolute inset-0 z-[1]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.4) 100%)'
          }}
        />
      </div>
      <CircuitOverlay />
      <div className="relative h-full flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 text-center z-10">
        <div className="max-w-4xl space-y-3 sm:space-y-4 md:space-y-5">
          <h1 className="text-[36px] sm:text-[40px] md:text-[52px] lg:text-[64px] font-bold text-white tracking-[-0.02em] drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)] leading-[1.1]">
            Plant capital.<br/>
            Grow <span className="inline-block min-w-0 md:min-w-[200px] text-left text-emerald-400" data-testid="typewriter-text">{displayText}<span className="animate-pulse">|</span></span> impact.
          </h1>
          <h2 className="text-[18px] md:text-[24px] lg:text-[28px] text-white/95 font-normal tracking-[0.01em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)] mt-3">
            The Regenerative Capital Exchange
          </h2>
          <p className="text-[16px] md:text-[18px] lg:text-[20px] text-white/90 font-light max-w-3xl mx-auto leading-relaxed drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)] mt-4">
            Connecting capital with verified agricultural opportunities across Africa.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center pt-8 md:pt-12 w-full px-2 sm:px-0">
            <button
              onClick={onGetStarted}
              className="group relative w-full sm:max-w-[340px] bg-blue-600 text-white px-5 py-3 sm:py-2.5 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-[3px] active:translate-y-[-1px] shadow-[0_4px_12px_rgba(37,99,235,0.3),0_2px_4px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_24px_rgba(37,99,235,0.4),0_4px_8px_rgba(0,0,0,0.15)]"
              data-testid="button-become-primer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex flex-col gap-1">
                <span className="text-[16px] sm:text-[17px] font-bold">Become a Primer</span>
                <span className="text-[12px] sm:text-[13px] font-normal opacity-95 leading-relaxed">
                  Fund agricultural deployment and participate in the regenerative cycle
                </span>
              </div>
            </button>
            <button
              onClick={onExplore}
              className="group relative w-full sm:max-w-[340px] bg-emerald-500 text-white px-5 py-3 sm:py-2.5 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-[3px] active:translate-y-[-1px] shadow-[0_4px_12px_rgba(16,185,129,0.3),0_2px_4px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_24px_rgba(16,185,129,0.4),0_4px_8px_rgba(0,0,0,0.15)]"
              data-testid="button-become-regenerator"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex flex-col gap-1">
                <span className="text-[16px] sm:text-[17px] font-bold">Become a Regenerator</span>
                <span className="text-[12px] sm:text-[13px] font-normal opacity-95 leading-relaxed">
                  Acquire and trade tokens backed by verified agricultural projects
                </span>
              </div>
            </button>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-4 sm:gap-6 justify-center pt-10 sm:pt-14 text-white">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-black/20 backdrop-blur-[4px] rounded-lg transition-transform duration-200 hover:-translate-y-0.5" data-testid="badge-blockchain">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />
              <span className="text-[14px] sm:text-[15px] font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Blockchain Verified</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 bg-black/20 backdrop-blur-[4px] rounded-lg transition-transform duration-200 hover:-translate-y-0.5" data-testid="badge-global">
              <Globe className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />
              <span className="text-[14px] sm:text-[15px] font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Trusted Globally</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 bg-black/20 backdrop-blur-[4px] rounded-lg transition-transform duration-200 hover:-translate-y-0.5" data-testid="badge-pipeline">
              <Sprout className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />
              <span className="text-[14px] sm:text-[15px] font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Farm-to-Token Pipeline</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 bg-black/20 backdrop-blur-[4px] rounded-lg transition-transform duration-200 hover:-translate-y-0.5" data-testid="badge-regenerative">
              <Leaf className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />
              <span className="text-[14px] sm:text-[15px] font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Regenerative Capital Model</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
