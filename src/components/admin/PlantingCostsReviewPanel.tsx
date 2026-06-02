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
    try {
      // Delete associated notifications first (no FK cascade assumed)
      await supabase.from('planting_cost_notifications').delete().eq('submission_id', toDelete.id);
      const { error } = await supabase
        .from('planting_cost_submissions')
        .delete()
        .eq('id', toDelete.id);
      if (error) throw error;
      toast.success('Submission deleted');
      if (selectedId === toDelete.id) onSelectSubmission(null as any);
      queryClient.invalidateQueries({ queryKey: ['all-planting-submissions'] });
      setToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
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
              className={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-muted/30 ${selectedId === sub.id ? 'ring-2 ring-primary border-primary' : ''} ${isLive ? 'bg-emerald-500/5 border-emerald-300' : ''}`}
              onClick={() => onSelectSubmission(sub)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{sub.owner_org}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {statusBadge(sub.status)}
                  <span className="text-sm font-medium">{formatKES(Number(sub.total_cost_kes))}</span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <p className="text-muted-foreground">Submitted</p>
                  <p className="font-medium">{fmtDate(sub.submitted_at || sub.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Approved</p>
                  <p className="font-medium">{showApprovalDetails ? fmtDate(sub.reviewed_at) : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">
                    {showApprovalDetails
                      ? `${fmtDuration(sub.reviewed_at, endDate)}${isLive && !endDate ? ' (live)' : ''}`
                      : '—'}
                  </p>
                </div>
              </div>
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
