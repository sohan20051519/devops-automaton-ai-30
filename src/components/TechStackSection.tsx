import { Card, CardContent } from "@/components/ui/card";

const techCategories = [
  {
    category: "Cloud Providers",
    tools: ["AWS", "Azure", "GCP", "DigitalOcean", "Vercel"],
    color: "from-blue-500 to-cyan-500"
  },
  {
    category: "Infrastructure as Code",
    tools: ["Terraform", "Pulumi", "CloudFormation"],
    color: "from-purple-500 to-pink-500"
  },
  {
    category: "Container & Orchestration",
    tools: ["Docker", "Kubernetes", "Helm", "OpenShift"],
    color: "from-green-500 to-emerald-500"
  },
  {
    category: "CI/CD Platforms",
    tools: ["GitHub Actions", "GitLab CI", "Jenkins", "CircleCI"],
    color: "from-orange-500 to-red-500"
  },
  {
    category: "Monitoring & Observability",
    tools: ["Prometheus", "Grafana", "Datadog", "New Relic"],
    color: "from-yellow-500 to-amber-500"
  },
  {
    category: "Security & Secrets",
    tools: ["Vault", "AWS Secrets", "Snyk", "Trivy", "SonarQube"],
    color: "from-indigo-500 to-purple-500"
  }
];

const TechStackSection = () => {
  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Integrates With
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Your Entire Stack
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Works seamlessly with all major DevOps tools and cloud providers. No vendor lock-in.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {techCategories.map((category, index) => (
            <Card key={index} className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
              <CardContent className="p-6">
                <div className={`w-full h-1 bg-gradient-to-r ${category.color} rounded-full mb-4`}></div>
                <h3 className="text-lg font-semibold mb-4 text-foreground">{category.category}</h3>
                <div className="flex flex-wrap gap-2">
                  {category.tools.map((tool, toolIndex) => (
                    <span 
                      key={toolIndex}
                      className="px-3 py-1 bg-secondary/50 text-secondary-foreground text-sm rounded-full border border-border/50 hover:bg-secondary/80 transition-colors"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-4 px-6 py-3 bg-gradient-primary rounded-full">
            <span className="text-primary-foreground font-semibold">50+ Integrations</span>
            <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse"></div>
            <span className="text-primary-foreground/80">Always Growing</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechStackSection;