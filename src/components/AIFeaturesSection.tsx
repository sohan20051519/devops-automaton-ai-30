import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  FileCode2, 
  MessageSquare, 
  Lightbulb,
  Search,
  Wrench
} from "lucide-react";

const aiFeatures = [
  {
    icon: Brain,
    title: "Auto-Troubleshooting AI",
    description: "Reads logs & metrics, suggests or automatically runs fixes. No more 3 AM debugging sessions.",
    highlight: "99% Issue Resolution"
  },
  {
    icon: FileCode2,
    title: "Auto YAML/Script Generator", 
    description: "Generates Terraform, Helm, Dockerfiles from UI or natural language. Just describe what you need.",
    highlight: "Zero Configuration"
  },
  {
    icon: MessageSquare,
    title: "Natural Language CLI",
    description: "'Deploy this React app to AWS with autoscaling' → Done. Control your entire infrastructure with plain English.",
    highlight: "Human-Like Interface"
  },
  {
    icon: Lightbulb,
    title: "Intelligent CI/CD Pipelines",
    description: "Learns from past builds/tests to optimize future runs. Gets smarter with every deployment.",
    highlight: "Self-Learning"
  },
  {
    icon: Search,
    title: "Infra Drift Detection",
    description: "Detects and fixes infrastructure mismatches automatically. Your infra stays exactly as intended.",
    highlight: "Always Consistent"
  },
  {
    icon: Wrench,
    title: "Self-Healing Infrastructure",
    description: "Auto-restarts services, repairs configs, swaps regions if failures occur. True autonomous operations.",
    highlight: "24/7 Auto-Repair"
  }
];

const AIFeaturesSection = () => {
  return (
    <section className="py-24 px-6 bg-gradient-secondary">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
            <Brain className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Next-Level AI Features</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Features That Could Replace
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              DevOps Jobs
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            AI-powered capabilities that go beyond automation to true autonomous DevOps operations.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {aiFeatures.map((feature, index) => (
            <Card key={index} className="group hover:shadow-card transition-all duration-300 hover:-translate-y-2 bg-card/80 backdrop-blur-sm border-border/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-primary text-primary-foreground text-xs font-semibold rounded-bl-lg">
                {feature.highlight}
              </div>
              <CardHeader className="pb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:shadow-glow transition-all duration-300">
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl font-bold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center">
          <Button variant="glow" size="lg" className="text-lg px-8 py-4">
            See AI in Action
          </Button>
        </div>
      </div>
    </section>
  );
};

export default AIFeaturesSection;