import { useVisibleTiers, type ContributionTier } from '@/hooks/useContributionTiers';
import { ContributionTierCard } from './ContributionTierCard';

interface Props {
  perTree: number;
  selectedTierId: string | null;
  onSelectTier: (tier: ContributionTier) => void;
}

export const MoreWaysToContribute = ({ perTree, selectedTierId, onSelectTier }: Props) => {
  const { tiers, isLoading } = useVisibleTiers('tourist');

  if (isLoading || tiers.length === 0) return null;

  return (
    <div className="space-y-4 mt-8">
      <div>
        <h3 className="text-xl font-semibold text-foreground">More Ways to Contribute</h3>
        <p className="text-sm text-muted-foreground">
          Additional contribution tiers curated by KTB.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiers.map((tier) => (
          <ContributionTierCard
            key={tier.id}
            tier={tier}
            perTree={perTree}
            selected={selectedTierId === tier.id}
            onSelect={onSelectTier}
          />
        ))}
      </div>
    </div>
  );
};
