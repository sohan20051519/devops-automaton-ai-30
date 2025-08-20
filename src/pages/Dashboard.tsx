import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import FullDeploymentSection from '@/components/FullDeploymentSection';
import DeploymentLogs from '@/components/DeploymentLogs';
import ProjectsSection from '@/components/ProjectsSection';
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold">OneOps Dashboard</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">DevOps Automation Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-primary" />
                <span className="font-medium hidden sm:inline">{user.name || user.email?.split('@')[0] || 'User'}</span>
                <span className="font-medium sm:hidden">{user.name?.split(' ')[0] || user.email?.split('@')[0] || 'User'}</span>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="gap-1 px-2 sm:px-3"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        <FullDeploymentSection />
        <ProjectsSection />
        <DeploymentLogs />
      </main>
    </div>
  );
};

export default Dashboard;