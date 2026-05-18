import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Clock, AlertTriangle, Send, Info, Plus } from 'lucide-react';

const COST_FIELDS = [
  { key: 'cost_seedling_kes', label: 'Seedling / sapling cost', helper: 'KFS subsidised avg KES 20–50; private nursery KES 50–100' },
  { key: 'cost_planting_kes', label: 'Planting labour + site preparation', helper: 'Pit digging, planting, initial watering; CFA labour rate' },
  { key: 'cost_aftercare_yr1_kes', label: 'Year 1 aftercare', helper: 'Weeding ×4, watering, pest scouting, livestock patrol' },
  { key: 'cost_aftercare_yr2_kes', label: 'Year 2 aftercare', helper: 'Reduced weeding, pruning, quarterly health check' },
  { key: 'cost_aftercare_yr3_kes', label: 'Year 3 aftercare', helper: 'Light weeding, annual inspection; tree nearing self-sufficiency' },
  { key: 'cost_gps_mrv_kes', label: 'GPS geotagging + photo MRV', helper: 'OTOT ID tag, planting-day photo upload, GPS coordinates' },
  { key: 'cost_admin_overhead_kes', label: 'MoE admin and overhead', helper: 'Programme coordination, CFA benefit-sharing, inspection' },
] as const;

type CostKey = typeof COST_FIELDS[number]['key'];

const formatKES = (v: number) => Math.round(v).toLocaleString('en-US');
const formatUSD = (v: number) => `$${v.toFixed(2)}`;

