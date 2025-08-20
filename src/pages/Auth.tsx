import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Zap, Github } from 'lucide-react';

const Auth = () => {
  const { signInWithGithub, user, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/deploy');
    }
  }, [user, navigate]);

  const handleGithub = async () => {
    try {
      await signInWithGithub();
    } catch (error: any) {
      toast({
        title: "❌ Login Error",
        description: error.message || "Failed to start GitHub login",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">OneOps ⚡ Platform</span>
          </div>
          
          <h1 className="text-3xl font-bold mb-2">
            Welcome to 
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              DevOps Dashboard
            </span>
          </h1>
          
          <p className="text-muted-foreground">
            Sign in to access your infrastructure automation tools
          </p>
        </div>

        <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50 shadow-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Github className="w-5 h-5 text-primary" />
              Sign in with GitHub
            </CardTitle>
            <CardDescription>
              Authenticate using your GitHub account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="pt-2">
              <Button
                type="button"
                variant="hero"
                className="w-full"
                onClick={handleGithub}
                disabled={isLoading}
              >
                <Github className="w-4 h-4 mr-2" />
                Continue with GitHub
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;