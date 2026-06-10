import { useVisibleTiers, type ContributionTier } from '@/hooks/useContributionTiers';
import { ContributionTierCard } from './ContributionTierCard';

interface Props {
  perTree: number;
  selectedTierId: string | null;
  onSelectTier: (tier: ContributionTier) => void;
  excludedTierIds?: string[];
}

/**
 * Renders dynamic tier cards directly (no wrapper) so they sit inside the
 * existing "Choose Your Option" grid alongside Flexible + Monthly cards.
 * Tiers matched to existing dedicated cards (via excludedTierIds) are hidden
 * here to avoid duplicates.
 */
export const MoreWaysToContribute = ({
  perTree,
  selectedTierId,
  onSelectTier,
  excludedTierIds = [],
}: Props) => {
  const { tiers, isLoading } = useVisibleTiers('tourist');
  const filtered = tiers.filter(
    (t) => t.tier_type !== 'custom_range' && !excludedTierIds.includes(t.id)
  );

  if (isLoading || filtered.length === 0) return null;

  return (
    <>
      {filtered.map((tier) => (
        <ContributionTierCard
          key={tier.id}
          tier={tier}
          perTree={perTree}
          selected={selectedTierId === tier.id}
          onSelect={onSelectTier}
        />
      ))}
    </>
  );
};
