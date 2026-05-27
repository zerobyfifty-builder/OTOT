import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface InstitutionalRouteProps {
  children: React.ReactNode;
}

export const InstitutionalRoute: React.FC<InstitutionalRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isInstitutional, setIsInstitutional] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkInstitutionalRole = async () => {
      console.log('[INSTITUTIONAL_ROUTE] Checking role for user:', user?.id);
      if (!user) {
        console.log('[INSTITUTIONAL_ROUTE] No user, redirecting to login');
        navigate('/auth/login');
        return;
      }

      try {
        // Use RPC function to avoid RLS recursion
        const { data: userRole, error: roleError } = await supabase
          .rpc('get_user_role', { input_user_id: user.id });
        
        console.log('[INSTITUTIONAL_ROUTE] User role from RPC:', userRole);
        console.log('[INSTITUTIONAL_ROUTE] Role error:', roleError);
        
        if (userRole === 'government_partner') {
          console.log('[INSTITUTIONAL_ROUTE] User is institutional partner, granting access');
          setIsInstitutional(true);
        } else {
          // Redirect non-institutional users to their appropriate dashboard
          console.log('[INSTITUTIONAL_ROUTE] User is not institutional, redirecting based on role:', userRole);
          if (userRole === 'super_admin') {
            navigate('/admin', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }
      } catch (error) {
        console.error('[INSTITUTIONAL_ROUTE] Error checking institutional role:', error);
        navigate('/dashboard', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkInstitutionalRole();
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isInstitutional) {
    return null;
  }

  return <>{children}</>;
};