const statusBadge = (status: string) => {
  switch (status) {
    case 'approved': return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200">Approved</Badge>;
    case 'pending_review': return <Badge className="bg-amber-500/10 text-amber-700 border-amber-200">Pending review</Badge>;
    case 'returned': return <Badge className="bg-red-500/10 text-red-700 border-red-200">Returned</Badge>;
    case 'superseded': return <Badge variant="secondary">Superseded</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

export const PlantingCostsTab: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: userOrg } = useQuery({
    queryKey: ['user-org-for-costs', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('organization_id, organizations!inner(name)')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const orgName = (userOrg?.organizations as any)?.name || '';

  const { data: activeConfig } = useQuery({
    queryKey: ['active-planting-config'],
    queryFn: async () => {
      const { data } = await supabase
        .from('planting_cost_configs')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      return data;
    },
  });

  const fxRate = activeConfig?.fx_rate_kes_usd ? Number(activeConfig.fx_rate_kes_usd) : 130;

  const { data: history } = useQuery({
    queryKey: ['planting-cost-history', orgName],
    queryFn: async () => {
      if (!orgName) return [];
      const { data } = await supabase
        .from('planting_cost_submissions')
        .select('*')
        .eq('owner_org', orgName)
        .order('submitted_at', { ascending: false });
      return data || [];
    },
    enabled: !!orgName,
  });

  // Auto-select the most recent submission
  useEffect(() => {
    if (history?.length && !selectedId) {
      setSelectedId(history[0].id);
    }
  }, [history, selectedId]);

  const selectedSubmission = useMemo(() => {
    return history?.find((s: any) => s.id === selectedId) || null;
  }, [history, selectedId]);

  const hasPending = history?.some((s: any) => s.status === 'pending_review');

  // Last returned submission for sheet notice
  const { data: returnedSubmission } = useQuery({
    queryKey: ['returned-planting-submission', orgName],
    queryFn: async () => {
      if (!orgName) return null;
      const { data } = await supabase
        .from('planting_cost_submissions')
        .select('*')
        .eq('owner_org', orgName)
        .eq('status', 'returned')
        .order('reviewed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!orgName,
  });

  // Form state — pre-fill from returned submission when opening sheet
  const emptyForm: Record<CostKey, string> = {
    cost_seedling_kes: '', cost_planting_kes: '', cost_aftercare_yr1_kes: '',
    cost_aftercare_yr2_kes: '', cost_aftercare_yr3_kes: '', cost_gps_mrv_kes: '', cost_admin_overhead_kes: '',
  };
  const [formValues, setFormValues] = useState<Record<CostKey, string>>(emptyForm);

  // Pre-fill form with returned submission values when sheet opens,
  // but only if the latest submission is actually "returned" (not approved/superseded)
  const latestIsReturned = history?.length ? history[0].status === 'returned' : false;
  const effectiveReturned = latestIsReturned ? returnedSubmission : null;

  useEffect(() => {
    if (sheetOpen && effectiveReturned) {
      const prefilled: Record<CostKey, string> = { ...emptyForm };
      COST_FIELDS.forEach(f => {
        const val = Number(effectiveReturned[f.key] || 0);
        prefilled[f.key] = val > 0 ? String(val) : '';
      });
      setFormValues(prefilled);
    } else if (sheetOpen) {
      setFormValues(emptyForm);
    }
  }, [sheetOpen, effectiveReturned]);

  const totalKES = useMemo(() => {
    return COST_FIELDS.reduce((sum, f) => sum + (parseFloat(formValues[f.key]) || 0), 0);
  }, [formValues]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const row: Record<string, any> = {
        submitted_by: user!.id,
        owner_org: orgName,
        status: 'pending_review',
        total_cost_kes: totalKES,
      };
      COST_FIELDS.forEach(f => { row[f.key] = parseFloat(formValues[f.key]) || 0; });
      const { error } = await supabase.from('planting_cost_submissions').insert(row as any);
      if (error) throw error;
      await supabase.from('planting_cost_notifications').insert({
        recipient_role: 'admin',
        message: `${orgName} submitted updated planting costs (KES ${formatKES(totalKES)}) for review.`,
      } as any);
    },
    onSuccess: () => {
      toast.success('Costs submitted. Admin will review and configure pricing.');
      queryClient.invalidateQueries({ queryKey: ['pending-planting-submission'] });
      queryClient.invalidateQueries({ queryKey: ['planting-cost-history'] });
      setFormValues({
        cost_seedling_kes: '', cost_planting_kes: '', cost_aftercare_yr1_kes: '',
        cost_aftercare_yr2_kes: '', cost_aftercare_yr3_kes: '', cost_gps_mrv_kes: '', cost_admin_overhead_kes: '',
      });
      setSelectedId(null);
      setSheetOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to submit'),
  });

  const renderCostRows = (submission: any) => (
    <div className="space-y-3">
      {COST_FIELDS.map(f => {
        const val = Number(submission[f.key] || 0);
        return (
          <div key={f.key} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{f.label}</span>
            <span className="font-medium">
              KES {formatKES(val)}
              <span className="text-muted-foreground ml-2">({formatUSD(val / fxRate)})</span>
            </span>
          </div>
        );
      })}
      <Separator />
      <div className="flex items-center justify-between font-semibold text-base">
        <span>Total cost per tree</span>
        <span>
          KES {formatKES(Number(submission.total_cost_kes || 0))}
          <span className="text-muted-foreground ml-2">({formatUSD(Number(submission.total_cost_kes || 0) / fxRate)})</span>
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header with button */}
      <div className="flex items-center justify-end">
        <Button
          onClick={() => setSheetOpen(true)}
          disabled={hasPending}
          className="gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Update Planting Costs
        </Button>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,1fr)_minmax(380px,1.5fr)] gap-6">
        {/* Left panel — submission list */}
        <div className="space-y-2">
          {history?.map((sub: any) => (
            <div
              key={sub.id}
              onClick={() => setSelectedId(sub.id)}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedId === sub.id
                  ? 'ring-2 ring-primary bg-primary/5 border-primary/30'
                  : 'hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {new Date(sub.submitted_at || sub.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  {' · '}
                  {new Date(sub.submitted_at || sub.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {statusBadge(sub.status)}
              </div>
              <span className="text-sm font-medium">KES {formatKES(Number(sub.total_cost_kes || 0))}</span>
            </div>
          ))}
          {(!history || history.length === 0) && (
            <p className="text-sm text-muted-foreground py-6 text-center">No submissions yet.</p>
          )}
        </div>

        {/* Right panel — selected submission detail */}
        <div>
          {selectedSubmission ? (
            <div className="rounded-lg border p-6 space-y-4">
              {/* Status banner */}
              {selectedSubmission.status === 'pending_review' && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <p className="font-medium text-amber-800 text-sm">
                      Submission pending review since {new Date(selectedSubmission.submitted_at || '').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                  {statusBadge('pending_review')}
                </div>
              )}
              {selectedSubmission.status === 'approved' && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-emerald-700 text-sm font-medium">
                    Approved — effective {activeConfig?.effective_from ? new Date(activeConfig.effective_from).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
                  </p>
                </div>
              )}
              {selectedSubmission.status === 'returned' && selectedSubmission.admin_comment && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-red-800 text-sm">Admin returned this submission:</p>
                      <p className="text-red-700 text-sm mt-1">{selectedSubmission.admin_comment}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Superseded notice */}
              {selectedSubmission.status === 'superseded' && (
                <div className="p-3 rounded-lg bg-muted/50 border border-muted-foreground/20">
                  <p className="text-sm text-muted-foreground">This cost has been superseded by an updated submission.</p>
                </div>
              )}

              {/* Cost breakdown */}
              {renderCostRows(selectedSubmission)}
            </div>
          ) : (
            <div className="rounded-lg border p-6 flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Select a submission to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Sheet slider for submitting updated costs */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Update Planting Costs</SheetTitle>
            <SheetDescription>Enter all values in KES per tree. Submit for admin review.</SheetDescription>
          </SheetHeader>

          <div className="space-y-5 mt-6">
            {effectiveReturned && effectiveReturned.admin_comment && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800 text-sm">Admin returned your last submission:</p>
                    <p className="text-amber-700 text-sm mt-1">{effectiveReturned.admin_comment}</p>
                    <p className="text-amber-600 text-xs mt-2">Please revise and resubmit.</p>
                  </div>
                </div>
              </div>
            )}

            {COST_FIELDS.map(f => {
              const val = parseFloat(formValues[f.key]) || 0;
              return (
                <div key={f.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{f.label} (KES)</Label>
                    {val > 0 && <span className="text-xs text-muted-foreground">{formatUSD(val / fxRate)}</span>}
                  </div>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formValues[f.key]}
                    onChange={e => setFormValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    {f.helper}
                  </p>
                </div>
              );
            })}

            <Separator />
            <div className="flex items-center justify-between text-base font-semibold p-3 rounded-lg bg-muted/50">
              <span>Total per tree</span>
              <span>KES {formatKES(totalKES)} = {formatUSD(totalKES / fxRate)}</span>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || totalKES <= 0}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {submitMutation.isPending ? 'Submitting...' : 'Submit for Review'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default PlantingCostsTab;
