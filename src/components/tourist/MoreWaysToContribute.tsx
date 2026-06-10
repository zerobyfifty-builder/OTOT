import { useVisibleTiers, type ContributionTier } from '@/hooks/useContributionTiers';
import { ContributionTierCard } from './ContributionTierCard';

interface Props {
  perTree: number;
  selectedTierId: string | null;
  onSelectTier: (tier: ContributionTier) => void;
}

/**
 * Renders dynamic tier cards directly (no wrapper) so they sit inside the
 * existing "Choose Your Option" grid alongside Flexible + Monthly cards.
 */
export const MoreWaysToContribute = ({ perTree, selectedTierId, onSelectTier }: Props) => {
  const { tiers, isLoading } = useVisibleTiers('tourist');
  // The Flexible Tree Planting card on /tree-purchase already represents the
  // custom_range tier — pricing flows through there. Hide custom_range tiers
  // here to avoid rendering a duplicate Flexible card.
  const filtered = tiers.filter((t) => t.tier_type !== 'custom_range');

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
