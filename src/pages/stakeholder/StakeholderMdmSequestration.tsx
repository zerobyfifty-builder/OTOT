import { SequestrationRatesTab } from '@/components/mdm/SequestrationRatesTab';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function StakeholderMdmSequestration() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      // Check if user is super admin or has admin role
      const { data } = await supabase.rpc('is_super_admin', { user_id: user.id });
      setIsAdmin(!!data);
      setLoading(false);
    };
    check();
  }, [user]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // MoE (plantation) users get read-only view; admins get full edit
  return <SequestrationRatesTab readOnly={!isAdmin} />;
}

export default StakeholderMdmSequestration;
