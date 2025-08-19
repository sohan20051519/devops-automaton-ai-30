import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, Github, Cloud, Zap, Shield, Monitor } from "lucide-react";
import { useState } from "react";

const DeploymentSection = () => {
  const { toast } = useToast();
  const [isDeployingAWS, setIsDeployingAWS] = useState(false);
  const [isDeployingGitHub, setIsDeployingGitHub] = useState(false);

  const handleAWSDeployment = async () => {
    setIsDeployingAWS(true);
    try {
      const { data, error } = await supabase.functions.invoke('aws-trigger', {
        body: {
          region: "us-east-1",
          instanceType: "t2.micro"
        }
      });

      if (error) throw error;

      toast({
        title: "✅ AWS Deploy Triggered",
        description: `Infrastructure deployment started in ${data.region}`,
      });
      
      console.log('AWS deployment response:', data);
    } catch (error) {
      console.error('AWS deployment failed:', error);
      toast({
        title: "❌ AWS Deploy Failed", 
        description: error.message || "Failed to trigger AWS deployment",
        variant: "destructive",
      });
    } finally {
      setIsDeployingAWS(false);
    }
  };

  const handleGitHubDeployment = async () => {
    setIsDeployingGitHub(true);
    try {
      const { data, error } = await supabase.functions.invoke('github-trigger', {
        body: {
          repo: "yourusername/yourrepo",
          workflow: "deploy.yml"
        }
      });

      if (error) throw error;

      toast({
        title: "✅ GitHub Action Triggered",
        description: "Deployment workflow started successfully",
      });
      
      console.log('GitHub deployment response:', data);
    } catch (error) {
      console.error('GitHub deployment failed:', error);
      toast({
        title: "❌ GitHub Deploy Failed",
        description: error.message || "Failed to trigger GitHub deployment",
        variant: "destructive",
      });
    } finally {
      setIsDeployingGitHub(false);
    }
  };

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">One-Click Infrastructure</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Deploy Infrastructure in
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Seconds, Not Hours
            </span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Experience the power of automated DevOps. Deploy to AWS, trigger GitHub Actions, 
            and manage your entire infrastructure with simple button clicks.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* AWS Deployment Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50 shadow-card hover:shadow-glow transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Cloud className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">AWS Infrastructure</CardTitle>
                  <CardDescription>Deploy EC2 instances, auto-scaling groups, and load balancers</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Region:</span>
                  <span className="font-medium">us-east-1</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Instance Type:</span>
                  <span className="font-medium">t2.micro</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Auto-Scaling:</span>
                  <span className="font-medium text-primary">Enabled</span>
                </div>
              </div>
              
              <Button 
                onClick={handleAWSDeployment}
                disabled={isDeployingAWS}
                className="w-full"
                variant="hero"
              >
                {isDeployingAWS ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    🚀 Deploy Infrastructure
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* GitHub Actions Card */}
          <Card className="border-accent/20 bg-gradient-to-br from-card to-card/50 shadow-card hover:shadow-glow transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Github className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-xl">GitHub Actions</CardTitle>
                  <CardDescription>Trigger CI/CD pipelines and automated deployments</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Repository:</span>
                  <span className="font-medium">yourusername/yourrepo</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Workflow:</span>
                  <span className="font-medium">deploy.yml</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Branch:</span>
                  <span className="font-medium text-accent">main</span>
                </div>
              </div>
              
              <Button 
                onClick={handleGitHubDeployment}
                disabled={isDeployingGitHub}
                className="w-full"
                variant="glow"
              >
                {isDeployingGitHub ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Triggering...
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4 mr-2" />
                    Trigger GitHub Action
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center border-border/50 bg-card/50 hover:bg-card/80 transition-colors">
            <CardContent className="pt-6">
              <Shield className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Secure by Default</h3>
              <p className="text-sm text-muted-foreground">
                All deployments include security scanning, encryption, and compliance checks
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center border-border/50 bg-card/50 hover:bg-card/80 transition-colors">
            <CardContent className="pt-6">
              <Monitor className="w-8 h-8 text-accent mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Real-time Monitoring</h3>
              <p className="text-sm text-muted-foreground">
                Automatic setup of monitoring, alerting, and dashboard creation
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center border-border/50 bg-card/50 hover:bg-card/80 transition-colors">
            <CardContent className="pt-6">
              <Zap className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Auto-Scaling</h3>
              <p className="text-sm text-muted-foreground">
                Intelligent scaling based on traffic, CPU, and memory usage patterns
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default DeploymentSection;