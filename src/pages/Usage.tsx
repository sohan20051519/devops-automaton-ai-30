import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BarChart3, Activity, ServerCog, Clock } from 'lucide-react';

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  last_deployed_at: string | null;
}

interface DeploymentLogRow {
  id: string;
  status: string;
  created_at: string;
}

const Usage = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [logs, setLogs] = useState<DeploymentLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: projectsData }, { data: logsData }] = await Promise.all([
          supabase.from('projects').select('id,name,status,last_deployed_at').order('last_deployed_at', { ascending: false }),
          supabase.from('deployment_logs').select('id,status,created_at').order('created_at', { ascending: false }).limit(200),
        ]);
        setProjects(projectsData || []);
        setLogs(logsData || []);
      } finally {
        setLoading(false);
      }
    };
    if (user) load();
  }, [user]);

  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const totalDeploys = logs.length;
    const successDeploys = logs.filter(l => (l.status || '').toLowerCase() === 'success').length;
    const failedDeploys = logs.filter(l => (l.status || '').toLowerCase() === 'failed').length;
    const lastDeployAt = projects.find(p => p.last_deployed_at)?.last_deployed_at || null;
    return { totalProjects, activeProjects, totalDeploys, successDeploys, failedDeploys, lastDeployAt };
  }, [projects, logs]);

  if (isLoading || !user) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><ServerCog className="w-4 h-4"/>Projects</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <Loader2 className="w-5 h-5 animate-spin"/> : stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">{stats.activeProjects} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><BarChart3 className="w-4 h-4"/>Deployments</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <Loader2 className="w-5 h-5 animate-spin"/> : stats.totalDeploys}</div>
            <p className="text-xs text-muted-foreground">{stats.successDeploys} success • {stats.failedDeploys} failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="w-4 h-4"/>Success Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading
                ? <Loader2 className="w-5 h-5 animate-spin"/>
                : stats.totalDeploys === 0 ? '—' : `${Math.round((stats.successDeploys / Math.max(stats.totalDeploys, 1)) * 100)}%`}
            </div>
            <p className="text-xs text-muted-foreground">Last 200 events</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Clock className="w-4 h-4"/>Last Deploy</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : (stats.lastDeployAt ? new Date(stats.lastDeployAt).toLocaleString() : '—')}
            </div>
            <p className="text-xs text-muted-foreground">Across your projects</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Button className="w-full" variant="outline" onClick={() => navigate('/deploy')}>Go to Deploy</Button>
        <Button className="w-full" variant="outline" onClick={() => navigate('/projects')}>Go to Projects</Button>
        <Button className="w-full" variant="outline" onClick={() => navigate('/logs')}>Go to Logs</Button>
      </div>
    </div>
  );
};

export default Usage;


