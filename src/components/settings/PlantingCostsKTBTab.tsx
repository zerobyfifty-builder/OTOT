import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Lock, CheckCircle2, Info } from 'lucide-react';

const formatUSD = (v: number) => `$${v.toFixed(2)}`;
const formatKES = (v: number) => Math.round(v).toLocaleString('en-US');

const COST_FIELDS = [
  { key: 'cost_seedling_kes', label: 'Seedling / sapling' },
  { key: 'cost_planting_kes', label: 'Planting labour + site prep' },
  { key: 'cost_aftercare_yr1_kes', label: 'Year 1 aftercare' },
  { key: 'cost_aftercare_yr2_kes', label: 'Year 2 aftercare' },
  { key: 'cost_aftercare_yr3_kes', label: 'Year 3 aftercare' },
  { key: 'cost_gps_mrv_kes', label: 'GPS geotagging + MRV' },
  { key: 'cost_admin_overhead_kes', label: 'MoE admin overhead' },
];

const statusBadge = (status: string) => {
  switch (status) {
    case 'approved': return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200">Approved</Badge>;
    case 'pending_review': return <Badge className="bg-amber-500/10 text-amber-700 border-amber-200">Pending</Badge>;
    case 'returned': return <Badge className="bg-red-500/10 text-red-700 border-red-200">Returned</Badge>;
    case 'superseded': return <Badge variant="secondary">Superseded</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

export const PlantingCostsKTBTab: React.FC = () => {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['ktb-planting-submissions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('planting_cost_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });
      return data || [];
    },
  });

  const selected = submissions?.find((s: any) => s.id === selectedId) || null;

  // Auto-select most recent
  useEffect(() => {
    if (submissions?.length && !selectedId) {
      setSelectedId(submissions[0].id);
    }
  }, [submissions, selectedId]);

  // Fetch config for approved submissions
  const { data: savedConfig } = useQuery({
    queryKey: ['ktb-planting-config', selected?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('planting_cost_configs')
        .select('*')
        .eq('submission_id', selected!.id)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!selected?.id && (selected?.status === 'approved' || selected?.status === 'superseded'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!submissions?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No planting cost submissions yet.</p>
        </CardContent>
      </Card>
    );
  }

  const fxRate = savedConfig ? Number(savedConfig.fx_rate_kes_usd) : 130;
  const totalKES = selected ? Number(selected.total_cost_kes || 0) : 0;
  const moeNeedUSD = totalKES / fxRate;

  const activeDonation = savedConfig ? Number(savedConfig.donation_usd) : 10;
  const techPct = savedConfig ? Number(savedConfig.tech_share_pct) : 30;
  const ktbPct = savedConfig ? Number(savedConfig.ktb_share_of_balance_pct) : 40;
  const moePct = 100 - ktbPct;

  const techUSD = activeDonation * (techPct / 100);
  const balanceUSD = activeDonation - techUSD;
  const ktbUSD = balanceUSD * (ktbPct / 100);
  const moeUSD = balanceUSD * (moePct / 100);

  const techOfTotal = techPct;
  const ktbOfTotal = ((100 - techPct) * ktbPct) / 100;
  const moeOfTotal = ((100 - techPct) * moePct) / 100;

  const isViable = moeUSD >= moeNeedUSD;
  const surplus = moeUSD - moeNeedUSD;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left Panel - Submissions List */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-lg font-semibold">Cost Submissions</h2>
        <div className="space-y-3">
          {submissions.map((sub: any) => (
            <div
              key={sub.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-muted/30 ${
                selectedId === sub.id ? 'ring-2 ring-primary border-primary' : ''
              } ${sub.status === 'approved' ? 'bg-emerald-500/5 border-emerald-300' : ''}`}
              onClick={() => setSelectedId(sub.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{sub.stakeholder_org}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(sub.submitted_at || sub.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}
                    {new Date(sub.submitted_at || sub.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(sub.status)}
                  <span className="text-sm font-medium">KES {formatKES(Number(sub.total_cost_kes))}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Read-only Details */}
      <div className="lg:col-span-3 space-y-5">
        {!selected ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <p className="text-muted-foreground text-sm">Select a submission to view details.</p>
          </div>
        ) : (
          <>
            {/* Status Banner */}
            <div className="p-3 rounded-lg bg-muted/60 border border-muted-foreground/20 flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground flex-1">
                {selected.status === 'superseded'
                  ? 'This Planting Costs has been superseded by an updated submission.'
                  : selected.status === 'returned'
                  ? 'This Planting Costs has been returned to the stakeholder for revision.'
                  : selected.status === 'approved'
                  ? `This Planting Costs is approved on ${new Date(selected.reviewed_at || selected.submitted_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}.`
                  : 'This submission is pending admin review.'}
              </p>
              {selected.status === 'approved' && (
                <Badge className="bg-emerald-500 text-white border-emerald-600 animate-pulse text-[10px] px-2 py-0.5 shrink-0">Live</Badge>
              )}
            </div>

            {/* MoE Cost Inputs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">MoE Cost Inputs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {COST_FIELDS.map(f => {
                  const val = Number(selected[f.key] || 0);
                  return (
                    <div key={f.key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{f.label}</span>
                      <span>KES {formatKES(val)} <span className="text-muted-foreground">({formatUSD(val / fxRate)})</span></span>
                    </div>
                  );
                })}
                <Separator />
                <div className="flex justify-between font-semibold text-sm">
                  <span>Total MoE cost per tree</span>
                  <span>KES {formatKES(totalKES)} = {formatUSD(moeNeedUSD)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Step 1: Contribution Amount */}
            {savedConfig && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Step 1 — Contribution Amount</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Tourist donates (USD per tree)</span>
                    <span className="font-bold">{formatUSD(activeDonation)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>KES / USD rate</span>
                    <span className="font-bold">{fxRate}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Revenue Split */}
            {savedConfig && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Step 2 — Revenue Split</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Tech: Platform Dev & Maint Fee (% of total contribution)</span>
                    <span className="font-bold">{techPct}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Balance after tech = {100 - techPct}%</p>
                  <div className="flex justify-between text-sm">
                    <span>KTB: Marketing, Admin & Oversight Fee (% of balance)</span>
                    <span className="font-bold">{ktbPct}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>MoE: Planting, Growing & Admin Fee (% remaining)</span>
                    <span className="font-bold">{moePct}%</span>
                  </div>

                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Revenue Split %</p>
                    <div className="flex h-8 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-center text-xs font-medium text-white" style={{ width: `${techOfTotal}%`, backgroundColor: 'hsl(270 60% 55%)' }}>{techOfTotal.toFixed(0)}%</div>
                      <div className="flex items-center justify-center text-xs font-medium text-white" style={{ width: `${ktbOfTotal}%`, backgroundColor: 'hsl(210 70% 50%)' }}>{ktbOfTotal.toFixed(0)}%</div>
                      <div className="flex items-center justify-center text-xs font-medium text-white" style={{ width: `${moeOfTotal}%`, backgroundColor: 'hsl(150 60% 40%)' }}>{moeOfTotal.toFixed(0)}%</div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(270 60% 55%)' }} /> Tech</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(210 70% 50%)' }} /> KTB</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(150 60% 40%)' }} /> MoE</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Live Money Flows */}
            {savedConfig && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Step 3 — Live Money Flows</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">At this donation and split</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg border-2 text-center" style={{ borderColor: 'hsl(270 60% 55%)', backgroundColor: 'hsl(270 60% 97%)' }}>
                      <p className="text-xs font-medium" style={{ color: 'hsl(270 60% 45%)' }}>Tech partner</p>
                      <p className="font-bold text-lg" style={{ color: 'hsl(270 60% 30%)' }}>{formatUSD(techUSD)}</p>
                      <p className="text-xs" style={{ color: 'hsl(270 40% 50%)' }}>KES {formatKES(techUSD * fxRate)}</p>
                    </div>
                    <div className="p-3 rounded-lg border-2 text-center" style={{ borderColor: 'hsl(210 70% 50%)', backgroundColor: 'hsl(210 70% 97%)' }}>
                      <p className="text-xs font-medium" style={{ color: 'hsl(210 70% 40%)' }}>KTB</p>
                      <p className="font-bold text-lg" style={{ color: 'hsl(210 70% 25%)' }}>{formatUSD(ktbUSD)}</p>
                      <p className="text-xs" style={{ color: 'hsl(210 50% 50%)' }}>KES {formatKES(ktbUSD * fxRate)}</p>
                    </div>
                    <div className="p-3 rounded-lg border-2 text-center" style={{ borderColor: 'hsl(150 60% 40%)', backgroundColor: 'hsl(150 60% 95%)' }}>
                      <p className="text-xs font-medium" style={{ color: 'hsl(150 60% 30%)' }}>MoE / plantation</p>
                      <p className="font-bold text-lg" style={{ color: 'hsl(150 60% 20%)' }}>{formatUSD(moeUSD)}</p>
                      <p className="text-xs" style={{ color: 'hsl(150 40% 40%)' }}>KES {formatKES(moeUSD * fxRate)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-lg border-2 text-center" style={{ borderColor: 'hsl(150 40% 70%)', backgroundColor: 'hsl(150 30% 95%)' }}>
                      <p className="text-xs font-medium text-muted-foreground">MoE receives</p>
                      <p className="font-bold text-lg" style={{ color: 'hsl(150 60% 20%)' }}>{formatUSD(moeUSD)}</p>
                      <p className="text-xs" style={{ color: 'hsl(150 40% 40%)' }}>KES {formatKES(moeUSD * fxRate)}</p>
                    </div>
                    <div className="p-4 rounded-lg border-2 text-center" style={{ borderColor: 'hsl(150 40% 70%)', backgroundColor: 'hsl(150 30% 95%)' }}>
                      <p className="text-xs font-medium text-muted-foreground">MoE needs</p>
                      <p className="font-bold text-lg" style={{ color: 'hsl(150 60% 20%)' }}>{formatUSD(moeNeedUSD)}</p>
                      <p className="text-xs" style={{ color: isViable ? 'hsl(150 60% 35%)' : 'hsl(30 80% 45%)' }}>
                        {isViable ? `+${formatUSD(surplus)} surplus to MoE` : `KES ${formatKES(totalKES)}`}
                      </p>
                    </div>
                  </div>

                  {isViable ? (
                    <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <p className="font-medium text-emerald-800 text-sm">
                          MoE receives {formatUSD(moeUSD)} — covers the KES {formatKES(totalKES)} ({formatUSD(moeNeedUSD)}) cost. Surplus {formatUSD(surplus)} strengthens MoE reserve.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="font-medium text-amber-800 text-sm">
                        MoE shortfall of {formatUSD(Math.abs(surplus))}.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </>
        )}
      </div>
    </div>
  );
};

export default PlantingCostsKTBTab;
