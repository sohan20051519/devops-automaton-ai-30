import { Button } from "@/components/ui/button";
import { Zap, Menu } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">OneOps</span>
          </div>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#ai" className="text-muted-foreground hover:text-foreground transition-colors">
              AI Capabilities
            </a>
            <a href="#integrations" className="text-muted-foreground hover:text-foreground transition-colors">
              Integrations
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
          </nav>
          
          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">
                Sign In
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="hero">
                Open Dashboard
              </Button>
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border/50">
            <nav className="flex flex-col gap-4 mt-4">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#ai" className="text-muted-foreground hover:text-foreground transition-colors">
                AI Capabilities
              </a>
              <a href="#integrations" className="text-muted-foreground hover:text-foreground transition-colors">
                Integrations
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <div className="flex flex-col gap-2 mt-4">
                <Link to="/auth">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/auth">
                  <Button variant="hero">Open Dashboard</Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;