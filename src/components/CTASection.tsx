import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 px-6 bg-gradient-hero relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent rounded-full blur-3xl"></div>
      </div>
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Ready to Replace Your DevOps Team?</span>
        </div>
        
        <h2 className="text-4xl md:text-6xl font-bold mb-6">
          Join The
          <br />
          <span className="bg-gradient-primary bg-clip-text text-transparent">
            DevOps Revolution
          </span>
        </h2>
        
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
          Start your free trial today and experience what it's like to have a DevOps team that never sleeps, 
          never makes mistakes, and costs a fraction of traditional hiring.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Link to="/auth">
            <Button variant="hero" size="lg" className="text-lg px-8 py-4 shadow-glow">
              Sign in to Dashboard
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-2xl font-bold text-primary mb-2">Free for 30 days</div>
            <div className="text-muted-foreground">Full platform access</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary mb-2">Setup in 5 minutes</div>
            <div className="text-muted-foreground">Zero configuration needed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary mb-2">Cancel anytime</div>
            <div className="text-muted-foreground">No long-term contracts</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;