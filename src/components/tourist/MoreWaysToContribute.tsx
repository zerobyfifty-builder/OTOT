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

  if (isLoading || tiers.length === 0) return null;

  return (
    <>
      {tiers.map((tier) => (
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
