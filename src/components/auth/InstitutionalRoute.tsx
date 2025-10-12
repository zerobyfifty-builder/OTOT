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
      if (!user) {
        navigate('/auth/login');
        return;
      }

      try {
        const { data: userData } = await supabase
          .from('users')
          .select(`
            role_id,
            roles!inner(name)
          `)
          .eq('user_id', user.id)
          .maybeSingle();

        const userRole = userData?.roles?.name;
        
        if (userRole === 'institutional_partner') {
          setIsInstitutional(true);
        } else {
          // Redirect non-institutional users to their appropriate dashboard
          if (userRole === 'super_admin') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        }
      } catch (error) {
        console.error('Error checking institutional role:', error);
        navigate('/dashboard');
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
