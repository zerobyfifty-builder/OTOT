import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DollarSign, BarChart3, Layers, Info } from 'lucide-react';

const formatUSD = (v: number) => `$${v.toFixed(2)}`;
const formatKES = (v: number) => Math.round(v).toLocaleString('en-US');

const TIERS = [
  { key: 'tier_seedling_usd', name: 'Seedling only', desc: 'Sponsor a seedling at the nursery', fixed: true },
  { key: 'tier_plant_usd', name: 'Plant a tree', desc: 'Full planting cost covered', recommended: true },
  { key: 'tier_adopt_usd', name: 'Adopt a tree (3 yr)', desc: 'Planting + 3 years of aftercare' },
  { key: 'tier_monthly_usd', name: 'Monthly fund', desc: 'Recurring monthly contribution' },
  { key: 'tier_yearly_usd', name: 'Yearly fund', desc: 'Annual contribution' },
  { key: 'tier_recommit_usd', name: 'Re-contribute (yr 4+)', desc: 'Continued care after initial period' },
  { key: 'tier_grove_usd', name: 'Grove (100 trees)', desc: 'Sponsor a grove of 100 trees' },
  { key: 'tier_forest_usd', name: 'Forest (1,000 trees)', desc: 'Sponsor a mini-forest' },
];

export const PlantingCostsKTBTab: React.FC = () => {
  const { data: config, isLoading } = useQuery({
    queryKey: ['active-planting-config-ktb'],
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Pricing configuration not yet published by admin.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const techPct = Number(config.tech_share_pct);
  const balancePct = 100 - techPct;
  const ktbPct = Number(config.ktb_share_of_balance_pct);
  const moePct = 100 - ktbPct;
  const techOfTotal = techPct;
  const ktbOfTotal = (balancePct * ktbPct) / 100;
  const moeOfTotal = (balancePct * moePct) / 100;

  return (
    <div className="space-y-6">
      {/* Programme configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Programme Configuration</CardTitle>
              <CardDescription>
                Effective {new Date(config.effective_from || '').toLocaleDateString()}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-muted/30">
              <p className="text-xs text-muted-foreground">Tourist donation per tree</p>
              <p className="text-xl font-bold">{formatUSD(Number(config.donation_usd))}</p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <p className="text-xs text-muted-foreground">KES / USD rate</p>
              <p className="text-xl font-bold">{Number(config.fx_rate_kes_usd)}</p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <p className="text-xs text-muted-foreground">Tech share</p>
              <p className="text-xl font-bold">{techPct}% <span className="text-sm font-normal text-muted-foreground">({formatUSD(Number(config.tech_usd_per_tree))} per tree)</span></p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <p className="text-xs text-muted-foreground">KTB share</p>
              <p className="text-xl font-bold">{formatUSD(Number(config.ktb_usd_per_tree))} <span className="text-sm font-normal text-muted-foreground">per tree</span></p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30 sm:col-span-2">
              <p className="text-xs text-muted-foreground">MoE / plantation share</p>
              <p className="text-xl font-bold">{formatUSD(Number(config.moe_usd_per_tree))} <span className="text-sm font-normal text-muted-foreground">per tree</span></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contribution tiers */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Contribution Tiers</CardTitle>
          </div>
          <CardDescription>What tourists see when contributing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {TIERS.map(t => {
              const price = Number((config as any)[t.key] || 0);
              return (
                <div key={t.key} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{t.name}</span>
                      {t.fixed && <Badge variant="secondary" className="text-xs">fixed</Badge>}
                      {t.recommended && <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">recommended</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  </div>
                  <span className="font-bold">{formatUSD(price)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Revenue split visual */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Revenue Split</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex h-10 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-center text-xs font-medium text-white"
                style={{ width: `${techOfTotal}%`, backgroundColor: 'hsl(270 60% 55%)' }}
              >
                {techOfTotal.toFixed(0)}%
              </div>
              <div
                className="flex items-center justify-center text-xs font-medium text-white"
                style={{ width: `${ktbOfTotal}%`, backgroundColor: 'hsl(210 70% 50%)' }}
              >
                {ktbOfTotal.toFixed(0)}%
              </div>
              <div
                className="flex items-center justify-center text-xs font-medium text-white"
                style={{ width: `${moeOfTotal}%`, backgroundColor: 'hsl(150 60% 40%)' }}
              >
                {moeOfTotal.toFixed(0)}%
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(270 60% 55%)' }} />
                <span>Tech Partner</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(210 70% 50%)' }} />
                <span>KTB</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(150 60% 40%)' }} />
                <span>MoE / Plantation</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
        <Info className="h-3.5 w-3.5" />
        This is a read-only view. Contact admin to request changes to pricing or split percentages.
      </p>
    </div>
  );
};

export default PlantingCostsKTBTab;
