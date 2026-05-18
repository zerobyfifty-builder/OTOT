import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute guards tourist/end-user pages.
 * It checks the user's role and redirects non-tourist users
 * (institutional partners, owners, super admins, etc.)
 * to their correct portal dashboard.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        navigate('/auth/login');
        return;
      }

      try {
        const { data: userRole } = await supabase
          .rpc('get_user_role', { input_user_id: user.id });

        // Redirect users with specific portal roles to their portal
        switch (userRole) {
          case 'super_admin':
            navigate('/admin', { replace: true });
            return;
          case 'institutional_partner':
            navigate('/institutional/dashboard', { replace: true });
            return;
          case 'business_partner':
            navigate('/lodge/dashboard', { replace: true });
            return;
          case 'owner':
            navigate('/owner/dashboard', { replace: true });
            return;
          case 'travel_agent':
            navigate('/agent/dashboard', { replace: true });
            return;
          default:
            // null or 'user' or any other role → tourist, allow access
            setAuthorized(true);
            break;
        }
      } catch (error) {
        console.error('[PROTECTED_ROUTE] Error checking role:', error);
        // On error, allow access to avoid locking out users
        setAuthorized(true);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkRole();
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !authorized) {
    return null;
  }

  return <>{children}</>;
};
