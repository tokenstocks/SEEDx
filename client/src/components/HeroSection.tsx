import { Button } from "@/components/ui/button";
import { Shield, Globe, Sprout, Leaf, ChevronDown } from "lucide-react";
import CircuitOverlay from "./CircuitOverlay";
import { useState, useEffect, useRef } from "react";
import { motion, MotionConfig } from "framer-motion";
import heroVideoSrc from "@assets/SEED bg vid_1762525859201.mp4";

interface HeroSectionProps {
  heroImage: string;
  onGetStarted?: () => void;
  onExplore?: () => void;
}

const TYPEWRITER_WORDS = ['sustainable', 'lasting', 'regenerative', 'measurable', 'global', 'transformative'];

export default function HeroSection({ heroImage, onGetStarted, onExplore }: HeroSectionProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [videoEnded, setVideoEnded] = useState(false);
  const wordIndexRef = useRef(0);
  const charIndexRef = useRef(0);
  const isDeletingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    if (mediaQuery.matches) {
      setDisplayText('sustainable');
      setVideoEnded(true);
    }
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches) {
        setDisplayText('sustainable');
        setVideoEnded(true);
      } else {
        setVideoEnded(false);
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(() => {
            // Autoplay might be blocked, silently fail
          });
        }
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const type = () => {
      const currentWord = TYPEWRITER_WORDS[wordIndexRef.current];
      const isDeleting = isDeletingRef.current;
      const charIndex = charIndexRef.current;

      if (!isDeleting) {
        if (charIndex < currentWord.length) {
          charIndexRef.current++;
          setDisplayText(currentWord.substring(0, charIndexRef.current));
          timeoutRef.current = setTimeout(type, 150);
        } else {
          timeoutRef.current = setTimeout(() => {
            isDeletingRef.current = true;
            type();
          }, 2000);
        }
      } else {
        if (charIndex > 0) {
          charIndexRef.current--;
          setDisplayText(currentWord.substring(0, charIndexRef.current));
          timeoutRef.current = setTimeout(type, 100);
        } else {
          isDeletingRef.current = false;
          timeoutRef.current = setTimeout(() => {
            wordIndexRef.current = (wordIndexRef.current + 1) % TYPEWRITER_WORDS.length;
            type();
          }, 2000);
        }
      }
    };

    timeoutRef.current = setTimeout(type, 150);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [prefersReducedMotion]);

  const handleVideoEnd = () => {
    setVideoEnded(true);
  };

  return (
    <MotionConfig reducedMotion={prefersReducedMotion ? "always" : "never"}>
      <div className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0">
          {/* Video Background */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={handleVideoEnd}
            poster={heroImage}
            className={`w-full h-full object-cover transition-opacity duration-1000 ${
              videoEnded ? 'opacity-0' : 'opacity-100'
            }`}
            style={{ display: prefersReducedMotion ? 'none' : 'block' }}
          >
            <source src={heroVideoSrc} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          {/* Static Image Background (fades in when video ends) */}
          <img 
            src={heroImage} 
            alt="Agricultural landscape" 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              videoEnded || prefersReducedMotion ? 'opacity-100' : 'opacity-0'
            }`}
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
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="text-[36px] sm:text-[40px] md:text-[52px] lg:text-[64px] font-bold text-white tracking-[-0.02em] drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)] leading-[1.1]"
          >
            Plant capital.<br/>
            Grow <span className="inline-block min-w-0 md:min-w-[200px] text-left text-emerald-400" data-testid="typewriter-text">{displayText}{!prefersReducedMotion && <span className="animate-pulse">|</span>}</span> impact.
          </motion.h1>
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
            className="text-[18px] md:text-[24px] lg:text-[28px] text-white/95 font-normal tracking-[0.01em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)] mt-3"
          >
            The Regenerative Capital Exchange
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
            className="text-[16px] md:text-[18px] lg:text-[20px] text-white/90 font-light max-w-3xl mx-auto leading-relaxed drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)] mt-4"
          >
            Connecting capital with verified agricultural opportunities across Africa.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
            className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center pt-8 md:pt-12 w-full px-2 sm:px-0"
          >
            <button
              onClick={onGetStarted}
              className="group relative w-full sm:max-w-[340px] bg-gradient-to-br from-blue-600 to-blue-800 text-white px-6 py-4 rounded-2xl overflow-hidden transition-all duration-300 shadow-[0_8px_24px_rgba(37,99,235,0.35),0_4px_8px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_32px_rgba(37,99,235,0.45),0_8px_16px_rgba(0,0,0,0.2)]"
              data-testid="button-become-primer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              <div className="relative flex flex-col gap-1.5">
                <span className="text-[17px] sm:text-[18px] font-bold tracking-tight">Become a Primer</span>
                <span className="text-[13px] sm:text-[14px] font-normal opacity-90 leading-relaxed">
                  Fund agricultural deployment and participate in the regenerative cycle
                </span>
              </div>
            </button>
            <button
              onClick={onExplore}
              className="group relative w-full sm:max-w-[340px] bg-gradient-to-br from-emerald-500 to-emerald-700 text-white px-6 py-4 rounded-2xl overflow-hidden transition-all duration-300 shadow-[0_8px_24px_rgba(16,185,129,0.35),0_4px_8px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.45),0_8px_16px_rgba(0,0,0,0.2)]"
              data-testid="button-become-regenerator"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              <div className="relative flex flex-col gap-1.5">
                <span className="text-[17px] sm:text-[18px] font-bold tracking-tight">Become a Regenerator</span>
                <span className="text-[13px] sm:text-[14px] font-normal opacity-90 leading-relaxed">
                  Acquire and trade tokens backed by verified agricultural projects
                </span>
              </div>
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1, ease: "easeOut" }}
            className="flex flex-wrap sm:flex-nowrap gap-4 sm:gap-6 justify-center pt-10 sm:pt-14 text-white"
          >
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1, ease: "easeOut" }}
              whileHover={{ scale: 1.05, y: -2 }}
              className="flex items-center gap-2 px-3.5 py-2 bg-black/20 backdrop-blur-[4px] rounded-lg cursor-pointer border border-white/10 hover:bg-black/30 hover:border-emerald-500/30" 
              data-testid="badge-blockchain"
            >
              <motion.div whileHover={{ scale: 1.1, color: "#34D399" }}>
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] text-emerald-500" />
              </motion.div>
              <span className="text-[14px] sm:text-[15px] font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Blockchain Verified</span>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.1, ease: "easeOut" }}
              whileHover={{ scale: 1.05, y: -2 }}
              className="flex items-center gap-2 px-3.5 py-2 bg-black/20 backdrop-blur-[4px] rounded-lg cursor-pointer border border-white/10 hover:bg-black/30 hover:border-emerald-500/30" 
              data-testid="badge-global"
            >
              <motion.div whileHover={{ scale: 1.1, color: "#34D399" }}>
                <Globe className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] text-emerald-500" />
              </motion.div>
              <span className="text-[14px] sm:text-[15px] font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Trusted Globally</span>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.2, ease: "easeOut" }}
              whileHover={{ scale: 1.05, y: -2 }}
              className="flex items-center gap-2 px-3.5 py-2 bg-black/20 backdrop-blur-[4px] rounded-lg cursor-pointer border border-white/10 hover:bg-black/30 hover:border-emerald-500/30" 
              data-testid="badge-pipeline"
            >
              <motion.div whileHover={{ scale: 1.1, color: "#34D399" }}>
                <Sprout className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] text-emerald-500" />
              </motion.div>
              <span className="text-[14px] sm:text-[15px] font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Farm-to-Token Pipeline</span>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.3, ease: "easeOut" }}
              whileHover={{ scale: 1.05, y: -2 }}
              className="flex items-center gap-2 px-3.5 py-2 bg-black/20 backdrop-blur-[4px] rounded-lg cursor-pointer border border-white/10 hover:bg-black/30 hover:border-emerald-500/30" 
              data-testid="badge-regenerative"
            >
              <motion.div whileHover={{ scale: 1.1, color: "#34D399" }}>
                <Leaf className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] text-emerald-500" />
              </motion.div>
              <span className="text-[14px] sm:text-[15px] font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Regenerative Capital Model</span>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, delay: 1.5, ease: "easeOut" }}
          className="absolute bottom-6 right-8 flex flex-col items-center gap-2 text-white opacity-80 hover:opacity-100 cursor-pointer z-20 transition-opacity duration-300"
          onClick={() => window.scrollTo({ 
            top: window.innerHeight, 
            behavior: prefersReducedMotion ? 'auto' : 'smooth' 
          })}
          data-testid="scroll-indicator"
        >
          <span className="text-sm font-medium tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Scroll to explore</span>
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 2.5 }}
          >
            <ChevronDown className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
          </motion.div>
        </motion.div>
      </div>
      </div>
    </MotionConfig>
  );
}
