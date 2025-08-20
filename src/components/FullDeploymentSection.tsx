import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Rocket, Github, Loader2, CheckCircle, XCircle, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const FullDeploymentSection = () => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoToken, setRepoToken] = useState('');
  const [repoType, setRepoType] = useState('github');
  const [region, setRegion] = useState('us-east-1');
  const [instanceType, setInstanceType] = useState('t2.micro');
  const [deploymentStatus, setDeploymentStatus] = useState<string | null>(null);
  const { toast } = useToast();

  const detectRepoType = (url: string) => {
    if (url.includes('github.com')) return 'github';
    if (url.includes('gitlab.com')) return 'gitlab';
    if (url.includes('bitbucket.org')) return 'bitbucket';
    return 'github';
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
        throw new Error(error.message);
      }

      console.log('Deployment response:', data);

      if (data.success) {
        setDeploymentStatus('success');
        toast({
          title: "🚀 Deployment Successful!",
          description: `Your app is being deployed to AWS ${region}`,
        });
      } else {
        throw new Error(data.error || 'Deployment failed');
      }

    } catch (error) {
      console.error('Full deployment failed:', error);
      setDeploymentStatus('error');
      toast({
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <section className="py-10 sm:py-20 bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            One-Click DevOps Deployment
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Deploy any GitHub repo to AWS in seconds. We handle the Docker build, push, and infrastructure automatically.
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              Full Stack Deployment
            </CardTitle>
            <CardDescription>
              Enter your repository URL and deployment preferences below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="repo-url">Repository URL</Label>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="repo-url"
                  placeholder="https://github.com/username/repository (or GitLab/Bitbucket)"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">Supports GitHub, GitLab, and Bitbucket repositories</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="repo-token">Access Token (Optional - for private repos)</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="repo-token"
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxx (GitHub) or glpat-xxxxxxxxxxxx (GitLab)"
                  value={repoToken}
                  onChange={(e) => setRepoToken(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">Required only for private repositories. Generate from your repository settings.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="region">AWS Region</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                    <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                    <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                    <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instance-type">Instance Type</Label>
                <Select value={instanceType} onValueChange={setInstanceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select instance type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="t2.micro">t2.micro (Free tier)</SelectItem>
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
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold py-3 h-auto"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deploying... (This may take a few minutes)
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Deploy to AWS Now
                </>
              )}
            </Button>

            {deploymentStatus && (
              <div className={`flex items-center justify-center p-4 rounded-lg ${
                deploymentStatus === 'success' 
                  ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
                  : 'bg-red-500/10 text-red-600 border border-red-500/20'
              }`}>
                {deploymentStatus === 'success' ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Deployment completed successfully!
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 mr-2" />
                    Deployment failed. Please check the logs.
                  </>
                )}
              </div>
            )}

            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
              <p className="font-medium mb-1">What happens when you deploy:</p>
              <ul className="space-y-1">
                <li>• Downloads your repository (public or private)</li>
                <li>• Auto-detects language and generates Dockerfile if needed</li>
                <li>• Builds Docker image automatically</li>
                <li>• Pushes image to DockerHub</li>
                <li>• Provisions AWS infrastructure</li>
                <li>• Deploys your application with monitoring</li>
                <li>• Provides live logs and deployment status</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default FullDeploymentSection;