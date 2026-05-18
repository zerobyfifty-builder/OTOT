import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface OwnerRouteProps {
  children: React.ReactNode;
}

export const OwnerRoute: React.FC<OwnerRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOwnerRole = async () => {
      if (!user) {
        navigate('/auth/login');
        return;
      }

      try {
        const { data: userRole, error } = await supabase
          .rpc('get_user_role', { input_user_id: user.id });

        if (userRole === 'owner') {
          setIsOwner(true);
        } else if (userRole === 'super_admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Error checking owner role:', error);
        navigate('/dashboard', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkOwnerRole();
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isOwner) {
    return null;
  }

  return <>{children}</>;
};
