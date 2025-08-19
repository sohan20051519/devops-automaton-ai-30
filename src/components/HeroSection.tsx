import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Zap } from "lucide-react";
import heroImage from "@/assets/hero-devops.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="DevOps Automation Dashboard" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">AI-Powered DevOps Automation</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
          Replace Your DevOps Team
          <br />
          <span className="bg-gradient-primary bg-clip-text text-transparent">
            With AI Automation
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed">
          The world's first fully automated DevOps platform. Zero configuration CI/CD, 
          self-healing infrastructure, and AI-powered troubleshooting that works 24/7.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Link to="/auth">
            <Button variant="hero" size="lg" className="text-lg px-8 py-4">
              Open Dashboard
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
            <div className="text-muted-foreground">Uptime Guaranteed</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">10x</div>
            <div className="text-muted-foreground">Faster Deployments</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">$0</div>
            <div className="text-muted-foreground">DevOps Hiring Costs</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;