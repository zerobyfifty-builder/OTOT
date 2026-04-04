import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { ChevronDown, CornerDownLeft, ArrowRight } from 'lucide-react';

const COST_FIELDS = [
  { key: 'cost_seedling_kes', label: 'Seedling / sapling' },
  { key: 'cost_planting_kes', label: 'Planting labour + site prep' },
  { key: 'cost_aftercare_yr1_kes', label: 'Year 1 aftercare' },
  { key: 'cost_aftercare_yr2_kes', label: 'Year 2 aftercare' },
  { key: 'cost_aftercare_yr3_kes', label: 'Year 3 aftercare' },
  { key: 'cost_gps_mrv_kes', label: 'GPS geotagging + MRV' },
  { key: 'cost_admin_overhead_kes', label: 'MoE admin overhead' },
];

const formatKES = (v: number) => `KES ${Math.round(v).toLocaleString('en-US')}`;
const formatUSD = (v: number, fx: number) => `$${(v / fx).toFixed(2)}`;

const statusBadge = (status: string) => {
  switch (status) {
    case 'approved': return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200">Approved</Badge>;
    case 'pending_review': return <Badge className="bg-amber-500/10 text-amber-700 border-amber-200">Pending</Badge>;
    case 'returned': return <Badge className="bg-red-500/10 text-red-700 border-red-200">Returned</Badge>;
    case 'superseded': return <Badge variant="secondary">Superseded</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

interface Props {
  onSelectSubmission: (submission: any) => void;
  selectedId?: string;
}

export const PlantingCostsReviewPanel: React.FC<Props> = ({ onSelectSubmission, selectedId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [returnComment, setReturnComment] = useState('');
  const [returningId, setReturningId] = useState<string | null>(null);
  const fx = 130;

  const { data: submissions } = useQuery({
    queryKey: ['all-planting-submissions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('planting_cost_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });
      return data || [];
    },
  });

  const pendingCount = submissions?.filter(s => s.status === 'pending_review').length || 0;

  const returnMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      const { error } = await supabase
        .from('planting_cost_submissions')
        .update({
          status: 'returned',
          admin_comment: comment,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user!.id,
        } as any)
        .eq('id', id);
      if (error) throw error;
      await supabase.from('planting_cost_notifications').insert({
        submission_id: id,
        recipient_role: 'plantation',
        message: `Your planting cost submission has been returned. Comment: ${comment}`,
      } as any);
    },
    onSuccess: () => {
      toast.success('Submission returned with comment');
      setReturningId(null);
      setReturnComment('');
      queryClient.invalidateQueries({ queryKey: ['all-planting-submissions'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [tab, setTab] = useState('pending');

  const filtered = tab === 'pending'
    ? submissions?.filter(s => s.status === 'pending_review')
    : submissions;

  const renderCard = (sub: any) => (
    <Collapsible
      key={sub.id}
      open={expandedId === sub.id}
      onOpenChange={open => setExpandedId(open ? sub.id : null)}
    >
      <div className={`border rounded-lg transition-colors ${selectedId === sub.id ? 'ring-2 ring-primary border-primary' : ''}`}>
        <CollapsibleTrigger className="w-full">
          <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="text-left">
              <p className="font-medium text-sm">{sub.stakeholder_org}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(sub.submitted_at || sub.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge(sub.status)}
              <span className="text-sm font-medium">{formatKES(Number(sub.total_cost_kes))}</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedId === sub.id ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            <Separator />
            {COST_FIELDS.map(f => {
              const val = Number((sub as any)[f.key] || 0);
              return (
                <div key={f.key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span>{formatKES(val)} <span className="text-muted-foreground">({formatUSD(val, fx)})</span></span>
                </div>
              );
            })}
            <Separator />
            <div className="flex justify-between font-semibold text-sm">
              <span>Total</span>
              <span>{formatKES(Number(sub.total_cost_kes))} ({formatUSD(Number(sub.total_cost_kes), fx)})</span>
            </div>

            {sub.status === 'pending_review' && (
              <div className="flex gap-2 pt-2">
                {returningId === sub.id ? (
                  <div className="w-full space-y-2">
                    <Textarea
                      placeholder="Enter comment for plantation partner..."
                      value={returnComment}
                      onChange={e => setReturnComment(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={!returnComment.trim() || returnMutation.isPending}
                        onClick={() => returnMutation.mutate({ id: sub.id, comment: returnComment })}
                      >
                        <CornerDownLeft className="h-3 w-3 mr-1" />
                        Confirm Return
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setReturningId(null); setReturnComment(''); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setReturningId(sub.id)}>
                      <CornerDownLeft className="h-3 w-3 mr-1" />
                      Return with comment
                    </Button>
                    <Button size="sm" onClick={() => onSelectSubmission(sub)}>
                      <ArrowRight className="h-3 w-3 mr-1" />
                      Use these costs
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Cost Submissions</h2>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="all">All submissions</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="space-y-3 mt-3">
          {filtered?.length ? filtered.map(renderCard) : (
            <p className="text-sm text-muted-foreground py-4">No pending submissions.</p>
          )}
        </TabsContent>
        <TabsContent value="all" className="space-y-3 mt-3">
          {filtered?.length ? filtered.map(renderCard) : (
            <p className="text-sm text-muted-foreground py-4">No submissions yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlantingCostsReviewPanel;
