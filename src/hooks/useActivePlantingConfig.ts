import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivePlantingConfig {
  id: string;
  donation_usd: number;
  tier_seedling_usd: number | null;
  tier_plant_usd: number | null;
  tier_adopt_usd: number | null;
  tier_monthly_usd: number | null;
  tier_yearly_usd: number | null;
  tier_recommit_usd: number | null;
  tier_grove_usd: number | null;
  tier_forest_usd: number | null;
  default_species_id: string | null;
}

interface UseActivePlantingConfigOptions {
  fallbackPricePerTree?: number;
}

/**
 * Reads the live, approved Planting Costs config (Super Admin → Configuration →
 * Planting Costs). Powers tourist-facing pricing so admin price changes flow
 * through to /tree-purchase automatically.
 */
export function useActivePlantingConfig(opts: UseActivePlantingConfigOptions = {}) {
  const queryClient = useQueryClient();
  const { fallbackPricePerTree } = opts;

  const query = useQuery({
    queryKey: ['active-planting-config'],
    queryFn: async (): Promise<ActivePlantingConfig | null> => {
      const { data, error } = await supabase
        .from('planting_cost_configs')
        .select('id, donation_usd, tier_seedling_usd, tier_plant_usd, tier_adopt_usd, tier_monthly_usd, tier_yearly_usd, tier_recommit_usd, tier_grove_usd, tier_forest_usd, default_species_id')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as any) || null;
    },
    staleTime: 30_000,
  });

  // Realtime: invalidate when admin publishes a new approved config.
  useEffect(() => {
    const channel = supabase
      .channel('planting-cost-configs-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'planting_cost_configs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['active-planting-config'] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const cfg = query.data ?? null;
  const pricePerTree = Number(cfg?.donation_usd ?? fallbackPricePerTree ?? 4.5);

  return {
    config: cfg,
    configId: cfg?.id ?? null,
    pricePerTree,
    isLoading: query.isLoading,
  };
}
