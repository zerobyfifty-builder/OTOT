import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const formatKES = (v: number) => `KES ${Math.round(v).toLocaleString('en-US')}`;

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
  const [tab, setTab] = useState('pending');

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

  const filtered = tab === 'pending'
    ? submissions?.filter(s => s.status === 'pending_review')
    : submissions;

  const renderCard = (sub: any) => (
    <div
      key={sub.id}
      className={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-muted/30 ${selectedId === sub.id ? 'ring-2 ring-primary border-primary' : ''}`}
      onClick={() => onSelectSubmission(sub)}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{sub.stakeholder_org}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(sub.submitted_at || sub.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge(sub.status)}
          <span className="text-sm font-medium">{formatKES(Number(sub.total_cost_kes))}</span>
        </div>
      </div>
    </div>
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
