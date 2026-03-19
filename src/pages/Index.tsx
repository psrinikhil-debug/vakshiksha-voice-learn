import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import VoiceDemoSection from "@/components/VoiceDemoSection";
import ScenariosSection from "@/components/ScenariosSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import FooterSection from "@/components/FooterSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <VoiceDemoSection />
      <ScenariosSection />
      <HowItWorksSection />
      <FooterSection />
    </div>
  );
};

export default Index;
