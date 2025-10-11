import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

export const SuperAdminRoute: React.FC<SuperAdminRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSuperAdminRole = async () => {
      if (!user) {
        navigate('/auth/login');
        return;
      }

      try {
        // Check if user has super_admin role
        const { data, error } = await supabase
          .from('users')
          .select(`
            role_id,
            roles!inner(name)
          `)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        const isSuperAdmin = data?.roles?.name === 'super_admin';
        setIsSuperAdmin(isSuperAdmin);

        if (!isSuperAdmin) {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error checking super admin role:', error);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkSuperAdminRole();
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return null;
  }

  return <>{children}</>;
};
