import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface StakeholderRouteProps {
  children: React.ReactNode;
}

export const StakeholderRoute: React.FC<StakeholderRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isStakeholder, setIsStakeholder] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStakeholderRole = async () => {
      if (!user) {
        navigate('/auth/login');
        return;
      }

      try {
        const { data: userRole, error } = await supabase
          .rpc('get_user_role', { input_user_id: user.id });

        if (userRole === 'stakeholder') {
          setIsStakeholder(true);
        } else if (userRole === 'super_admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Error checking stakeholder role:', error);
        navigate('/dashboard', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkStakeholderRole();
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isStakeholder) {
    return null;
  }

  return <>{children}</>;
};
