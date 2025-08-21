import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import FullDeploymentSection from '@/components/FullDeploymentSection';

const Deploy = () => {
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
      <FullDeploymentSection />
    </div>
  );
};

export default Deploy;


