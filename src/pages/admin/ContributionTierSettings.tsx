import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, Info } from 'lucide-react';

const formatUSD = (v: number) => `$${v.toFixed(2)}`;

const TIER_DEFS = [
  { key: 'tier_seedling_usd', name: 'Seedling only', desc: 'Sponsor a seedling at the nursery', badge: 'fixed' as const },
  { key: 'tier_plant_usd', name: 'Plant a tree', desc: 'Full planting cost covered', badge: 'recommended' as const },
  { key: 'tier_adopt_usd', name: 'Adopt a tree (3 yr)', desc: 'Planting + 3 years of aftercare' },
  { key: 'tier_monthly_usd', name: 'Monthly fund', desc: 'Recurring monthly contribution' },
  { key: 'tier_yearly_usd', name: 'Yearly fund', desc: 'Annual contribution' },
  { key: 'tier_recommit_usd', name: 'Re-contribute (yr 4+)', desc: 'Continued care after initial period' },
  { key: 'tier_grove_usd', name: 'Grove (100 trees)', desc: 'Sponsor a grove of 100 trees' },
  { key: 'tier_forest_usd', name: 'Forest (1,000 trees)', desc: 'Sponsor a mini-forest' },
];

const ContributionTierSettings: React.FC = () => {
  const { data: config, isLoading } = useQuery({
    queryKey: ['active-planting-config-tiers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('planting_cost_configs')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Contribution Tier Settings</h1>
        <p className="text-muted-foreground mt-1">Manage contribution tiers visible to tourists</p>
      </div>

      {!config ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No active pricing configuration. Approve a planting cost submission first.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Contribution Tiers</CardTitle>
                  <CardDescription>Auto-calculated from the active planting cost configuration (Contribution: {formatUSD(Number(config.donation_usd))})</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {TIER_DEFS.map(t => {
                const price = Number((config as any)[t.key] || 0);
                return (
                  <div key={t.key} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{t.name}</span>
                        {t.badge === 'fixed' && <Badge variant="secondary" className="text-xs">fixed</Badge>}
                        {t.badge === 'recommended' && <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">recommended</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                    </div>
                    <span className="font-bold">{formatUSD(price)}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
            <Info className="h-3.5 w-3.5" />
            Tier prices are auto-calculated from the approved planting cost configuration. To change them, update the contribution amount or revenue split in Planting Costs.
          </p>
        </div>
      )}
    </div>
  );
};

export default ContributionTierSettings;
