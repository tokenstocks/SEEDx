import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeaturedFarmsSection from "@/components/FeaturedFarmsSection";
import WhySEEDxSection from "@/components/WhySEEDxSection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";
import heroImage from '@assets/image_1762495662484.png';

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection 
        heroImage={heroImage}
        onGetStarted={() => setLocation('/register')}
        onExplore={() => setLocation('/register')}
      />
      <HowItWorksSection />
      <FeaturedFarmsSection />
      <WhySEEDxSection />
      <FAQSection />
      <Footer />
    </div>
  );
}
