import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Rocket, Github, Loader2, CheckCircle, XCircle, Lock, Download, Package, Upload, Cloud, Server, Monitor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeploymentStep {
  id: string;
  name: string;
  icon: any;
  status: 'pending' | 'running' | 'completed' | 'error';
  description: string;
}

const FullDeploymentSection = () => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoToken, setRepoToken] = useState('');
  const [repoType, setRepoType] = useState('github');
  const [region, setRegion] = useState('ap-south-1');
  const [instanceType, setInstanceType] = useState('t2.micro');
  const [deploymentStatus, setDeploymentStatus] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [deploymentSteps, setDeploymentSteps] = useState<DeploymentStep[]>([]);
  const { toast } = useToast();

  const steps: DeploymentStep[] = [
    { id: 'download', name: 'Download Repository', icon: Download, status: 'pending', description: 'Fetching your code from repository' },
    { id: 'analyze', name: 'Analyze Project', icon: Package, status: 'pending', description: 'Detecting project type and dependencies' },
    { id: 'build', name: 'Build Docker Image', icon: Package, status: 'pending', description: 'Creating containerized application' },
    { id: 'upload', name: 'Upload to Registry', icon: Upload, status: 'pending', description: 'Pushing image to DockerHub' },
    { id: 'provision', name: 'Provision AWS', icon: Cloud, status: 'pending', description: 'Setting up cloud infrastructure' },
    { id: 'deploy', name: 'Deploy Application', icon: Server, status: 'pending', description: 'Launching your application' },
    { id: 'monitor', name: 'Setup Monitoring', icon: Monitor, status: 'pending', description: 'Configuring logs and health checks' }
  ];

  useEffect(() => {
    if (isDeploying) {
      setDeploymentSteps([...steps]);
      simulateDeploymentProgress();
    } else {
      setDeploymentSteps([]);
      setCurrentStep(0);
    }
  }, [isDeploying]);

  const detectRepoType = (url: string) => {
    if (url.includes('github.com')) return 'github';
    if (url.includes('gitlab.com')) return 'gitlab';
    if (url.includes('bitbucket.org')) return 'bitbucket';
    return 'github';
  };

  const simulateDeploymentProgress = () => {
    const stepDurations = [2000, 3000, 5000, 4000, 6000, 3000, 2000]; // milliseconds for each step
    
    stepDurations.forEach((duration, index) => {
      setTimeout(() => {
        setDeploymentSteps(prev => prev.map((step, i) => {
          if (i === index) return { ...step, status: 'running' };
          if (i < index) return { ...step, status: 'completed' };
          return step;
        }));
        setCurrentStep(index);
      }, stepDurations.slice(0, index).reduce((sum, d) => sum + d, 0));

      setTimeout(() => {
        setDeploymentSteps(prev => prev.map((step, i) => {
          if (i === index) return { ...step, status: 'completed' };
          return step;
        }));
      }, stepDurations.slice(0, index + 1).reduce((sum, d) => sum + d, 0));
    });
  };

  const handleFullDeploy = async () => {
    if (!repoUrl) {
      toast({
        title: "Error", 
        description: "Please enter a repository URL",
        variant: "destructive",
      });
      return;
    }

    const detectedType = detectRepoType(repoUrl);
    setRepoType(detectedType);
    setIsDeploying(true);
    setDeploymentStatus(null);

    try {
      console.log('Starting full deployment...');
      
      // Ensure Authorization header with current user's JWT is sent
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const { data, error } = await supabase.functions.invoke('full-deploy', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: {
          repo: repoUrl,
          repo_type: detectedType,
          repo_token: repoToken || undefined,
          region,
          instance_type: instanceType
        }
      });

      if (error) {
        console.error('Deployment error:', error);
        setDeploymentSteps(prev => prev.map(step => ({ ...step, status: 'error' })));
        throw new Error(error.message);
      }

      console.log('Deployment response:', data);

      if (data.success) {
        setDeploymentStatus('success');
        // Ensure all steps are completed
        setTimeout(() => {
          setDeploymentSteps(prev => prev.map(step => ({ ...step, status: 'completed' })));
        }, 25000); // Total duration of all steps
        
        toast({
          title: "🚀 Deployment Successful!",
          description: `Your app is deployed to AWS ${region}`,
        });
      } else {
        throw new Error(data.error || 'Deployment failed');
      }

    } catch (error) {
      console.error('Full deployment failed:', error);
      setDeploymentStatus('error');
      setDeploymentSteps(prev => prev.map(step => ({ ...step, status: 'error' })));
      toast({
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setIsDeploying(false);
      }, isDeploying ? 25000 : 0);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex-1 flex flex-col">
        <div className="text-center py-3 sm:py-4">
          <h2 className="text-xl sm:text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            One-Click DevOps Deployment
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            Deploy any GitHub repo to AWS in seconds with automated infrastructure.
          </p>
        </div>

        <div className={`grid grid-cols-1 gap-4 flex-1`}>
          {/* Left Panel - Configuration */}
          <Card className={`bg-card/50 backdrop-blur-sm border-border/50 ${isDeploying ? 'h-fit' : 'h-full'}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Rocket className="w-4 h-4 text-primary" />
                Deploy Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="repo-url" className="text-sm">Repository URL</Label>
                <div className="relative">
                  <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="repo-url"
                    placeholder="https://github.com/username/repository"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="pl-10 h-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="repo-token" className="text-sm">Access Token (Optional)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="repo-token"
                    type="password"
                    placeholder="For private repositories"
                    value={repoToken}
                    onChange={(e) => setRepoToken(e.target.value)}
                    className="pl-10 h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="region" className="text-sm">AWS Region</Label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ap-south-1">Mumbai</SelectItem>
                      <SelectItem value="us-east-1">N. Virginia</SelectItem>
                      <SelectItem value="us-west-2">Oregon</SelectItem>
                      <SelectItem value="eu-west-1">Ireland</SelectItem>
                      <SelectItem value="ap-southeast-1">Singapore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instance-type" className="text-sm">Instance Type</Label>
                  <Select value={instanceType} onValueChange={setInstanceType}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="t2.micro">t2.micro</SelectItem>
                      <SelectItem value="t3.small">t3.small</SelectItem>
                      <SelectItem value="t3.medium">t3.medium</SelectItem>
                      <SelectItem value="t3.large">t3.large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleFullDeploy}
                disabled={isDeploying || !repoUrl}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold h-10"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    Deploy to AWS Now
                  </>
                )}
              </Button>

              {deploymentStatus && (
                <div className={`flex items-center justify-center p-3 rounded-lg text-sm ${
                  deploymentStatus === 'success' 
                    ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
                    : 'bg-red-500/10 text-red-600 border border-red-500/20'
                }`}>
                  {deploymentStatus === 'success' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Deployment completed!
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Deployment failed.
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deployment Progress - appears only after starting deploy */}
          {isDeploying && (
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Monitor className="w-4 h-4 text-primary" />
                Deployment Progress
              </CardTitle>
              <CardDescription className="text-sm">
                Real-time deployment status and progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                  {deploymentSteps.map((step) => (
                    <div key={step.id} className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-card/30">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                        step.status === 'pending' ? 'bg-muted' :
                        step.status === 'running' ? 'bg-primary animate-pulse' :
                        step.status === 'completed' ? 'bg-green-500' :
                        'bg-red-500'
                      }`}>
                        {step.status === 'running' ? (
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : step.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : step.status === 'error' ? (
                          <XCircle className="w-5 h-5 text-white" />
                        ) : (
                          <step.icon className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-xs sm:text-sm leading-tight">{step.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default FullDeploymentSection;