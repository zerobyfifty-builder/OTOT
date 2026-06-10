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

export const ContributionTierCard = ({ tier, perTree, selected, onSelect }: Props) => {
  const p = computeTierPrice(tier, perTree);
  const isRange = tier.tier_type === 'custom_range';
  const isRecurring = tier.tier_type === 'recurring' || tier.tier_type === 'subscription';

  return (
    <Card
      className={`transition-all duration-300 hover:shadow-lg ${
        selected ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
    >
      <CardHeader className="text-center pb-3">
        <div className="mx-auto w-14 h-14 bg-primary/15 rounded-full flex items-center justify-center mb-3">
          <Leaf className="h-7 w-7 text-primary" />
        </div>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <CardTitle className="text-lg">{tier.name}</CardTitle>
          {tier.badge === 'recommended' && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
              recommended
            </Badge>
          )}
          {tier.badge === 'fixed' && (
            <Badge variant="secondary" className="text-[10px]">
              fixed
            </Badge>
          )}
          {isRecurring && (
            <Badge variant="outline" className="text-[10px] capitalize">
              {tier.recurring_interval || 'recurring'}
            </Badge>
          )}
        </div>
        {tier.description && <CardDescription>{tier.description}</CardDescription>}
      </CardHeader>
      <CardContent className="text-center space-y-3">
        <div className="py-2">
          {isRange ? (
            <p className="text-2xl font-bold text-primary tabular-nums">
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
          <p className="text-xs text-muted-foreground mt-1">
            for {p.trees} {p.trees === 1 ? 'tree' : 'trees'}
            {p.monthly != null && ` • ${fmt(p.monthly)}/mo`}
          </p>
          {p.savings > 0 && (
            <Badge className="mt-2 bg-emerald-100 text-emerald-700 border-emerald-200">
              Save {fmt(p.savings)}
            </Badge>
          )}
          {p.isPremium && (
            <Badge variant="outline" className="mt-2">
              Premium tier
            </Badge>
          )}
        </div>
        <Button
          variant={selected ? 'default' : 'outline'}
          className="w-full"
          onClick={() => onSelect(tier)}
        >
          {selected ? 'Selected' : 'Select'}
        </Button>
      </CardContent>
    </Card>
  );
};
