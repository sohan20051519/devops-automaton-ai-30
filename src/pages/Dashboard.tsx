import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import FullDeploymentSection from '@/components/FullDeploymentSection';
import DeploymentLogs from '@/components/DeploymentLogs';
import { LogOut, User, Shield, Activity } from 'lucide-react';

const Dashboard = () => {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  if (isLoading || !user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold">OneOps Dashboard</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">DevOps Automation Platform</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Card className="bg-card/50 border-border/50 w-full sm:w-auto">
                <CardContent className="px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3">
                  <User className="w-4 h-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{user.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="gap-2 w-full sm:w-auto"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        <FullDeploymentSection />
        <DeploymentLogs />
      </main>
    </div>
  );
};

export default Dashboard;