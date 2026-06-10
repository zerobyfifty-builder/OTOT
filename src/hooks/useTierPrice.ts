import type { ContributionTier } from './useContributionTiers';

export interface TierPriceInfo {
  perTree: number;
  trees: number; // representative count (max for range)
  autoPrice: number;
  finalPrice: number;
  savings: number;
  isPremium: boolean;
  monthly: number | null;
  rangeAutoLow: number | null;
  rangeAutoHigh: number | null;
}

export function computeTierPrice(tier: ContributionTier, perTree: number): TierPriceInfo {
  const safePerTree = Number(perTree) || 0;
  let trees = tier.trees_count ?? 1;
  let autoPrice = 0;
  let rangeAutoLow: number | null = null;
  let rangeAutoHigh: number | null = null;

  if (tier.tier_type === 'custom_range') {
    const minT = tier.min_trees ?? 1;
    const maxT = tier.max_trees ?? minT;
    trees = maxT;
    rangeAutoLow = minT * safePerTree;
    rangeAutoHigh = maxT * safePerTree;
    autoPrice = rangeAutoHigh;
  } else {
    autoPrice = trees * safePerTree;
  }

  const override = tier.price_override_usd != null ? Number(tier.price_override_usd) : null;
  const finalPrice = override ?? autoPrice;
  const savings = Math.max(0, autoPrice - finalPrice);
  const isPremium = override != null && override > autoPrice;

  const months = tier.duration_months ?? null;
  const monthly =
    (tier.tier_type === 'subscription' || tier.tier_type === 'recurring') && months && months > 0
      ? finalPrice / months
      : null;

  return {
    perTree: safePerTree,
    trees,
    autoPrice,
    finalPrice,
    savings,
    isPremium,
    monthly,
    rangeAutoLow,
    rangeAutoHigh,
  };
}
