import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  GitBranch, 
  Server, 
  Activity, 
  Zap, 
  Shield, 
  TrendingUp,
  RefreshCw,
  Bell
} from "lucide-react";

const features = [
  {
    icon: GitBranch,
    title: "Zero-Config CI/CD",
    description: "Detect new code → Build → Test → Deploy automatically. No YAML files, no configuration.",
    color: "text-blue-500"
  },
  {
    icon: Server,
    title: "Auto Infrastructure", 
    description: "Automatically create servers, databases, containers using cloud APIs. Scale on demand.",
    color: "text-purple-500"
  },
  {
    icon: Activity,
    title: "Smart Monitoring",
    description: "Auto-setup Prometheus, Grafana, and custom dashboards. Get insights without setup.",
    color: "text-green-500"
  },
  {
    icon: Zap,
    title: "Instant Scaling",
    description: "Auto-scale apps based on CPU, memory, or traffic patterns. Never go down again.",
    color: "text-yellow-500"
  },
  {
    icon: Shield,
    title: "Security First",
    description: "Auto-scan vulnerabilities in code, containers, and dependencies. Fix before deploy.",
    color: "text-red-500"
  },
  {
    icon: RefreshCw,
    title: "Smart Rollbacks",
    description: "Detect failures and rollback deployments instantly. Self-healing infrastructure.",
    color: "text-indigo-500"
  },
  {
    icon: Bell,
    title: "Intelligent Alerts",
    description: "Auto-configure alerts via Slack/Email. Get notified about what matters.",
    color: "text-pink-500"
  },
  {
    icon: TrendingUp,
    title: "Cost Optimization",
    description: "Shut down idle resources, recommend cheaper configs. Save 40% on cloud costs.",
    color: "text-cyan-500"
  }
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Core Capabilities
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything your DevOps team does, but automated, faster, and never sleeps.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg bg-gradient-secondary flex items-center justify-center mb-4 group-hover:shadow-glow transition-all duration-300`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-lg font-semibold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;