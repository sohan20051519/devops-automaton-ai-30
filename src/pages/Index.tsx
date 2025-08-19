import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import AIFeaturesSection from "@/components/AIFeaturesSection";
import TechStackSection from "@/components/TechStackSection";
import DeploymentSection from "@/components/DeploymentSection";
import CTASection from "@/components/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <AIFeaturesSection />
        <TechStackSection />
        <DeploymentSection />
        <CTASection />
      </main>
    </div>
  );
};

export default Index;
