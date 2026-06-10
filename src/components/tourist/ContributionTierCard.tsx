import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Leaf } from 'lucide-react';
import type { ContributionTier } from '@/hooks/useContributionTiers';
import { computeTierPrice } from '@/hooks/useTierPrice';

const fmt = (v: number) => `$${v.toFixed(2)}`;

interface Props {
  tier: ContributionTier;
  perTree: number;
  selected: boolean;
  onSelect: (tier: ContributionTier) => void;
}

/**
 * Tier card matching the visual style of the Flexible/Monthly cards in
 * /tree-purchase. Heading = tier.name, sub text = tier.key. Price shows the
 * override when set, otherwise the auto-calculated price.
 */
export const ContributionTierCard = ({ tier, perTree, selected, onSelect }: Props) => {
  const p = computeTierPrice(tier, perTree);
  const isRange = tier.tier_type === 'custom_range';
  const isRecurring = tier.tier_type === 'recurring' || tier.tier_type === 'subscription';

  return (
    <Card
      className={`transition-all duration-300 hover:shadow-lg ${
        selected ? 'ring-2 ring-primary shadow-lg scale-105' : ''
      }`}
    >
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
          <Leaf className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-xl">{tier.name}</CardTitle>
        <CardDescription>{tier.key}</CardDescription>
        {(tier.badge || isRecurring) && (
          <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
            {tier.badge === 'recommended' && (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                recommended
              </Badge>
            )}
            {tier.badge === 'fixed' && (
              <Badge variant="secondary" className="text-[10px]">fixed</Badge>
            )}
            {isRecurring && (
              <Badge variant="outline" className="text-[10px] capitalize">
                {tier.recurring_interval || 'recurring'}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="py-4">
          {isRange ? (
            <p className="text-3xl font-bold text-primary tabular-nums">
              {fmt(p.rangeAutoLow ?? 0)} – {fmt(p.rangeAutoHigh ?? 0)}
            </p>
          ) : (
            <div className="flex items-baseline justify-center gap-2">
              <p className="text-3xl font-bold text-primary tabular-nums">{fmt(p.finalPrice)}</p>
              {p.savings > 0 && (
                <span className="text-sm text-muted-foreground line-through tabular-nums">
                  {fmt(p.autoPrice)}
                </span>
              )}
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            for {p.trees} {p.trees === 1 ? 'tree' : 'trees'}
            {p.monthly != null && ` • ${fmt(p.monthly)}/mo`}
          </p>
          {p.savings > 0 && (
            <Badge className="mt-2 bg-emerald-100 text-emerald-700 border-emerald-200">
              Save {fmt(p.savings)}
            </Badge>
          )}
          {p.isPremium && (
            <Badge variant="outline" className="mt-2">Premium tier</Badge>
          )}
        </div>
        <Button
          variant={selected ? 'default' : 'outline'}
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(tier);
          }}
        >
          {selected ? 'Selected' : 'Select'}
        </Button>
      </CardContent>
    </Card>
  );
};
