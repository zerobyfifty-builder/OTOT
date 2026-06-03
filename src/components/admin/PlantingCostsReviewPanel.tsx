import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const formatKES = (v: number) => `KES ${Math.round(v).toLocaleString('en-US')}`;
const formatUSD = (v: number) => `$${v.toFixed(2)}`;

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const fmtDuration = (start?: string | null, end?: string | null) => {
  if (!start) return '—';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const days = Math.max(0, Math.floor((e - s) / 86400000));
  if (days < 1) return '< 1 day';
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}`;
  const months = Math.floor(days / 30);
  const rem = days % 30;
  return rem ? `${months}mo ${rem}d` : `${months}mo`;
};

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
  const queryClient = useQueryClient();
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const { data: configs } = useQuery({
    queryKey: ['all-planting-configs-fx'],
    queryFn: async () => {
      const { data } = await supabase
        .from('planting_cost_configs')
        .select('submission_id, fx_rate_kes_usd, donation_usd, is_active');
      return data || [];
    },
  });

  const fxBySubmission = useMemo(() => {
    const donationMap: Record<string, number> = {};
    let activeDonation = 0;
    (configs || []).forEach((c: any) => {
      if (c.submission_id) donationMap[c.submission_id] = Number(c.donation_usd);
      if (c.is_active) activeDonation = Number(c.donation_usd);
    });
    return { donationMap, activeDonation };
  }, [configs]);

  // Build approval timeline: for each approved/superseded entry,
  // compute end = next approved's reviewed_at (chronologically after it).
  const endDates = useMemo(() => {
    const map: Record<string, string | null> = {};
    if (!submissions) return map;
    const approved = submissions
      .filter((s: any) => (s.status === 'approved' || s.status === 'superseded') && s.reviewed_at)
      .sort((a: any, b: any) => new Date(a.reviewed_at).getTime() - new Date(b.reviewed_at).getTime());
    for (let i = 0; i < approved.length; i++) {
      map[approved[i].id] = approved[i + 1]?.reviewed_at ?? null;
    }
    return map;
  }, [submissions]);

  useEffect(() => {
    if (submissions?.length && !selectedId) {
      onSelectSubmission(submissions[0]);
    }
  }, [submissions, selectedId, onSelectSubmission]);

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const id = toDelete.id;
    // Optimistic update — remove from cache instantly
    queryClient.setQueryData(['all-planting-submissions'], (old: any) =>
      Array.isArray(old) ? old.filter((s: any) => s.id !== id) : old
    );
    try {
      await supabase.from('planting_cost_notifications').delete().eq('submission_id', id);
      const { error, count } = await supabase
        .from('planting_cost_submissions')
        .delete({ count: 'exact' })
        .eq('id', id);
      if (error) throw error;
      if (!count) throw new Error('Delete blocked by permissions');
      toast.success('Submission deleted');
      if (selectedId === id) onSelectSubmission(null as any);
      setToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
      // Roll back by refetching
      queryClient.invalidateQueries({ queryKey: ['all-planting-submissions'] });
    } finally {
      queryClient.invalidateQueries({ queryKey: ['all-planting-submissions'] });
      setDeleting(false);
    }
  };


  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Cost Submissions</h2>
      <div className="space-y-3">
        {submissions?.length ? submissions.map((sub: any) => {
          const isLive = sub.status === 'approved';
          const endDate = endDates[sub.id];
          const showApprovalDetails = sub.status === 'approved' || sub.status === 'superseded';
          return (
            <div
              key={sub.id}
              className={`group relative border rounded-xl p-5 cursor-pointer transition-all hover:shadow-sm hover:border-foreground/20 ${selectedId === sub.id ? 'ring-2 ring-primary border-primary shadow-sm' : 'border-border'} ${isLive ? 'bg-emerald-500/[0.03] border-emerald-300/60' : 'bg-card'}`}
              onClick={() => onSelectSubmission(sub)}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm leading-tight truncate text-foreground">{sub.owner_org}</p>
                  <div className="mt-1.5">{statusBadge(sub.status)}</div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total / tree</p>
                  <p className="text-base font-semibold tabular-nums text-foreground">{formatKES(Number(sub.total_cost_kes))}</p>
                  <p className="text-xs font-medium tabular-nums text-muted-foreground">{formatUSD(fxBySubmission.donationMap[sub.id] ?? fxBySubmission.activeDonation)}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="my-4 h-px bg-border/60" />

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Submitted</p>
                  <p className="text-xs font-medium tabular-nums text-foreground">{fmtDate(sub.submitted_at || sub.created_at)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Approved</p>
                  <p className="text-xs font-medium tabular-nums text-foreground">{showApprovalDetails ? fmtDate(sub.reviewed_at) : '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Duration</p>
                  <p className="text-xs font-medium tabular-nums text-foreground">
                    {showApprovalDetails
                      ? (
                        <>
                          {fmtDuration(sub.reviewed_at, endDate)}
                          {isLive && !endDate && <span className="ml-1 text-emerald-600 font-semibold">· Live</span>}
                        </>
                      )
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Delete action */}
              {!isLive && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute bottom-2 right-2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); setToDelete(sub); }}
                  aria-label="Delete submission"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        }) : (

          <p className="text-sm text-muted-foreground py-4">No submissions yet.</p>
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete cost submission?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && (
                <>
                  This will permanently delete the submission from{' '}
                  <strong>{toDelete.owner_org}</strong> submitted on{' '}
                  <strong>{fmtDate(toDelete.submitted_at || toDelete.created_at)}</strong>.
                  <br /><br />
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlantingCostsReviewPanel;
