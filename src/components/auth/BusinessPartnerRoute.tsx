import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface BusinessPartnerRouteProps {
  children: React.ReactNode;
}

export const BusinessPartnerRoute: React.FC<BusinessPartnerRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [isBusinessPartner, setIsBusinessPartner] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkBusinessPartnerRole = async () => {
      if (!user) {
        navigate('/auth/login');
        return;
      }

      try {
        // Check if user has business_partner role
        const { data, error } = await supabase
          .from('users')
          .select(`
            role_id,
            organization_id,
            roles!inner(name),
            organizations!inner(
              category,
              partner_type_id,
              partner_types(name)
            )
          `)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        const isBusinessPartner = data?.roles?.name === 'business_partner' && 
                                  data?.organizations?.category === 'business';
        setIsBusinessPartner(isBusinessPartner);

        if (!isBusinessPartner) {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error checking business partner role:', error);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkBusinessPartnerRole();
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isBusinessPartner) {
    return null;
  }

  return <>{children}</>;
};
