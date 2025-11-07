import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sprout, ArrowRight, Leaf } from "lucide-react";

export default function FinalCTASection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative py-24 md:py-32 px-4 bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,54,0.1)_0%,transparent_70%)]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 md:p-16 shadow-2xl"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-3 px-6 py-3 mb-6 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full shadow-lg shadow-emerald-500/30">
            <Sprout className="w-4 h-4 text-white" />
            <span className="text-white text-xs font-bold tracking-[0.15em] uppercase">
              Join The Movement
            </span>
          </div>

          {/* Title */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent tracking-tight leading-tight" data-testid="heading-final-cta">
            Ready to Fund the Future of Agriculture?
          </h2>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed" data-testid="text-final-cta-subtitle">
            Join thousands of participants supporting regenerative farms across Africa.
            Start with as little as $500 and make a real impact.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button
              className="group bg-gradient-to-br from-amber-500 to-amber-700 hover:opacity-90 text-slate-950 px-9 py-6 text-base font-semibold shadow-lg shadow-amber-500/40 hover:shadow-amber-500/60 transition-all duration-300 hover:-translate-y-1"
              data-testid="button-get-started-final"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              className="bg-transparent border-2 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500 px-9 py-6 text-base font-semibold transition-all duration-300 hover:-translate-y-1"
              data-testid="button-browse-farms-final"
            >
              <span>Browse Farms</span>
              <Leaf className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Stats */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 md:gap-12 pt-12 border-t border-white/10">
            <div className="text-center" data-testid="stat-total-funded">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-amber-500 to-emerald-500 bg-clip-text text-transparent mb-2">
                $2.4M+
              </div>
              <div className="text-sm text-slate-500 uppercase tracking-wider">
                Total Funded
              </div>
            </div>

            <div className="hidden sm:block w-px h-12 bg-white/10" />

            <div className="text-center" data-testid="stat-active-farms">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-amber-500 to-emerald-500 bg-clip-text text-transparent mb-2">
                47
              </div>
              <div className="text-sm text-slate-500 uppercase tracking-wider">
                Active Farms
              </div>
            </div>

            <div className="hidden sm:block w-px h-12 bg-white/10" />

            <div className="text-center" data-testid="stat-participants">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-amber-500 to-emerald-500 bg-clip-text text-transparent mb-2">
                1,200+
              </div>
              <div className="text-sm text-slate-500 uppercase tracking-wider">
                Participants
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
