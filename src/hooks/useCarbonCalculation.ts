import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const GLOBAL_SURVIVAL = 0.85;
const DEFAULT_RATE = 22;
const DEFAULT_HORIZON = 20;
const DEFAULT_DONATION = 10;
const DEFAULT_SPECIES_LABEL = 'Mixed indigenous species (OTOT default)';

interface CarbonCalcInput {
  totalCO2_kg: number;
  speciesId?: string | null;
  tripId?: string | null;
  userId?: string | null;
}

interface CarbonCalcResult {
  rateUsed: number;
  effectiveRate: number;
  survivalRate: number;
  horizonYears: number;
  treesNeeded: number;
  treesPlantedPrior: number;
  treesCommittedPrior: number;
  sliderMax: number;
  treeCreditPct: number;
  treeDebtPct: number;
  donationUSDPerTree: number;
  speciesLabel: string;
  speciesId: string | null;
  configId: string | null;
  configWarning: string | null;
}

export function useCarbonCalculation(input: CarbonCalcInput | null) {
  // Fetch active config
  const { data: activeConfig } = useQuery({
    queryKey: ['active-planting-config-for-calc'],
    queryFn: async () => {
      const { data } = await supabase
        .from('planting_cost_configs')
        .select('id, donation_usd, default_species_id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Determine species ID to fetch
  const resolvedSpeciesId = input?.speciesId || activeConfig?.default_species_id || null;

  // Fetch species data
  const { data: speciesData } = useQuery({
    queryKey: ['sequestration-rate-for-calc', resolvedSpeciesId],
    queryFn: async () => {
      if (!resolvedSpeciesId) return null;
      const { data } = await supabase
        .from('tree_sequestration_rates')
        .select('*')
        .eq('id', resolvedSpeciesId)
        .eq('is_active', true)
        .maybeSingle();
      return data;
    },
    enabled: !!resolvedSpeciesId,
  });

  // Fetch prior trees for trip
  const { data: priorTrees } = useQuery({
    queryKey: ['prior-trees-for-calc', input?.tripId, input?.userId],
    queryFn: async () => {
      if (!input?.tripId || !input?.userId) return { planted: 0, committed: 0 };
      
      const { data: trees } = await supabase
        .from('trees')
        .select('id, status')
        .eq('trip_id', input.tripId)
        .eq('user_id', input.userId);

      if (!trees) return { planted: 0, committed: 0 };
      
      const planted = trees.filter(t => (t.status as string) === 'Planted').length;
      const committed = trees.filter(t => 
        (t.status as string) !== 'Planted' && (t.status as string) !== 'Cancelled'
      ).length;
      
      return { planted, committed };
    },
    enabled: !!input?.tripId && !!input?.userId,
  });

  if (!input) return null;

  // Resolve values
  let rateUsed = DEFAULT_RATE;
  let survivalRate = GLOBAL_SURVIVAL;
  let horizonYears = DEFAULT_HORIZON;
  let speciesLabel = DEFAULT_SPECIES_LABEL;
  let finalSpeciesId: string | null = null;

  if (speciesData) {
    rateUsed = Number(speciesData.rate_kg_per_year_default);
    survivalRate = speciesData.survival_rate_override != null ? Number(speciesData.survival_rate_override) : GLOBAL_SURVIVAL;
    horizonYears = Number(speciesData.offset_horizon_years);
    speciesLabel = speciesData.species_name;
    finalSpeciesId = speciesData.id;
  }

  const effectiveRate = rateUsed * survivalRate;
  const treesNeeded = Math.ceil(input.totalCO2_kg / effectiveRate);

  const treesPlantedPrior = priorTrees?.planted || 0;
  const treesCommittedPrior = priorTrees?.committed || 0;

  let sliderMax = treesNeeded - treesPlantedPrior - treesCommittedPrior;
  if (sliderMax < 1) sliderMax = 1;

  const treeCreditPct = Math.round(
    ((treesPlantedPrior + treesCommittedPrior) / treesNeeded) * 100
  );
  const treeDebtPct = 100 - treeCreditPct;

  let donationUSDPerTree = DEFAULT_DONATION;
  let configWarning: string | null = null;
  let configId: string | null = null;

  if (activeConfig) {
    donationUSDPerTree = Number(activeConfig.donation_usd);
    configId = activeConfig.id;
  } else {
    configWarning = 'Tree pricing is being configured — the trees needed figure is correct but the contribution amount will be confirmed shortly.';
  }

  const result: CarbonCalcResult = {
    rateUsed,
    effectiveRate,
    survivalRate,
    horizonYears,
    treesNeeded,
    treesPlantedPrior,
    treesCommittedPrior,
    sliderMax,
    treeCreditPct,
    treeDebtPct,
    donationUSDPerTree,
    speciesLabel,
    speciesId: finalSpeciesId,
    configId,
    configWarning,
  };

  return result;
}
