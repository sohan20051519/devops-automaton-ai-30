import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeploymentLog {
  id: string;
  event: string;
  repo: string;
  region?: string;
  instance_type?: string;
  status: string;
  error_message?: string;
  image_url?: string;
  created_at: string;
}

const DeploymentLogs = () => {
  const [logs, setLogs] = useState<DeploymentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('deployment_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching logs:', error);
        toast({
          title: "Error",
          description: "Failed to fetch deployment logs",
          variant: "destructive",
        });
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'in progress':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Success</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Failed</Badge>;
      case 'in progress':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">In Progress</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getRepoName = (repoUrl: string) => {
    const match = repoUrl.match(/\/([^\/]+)(?:\.git)?$/);
    return match ? match[1] : repoUrl;
  };

  return (
    <Card className="h-full flex flex-col bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Deployment Logs
            </CardTitle>
            <CardDescription>
              Recent deployment activity and status updates
            </CardDescription>
          </div>
          <Button
            onClick={fetchLogs}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No deployment logs found. Start a deployment to see logs here.
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="border border-border/50 rounded-lg p-4 bg-background/50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className="font-medium">{log.event}</span>
                    </div>
                    {getStatusBadge(log.status)}
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <span className="break-all"><strong>Repo:</strong> {getRepoName(log.repo)}</span>
                      {log.region && <span><strong>Region:</strong> {log.region}</span>}
                      {log.instance_type && <span><strong>Type:</strong> {log.instance_type}</span>}
                    </div>
                    
                    {log.image_url && (
                      <div className="break-all"><strong>Image:</strong> {log.image_url}</div>
                    )}
                    
                    {log.error_message && (
                      <div className="text-red-600"><strong>Error:</strong> {log.error_message}</div>
                    )}
                    
                    <div className="text-xs text-muted-foreground/70 mt-2">
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default DeploymentLogs;