import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, ArrowLeft, Sparkles, CornerDownLeft, ArrowRight, Lock } from 'lucide-react';

const COST_FIELDS = [
  { key: 'cost_seedling_kes', label: 'Seedling / sapling' },
  { key: 'cost_planting_kes', label: 'Planting labour + site prep' },
  { key: 'cost_aftercare_yr1_kes', label: 'Year 1 aftercare' },
  { key: 'cost_aftercare_yr2_kes', label: 'Year 2 aftercare' },
  { key: 'cost_aftercare_yr3_kes', label: 'Year 3 aftercare' },
  { key: 'cost_gps_mrv_kes', label: 'GPS geotagging + MRV' },
  { key: 'cost_admin_overhead_kes', label: 'MoE admin overhead' },
];

const formatKES = (v: number) => Math.round(v).toLocaleString('en-US');
const formatUSD = (v: number) => `$${v.toFixed(2)}`;
const roundUpHalf = (v: number) => Math.ceil(v * 2) / 2;

interface Props {
  submission: any | null;
  onClearSubmission: () => void;
}

export const PlantingCostsConfigPanel: React.FC<Props> = ({ submission, onClearSubmission }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [donation, setDonation] = useState(10);
  const [fxRate, setFxRate] = useState(130);
  const [techPct, setTechPct] = useState(30);
  const [ktbPct, setKtbPct] = useState(40);
  const [returnComment, setReturnComment] = useState('');
  const [showReturnForm, setShowReturnForm] = useState(false);

  const isReadOnly = submission?.status === 'approved' || submission?.status === 'superseded';
  const isApproved = isReadOnly;

  // Fetch saved config for approved submissions
  const { data: savedConfig } = useQuery({
    queryKey: ['planting-config-for-submission', submission?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('planting_cost_configs')
        .select('*')
        .eq('submission_id', submission.id)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!submission?.id && isReadOnly,
  });

  // Use saved config values for approved, otherwise use slider state
  const activeDonation = isApproved && savedConfig ? Number(savedConfig.donation_usd) : donation;
  const activeFxRate = isApproved && savedConfig ? Number(savedConfig.fx_rate_kes_usd) : fxRate;
  const activeTechPct = isApproved && savedConfig ? Number(savedConfig.tech_share_pct) : techPct;
  const activeKtbPct = isApproved && savedConfig ? Number(savedConfig.ktb_share_of_balance_pct) : ktbPct;

  const moePct = 100 - activeKtbPct;
  const totalKES = submission ? Number(submission.total_cost_kes || 0) : 0;
  const moeNeedUSD = totalKES / activeFxRate;

  const techUSD = activeDonation * (activeTechPct / 100);
  const balanceUSD = activeDonation - techUSD;
  const ktbUSD = balanceUSD * (activeKtbPct / 100);
  const moeUSD = balanceUSD * (moePct / 100);

  const isViable = moeUSD >= moeNeedUSD;
  const surplus = moeUSD - moeNeedUSD;

  const balancePctOfDonation = (100 - activeTechPct) / 100;
  const moePctOfBalance = moePct / 100;
  const minDonation = moeNeedUSD > 0 ? moeNeedUSD / (balancePctOfDonation * moePctOfBalance) : 1;
  const minDonationRounded = Math.ceil(minDonation * 2) / 2;

  const techOfTotal = activeTechPct;
  const ktbOfTotal = ((100 - activeTechPct) * activeKtbPct) / 100;
  const moeOfTotal = ((100 - activeTechPct) * moePct) / 100;

  const tiers = useMemo(() => [
    { name: 'Seedling only', price: 1.00, badge: 'fixed' },
    { name: 'Plant a tree', price: activeDonation, badge: 'recommended' },
    { name: 'Adopt a tree (3 yr)', price: roundUpHalf(activeDonation * 1.5) },
    { name: 'Monthly fund', price: roundUpHalf(activeDonation / 12) },
    { name: 'Yearly fund', price: roundUpHalf(activeDonation * 0.95) },
    { name: 'Re-contribute (yr 4+)', price: roundUpHalf(activeDonation * 0.25) },
    { name: 'Grove (100 trees)', price: Math.round(activeDonation * 90) },
    { name: 'Forest (1,000 trees)', price: Math.round(activeDonation * 800) },
  ], [activeDonation]);

  const approveMutation = useMutation({
    mutationFn: async () => {
      const { error: e1 } = await supabase
        .from('planting_cost_submissions')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user!.id } as any)
        .eq('id', submission.id);
      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from('planting_cost_configs')
        .update({ is_active: false } as any)
        .eq('is_active', true);
      if (e2) throw e2;

      const { error: e3 } = await supabase
        .from('planting_cost_configs')
        .insert({
          submission_id: submission.id, is_active: true, fx_rate_kes_usd: fxRate, donation_usd: donation,
          tech_share_pct: techPct, ktb_share_of_balance_pct: ktbPct, moe_share_of_balance_pct: moePct,
          tech_usd_per_tree: parseFloat(techUSD.toFixed(2)), ktb_usd_per_tree: parseFloat(ktbUSD.toFixed(2)),
          moe_usd_per_tree: parseFloat(moeUSD.toFixed(2)),
          tier_seedling_usd: 1.00, tier_plant_usd: donation, tier_adopt_usd: tiers[2].price,
          tier_monthly_usd: tiers[3].price, tier_yearly_usd: tiers[4].price, tier_recommit_usd: tiers[5].price,
          tier_grove_usd: tiers[6].price, tier_forest_usd: tiers[7].price,
          approved_by: user!.id, approved_at: new Date().toISOString(),
        } as any);
      if (e3) throw e3;

      await supabase.from('planting_cost_submissions')
        .update({ status: 'superseded' } as any)
        .eq('status', 'approved').neq('id', submission.id);

      await supabase.from('planting_cost_notifications').insert([
        { submission_id: submission.id, recipient_role: 'plantation', message: 'Your planting costs have been approved and the pricing configuration is now live.' },
        { submission_id: submission.id, recipient_role: 'ktb', message: 'Planting cost configuration has been updated by admin.' },
      ] as any);
    },
    onSuccess: () => {
      toast.success('Configuration approved and live.');
      queryClient.invalidateQueries({ queryKey: ['all-planting-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['active-planting-config'] });
      onClearSubmission();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const returnMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      const { error } = await supabase
        .from('planting_cost_submissions')
        .update({ status: 'returned', admin_comment: comment, reviewed_at: new Date().toISOString(), reviewed_by: user!.id } as any)
        .eq('id', id);
      if (error) throw error;
      await supabase.from('planting_cost_notifications').insert({
        submission_id: id, recipient_role: 'plantation', message: `Your planting cost submission has been returned. Comment: ${comment}`,
      } as any);
    },
    onSuccess: () => {
      toast.success('Submission returned with comment');
      setShowReturnForm(false);
      setReturnComment('');
      queryClient.invalidateQueries({ queryKey: ['all-planting-submissions'] });
      onClearSubmission();
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!submission) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-2">
          <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground text-sm">Select a submission from the left panel to view or configure pricing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Lock banner for approved */}
      {isApproved && (
         <div className="p-3 rounded-lg bg-muted/60 border border-muted-foreground/20 flex items-center gap-2">
           <Lock className="h-4 w-4 text-muted-foreground" />
           <p className="text-sm text-muted-foreground">
             This Planting Costs is approved on {submission?.reviewed_at ? new Date(submission.reviewed_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : new Date(submission?.submitted_at || submission?.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}.
           </p>
         </div>
      )}

      {/* MoE Cost Inputs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">MoE Cost Inputs</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClearSubmission} className="text-xs gap-1">
              <ArrowLeft className="h-3 w-3" /> Change submission
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {COST_FIELDS.map(f => {
            const val = Number(submission[f.key] || 0);
            return (
              <div key={f.key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{f.label}</span>
                <span>KES {formatKES(val)} <span className="text-muted-foreground">({formatUSD(val / activeFxRate)})</span></span>
              </div>
            );
          })}
          <Separator />
          <div className="flex justify-between font-semibold text-sm">
            <span>Total MoE cost per tree</span>
            <span>KES {formatKES(totalKES)} = {formatUSD(moeNeedUSD)}</span>
          </div>

          {/* Action buttons for pending - directly below cost inputs */}
          {submission.status === 'pending_review' && (
            <div className="pt-4 space-y-3">
              <Separator />
              {showReturnForm ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Enter comment for plantation partner..."
                    value={returnComment}
                    onChange={e => setReturnComment(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" disabled={!returnComment.trim() || returnMutation.isPending}
                      onClick={() => returnMutation.mutate({ id: submission.id, comment: returnComment })}>
                      <CornerDownLeft className="h-3 w-3 mr-1" /> Confirm Return
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowReturnForm(false); setReturnComment(''); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowReturnForm(true)}>
                    <CornerDownLeft className="h-3 w-3 mr-1" /> Return with comment
                  </Button>
                   <Button size="sm" className="gap-1" disabled={!isViable || approveMutation.isPending}
                     onClick={() => {
                       if (!isViable) {
                         toast.error('Cannot approve: MoE shortfall detected. Raise the donation or adjust the revenue split to cover planting costs.');
                         return;
                       }
                       approveMutation.mutate();
                     }}>
                     <ArrowRight className="h-3 w-3" /> Approve & Publish
                   </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 1: Donation Amount */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Step 1 — Donation Amount</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Tourist donates (USD per tree)</span>
              <span className="font-bold">{formatUSD(activeDonation)}</span>
            </div>
            {!isApproved && <Slider value={[donation]} onValueChange={([v]) => setDonation(v)} min={1} max={50} step={0.5} />}
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>KES / USD rate</span>
              <span className="font-bold">{activeFxRate}</span>
            </div>
            {!isApproved && <Slider value={[fxRate]} onValueChange={([v]) => setFxRate(v)} min={100} max={160} step={1} />}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Revenue Split */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Step 2 — Revenue Split</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Tech partner share (% of total donation)</span>
              <span className="font-bold">{activeTechPct}%</span>
            </div>
            {!isApproved && <Slider value={[techPct]} onValueChange={([v]) => setTechPct(v)} min={5} max={40} step={1} />}
            <p className="text-xs text-muted-foreground mt-1">Balance after tech = {100 - activeTechPct}%</p>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>KTB share (% of balance)</span>
              <span className="font-bold">{activeKtbPct}%</span>
            </div>
            {!isApproved && <Slider value={[ktbPct]} onValueChange={([v]) => setKtbPct(v)} min={10} max={60} step={1} />}
            <p className="text-xs text-muted-foreground mt-1">MoE gets {moePct}% of balance</p>
          </div>

          <div className="space-y-2 pt-2">
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

      {/* Step 3: Live Money Flows */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Step 3 — Live Money Flows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border text-center" style={{ borderColor: 'hsl(270 60% 55%)' }}>
              <p className="text-xs text-muted-foreground">Tech partner</p>
              <p className="font-bold text-sm">{formatUSD(techUSD)}</p>
              <p className="text-xs text-muted-foreground">KES {formatKES(techUSD * activeFxRate)}</p>
            </div>
            <div className="p-3 rounded-lg border text-center" style={{ borderColor: 'hsl(210 70% 50%)' }}>
              <p className="text-xs text-muted-foreground">KTB</p>
              <p className="font-bold text-sm">{formatUSD(ktbUSD)}</p>
              <p className="text-xs text-muted-foreground">KES {formatKES(ktbUSD * activeFxRate)}</p>
            </div>
            <div className="p-3 rounded-lg border text-center" style={{ borderColor: 'hsl(150 60% 40%)' }}>
              <p className="text-xs text-muted-foreground">MoE / plantation</p>
              <p className="font-bold text-sm">{formatUSD(moeUSD)}</p>
              <p className="text-xs text-muted-foreground">KES {formatKES(moeUSD * activeFxRate)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">MoE receives</p>
                <p className="font-bold">{formatUSD(moeUSD)}</p>
                <p className="text-xs text-muted-foreground">KES {formatKES(moeUSD * activeFxRate)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">MoE needs</p>
                <p className="font-bold">{formatUSD(moeNeedUSD)}</p>
                <p className="text-xs text-muted-foreground">KES {formatKES(totalKES)}</p>
              </div>
            </div>

            {isViable ? (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <p className="font-medium text-emerald-800 text-sm">MoE receives {formatUSD(moeUSD)} — covers the KES {formatKES(totalKES)} ({formatUSD(moeNeedUSD)}) cost. Surplus {formatUSD(surplus)} strengthens MoE reserve.</p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <p className="font-medium text-amber-800 text-sm">
                    MoE shortfall of {formatUSD(Math.abs(surplus))}. Raise donation to at least{' '}
                    <button className="underline font-bold text-amber-900 hover:text-amber-700" onClick={() => setDonation(Math.min(minDonationRounded, 50))}>
                      {formatUSD(minDonationRounded)}
                    </button>{' '}or adjust the split.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Contribution Tiers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Step 4 — Contribution Tiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tiers.map(t => (
            <div key={t.name} className="flex items-center justify-between p-2.5 rounded-lg border text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{t.name}</span>
                {t.badge === 'fixed' && <Badge variant="secondary" className="text-xs">fixed</Badge>}
                {t.badge === 'recommended' && <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">recommended</Badge>}
              </div>
              <span className="font-bold">{formatUSD(t.price)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Approve button - only for pending */}
      {!isApproved && (
        <Button className="w-full gap-2" size="lg" disabled={!isViable || approveMutation.isPending} onClick={() => approveMutation.mutate()}>
          <CheckCircle2 className="h-4 w-4" />
          {approveMutation.isPending ? 'Publishing...' : 'Approve and Publish'}
        </Button>
      )}
    </div>
  );
};

export default PlantingCostsConfigPanel;
