import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TierType = 'fixed' | 'custom_range' | 'subscription' | 'recurring';
export type TierPortal = 'tourist' | 'b2b';

export interface ContributionTier {
  id: string;
  key: string;
  name: string;
  description: string | null;
  tier_type: TierType;
  trees_count: number | null;
  min_trees: number | null;
  max_trees: number | null;
  duration_months: number | null;
  recurring_interval: string | null;
  badge: string | null;
  sort_order: number;
  price_override_usd: number | null;
  is_active: boolean;
}

export interface TierVisibility {
  tier_id: string;
  portal: TierPortal;
  is_visible: boolean;
}

export function useContributionTiers() {
  return useQuery({
    queryKey: ['contribution-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contribution_tiers')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as ContributionTier[];
    },
  });
}

export function useTierVisibility() {
  return useQuery({
    queryKey: ['contribution-tier-visibility'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contribution_tier_visibility')
        .select('*');
      if (error) throw error;
      return (data || []) as TierVisibility[];
    },
  });
}

export function useVisibleTiers(portal: TierPortal) {
  const tiersQ = useContributionTiers();
  const visQ = useTierVisibility();
  const visible = (tiersQ.data || [])
    .filter((t) => t.is_active)
    .filter((t) =>
      (visQ.data || []).some(
        (v) => v.tier_id === t.id && v.portal === portal && v.is_visible
      )
    )
    .sort((a, b) => a.sort_order - b.sort_order);
  return {
    tiers: visible,
    isLoading: tiersQ.isLoading || visQ.isLoading,
  };
}
