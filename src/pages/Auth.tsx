import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Shield, Zap } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('demo@oneops.dev');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        toast({
          title: "✅ Login Successful",
          description: "Welcome to OneOps Dashboard",
        });
        navigate('/dashboard');
      } else {
        toast({
          title: "❌ Login Failed",
          description: "Please check your credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Login Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">OneOps Platform</span>
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
              <Zap className="w-5 h-5 text-primary" />
              Demo Login
            </CardTitle>
            <CardDescription>
              Use any credentials to access the demo dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="hero"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Sign In to Dashboard
                    </>
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-6 p-3 bg-muted/20 rounded-lg border border-border/50">
              <p className="text-sm text-muted-foreground text-center">
                <strong>Demo Mode:</strong> Any email/password combination will work
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;