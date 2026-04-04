import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { CheckCircle2, Clock, AlertTriangle, ChevronDown, Send, Info, Plus } from 'lucide-react';

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

  // Get user's org name
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

  // Active config
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

  // Active approved submission (for display)
  const { data: approvedSubmission } = useQuery({
    queryKey: ['approved-planting-submission', activeConfig?.submission_id],
    queryFn: async () => {
      if (!activeConfig?.submission_id) return null;
      const { data } = await supabase
        .from('planting_cost_submissions')
        .select('*')
        .eq('id', activeConfig.submission_id)
        .maybeSingle();
      return data;
    },
    enabled: !!activeConfig?.submission_id,
  });

  // Pending submission from this org
  const { data: pendingSubmission } = useQuery({
    queryKey: ['pending-planting-submission', orgName],
    queryFn: async () => {
      if (!orgName) return null;
      const { data } = await supabase
        .from('planting_cost_submissions')
        .select('*')
        .eq('stakeholder_org', orgName)
        .eq('status', 'pending_review')
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!orgName,
  });

  // Last returned submission
  const { data: returnedSubmission } = useQuery({
    queryKey: ['returned-planting-submission', orgName],
    queryFn: async () => {
      if (!orgName) return null;
      const { data } = await supabase
        .from('planting_cost_submissions')
        .select('*')
        .eq('stakeholder_org', orgName)
        .eq('status', 'returned')
        .order('reviewed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!orgName,
  });

  // Submission history
  const { data: history } = useQuery({
    queryKey: ['planting-cost-history', orgName],
    queryFn: async () => {
      if (!orgName) return [];
      const { data } = await supabase
        .from('planting_cost_submissions')
        .select('*')
        .eq('stakeholder_org', orgName)
        .order('submitted_at', { ascending: false });
      return data || [];
    },
    enabled: !!orgName,
  });

  // Form state
  const [formValues, setFormValues] = useState<Record<CostKey, string>>({
    cost_seedling_kes: '',
    cost_planting_kes: '',
    cost_aftercare_yr1_kes: '',
    cost_aftercare_yr2_kes: '',
    cost_aftercare_yr3_kes: '',
    cost_gps_mrv_kes: '',
    cost_admin_overhead_kes: '',
  });

  const totalKES = useMemo(() => {
    return COST_FIELDS.reduce((sum, f) => sum + (parseFloat(formValues[f.key]) || 0), 0);
  }, [formValues]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const row: Record<string, any> = {
        submitted_by: user!.id,
        stakeholder_org: orgName,
        status: 'pending_review',
        total_cost_kes: totalKES,
      };
      COST_FIELDS.forEach(f => {
        row[f.key] = parseFloat(formValues[f.key]) || 0;
      });
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
      setSheetOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to submit'),
  });

  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const renderCostRows = (submission: any, showUSD = true) => (
    <div className="space-y-2">
      {COST_FIELDS.map(f => {
        const val = Number(submission[f.key] || 0);
        return (
          <div key={f.key} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{f.label}</span>
            <span className="font-medium">
              KES {formatKES(val)}
              {showUSD && <span className="text-muted-foreground ml-2">({formatUSD(val / fxRate)})</span>}
            </span>
          </div>
        );
      })}
      <Separator />
      <div className="flex items-center justify-between font-semibold">
        <span>Total cost per tree</span>
        <span>
          KES {formatKES(Number(submission.total_cost_kes || 0))}
          {showUSD && <span className="text-muted-foreground ml-2">({formatUSD(Number(submission.total_cost_kes || 0) / fxRate)})</span>}
        </span>
      </div>
    </div>
  );

  const hasPending = !!pendingSubmission;

  return (
    <div className="space-y-6">
      {/* Header with button */}
      <div className="flex items-center justify-between">
        <div />
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

      {/* Pending notice inline */}
      {pendingSubmission && (
        <Card>
          <CardContent className="pt-6">
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <p className="font-medium text-amber-800 text-sm">
                  Submission pending review since {new Date(pendingSubmission.submitted_at || '').toLocaleDateString()}
                </p>
              </div>
              {statusBadge('pending_review')}
            </div>
            {renderCostRows(pendingSubmission)}
          </CardContent>
        </Card>
      )}

      {/* SECTION A — Current approved costs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Current Approved Costs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvedSubmission ? (
            <div className="space-y-4">
              {renderCostRows(approvedSubmission)}
              <div className="flex items-center gap-2 pt-2">
                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200">
                  Currently approved — effective {new Date(activeConfig?.effective_from || '').toLocaleDateString()}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No approved costs on record yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Submission history */}
      {history && history.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Submission history</CardTitle>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3 pt-0">
                {history.map((sub: any) => (
                  <Collapsible
                    key={sub.id}
                    open={expandedHistoryId === sub.id}
                    onOpenChange={open => setExpandedHistoryId(open ? sub.id : null)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {new Date(sub.submitted_at || sub.created_at).toLocaleDateString()}
                          </span>
                          {statusBadge(sub.status)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">KES {formatKES(Number(sub.total_cost_kes || 0))}</span>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedHistoryId === sub.id ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 border border-t-0 rounded-b-lg bg-muted/10">
                        {renderCostRows(sub, false)}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Sheet slider for submitting updated costs */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Update Planting Costs</SheetTitle>
            <SheetDescription>
              Enter all values in KES per tree. Submit for admin review.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 mt-6">
            {/* Returned notice */}
            {returnedSubmission && returnedSubmission.admin_comment && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800 text-sm">Admin returned your last submission:</p>
                    <p className="text-amber-700 text-sm mt-1">{returnedSubmission.admin_comment}</p>
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
                    {val > 0 && (
                      <span className="text-xs text-muted-foreground">{formatUSD(val / fxRate)}</span>
                    )}
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
