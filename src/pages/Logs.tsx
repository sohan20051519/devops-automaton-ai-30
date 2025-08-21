import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DeploymentLogs from '@/components/DeploymentLogs';

const Logs = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  if (isLoading || !user) {
    return null;
  }

  return (
    <div className="h-[calc(100vh-0px)] lg:h-[calc(100vh-0px)]">
      <DeploymentLogs />
    </div>
  );
};

export default Logs;


