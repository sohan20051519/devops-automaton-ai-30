import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import AIFeaturesSection from "@/components/AIFeaturesSection";
import TechStackSection from "@/components/TechStackSection";
import CTASection from "@/components/CTASection";
import { Shield, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <AIFeaturesSection />
        <TechStackSection />
        
        {/* Dashboard CTA Section */}
        <section className="py-24 px-6 bg-gradient-to-b from-muted/20 to-background">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Ready to Deploy?</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Access Your
              <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                DevOps Dashboard
              </span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
              Sign in to your personalized dashboard and start automating your infrastructure deployments with one-click actions.
            </p>
            
            <Link to="/auth">
              <Button variant="hero" size="lg" className="gap-3">
                <Shield className="w-5 h-5" />
                Access Dashboard
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>
        
        <CTASection />
      </main>
    </div>
  );
};

export default Index;
