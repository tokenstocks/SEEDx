import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import InvestmentOpportunities from "@/components/InvestmentOpportunities";
import BenefitsSection from "@/components/BenefitsSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import heroImage from '@assets/stock_images/hopeful_young_farmer_6bd78b61.jpg';

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection 
        heroImage={heroImage}
        onGetStarted={() => setLocation('/register')}
        onExplore={() => setLocation('/browse')}
      />
      <HowItWorksSection />
      <InvestmentOpportunities />
      <BenefitsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
