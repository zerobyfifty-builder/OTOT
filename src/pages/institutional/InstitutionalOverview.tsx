import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function InstitutionalOverview() {
  const { user } = useAuth();

  const { data: orgInfo } = useQuery({
    queryKey: ['overviewOrgInfo', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('users')
        .select('organization_id, organizations(name)')
        .eq('user_id', user.id)
        .maybeSingle();
      return {
        organizationId: (data as any)?.organization_id || null,
        organizationName: (data as any)?.organizations?.name || null,
      };
    },
    enabled: !!user?.id,
  });

  const orgId = orgInfo?.organizationId;

  const { data: agents, isLoading: loadingAgents } = useQuery({
    queryKey: ['overviewAgents', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('travel_agents')
        .select('id, name, business_name, is_active')
        .eq('organization_id', orgId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const agentIds = useMemo(() => (agents || []).map((a: any) => a.id), [agents]);

  const { data: tickets, isLoading: loadingTickets } = useQuery({
    queryKey: ['overviewTickets', agentIds],
    queryFn: async () => {
      if (!agentIds.length) return [];
      const { data, error } = await supabase
        .from('agent_tickets')
        .select('id, agent_id, staff_name, total_co2, trees_needed, trees_planted, tree_status, ktb_payment_status, offset_amount_paid, created_at')
        .in('agent_id', agentIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: agentIds.length > 0,
  });

  const totalAgents = agents?.length || 0;
  const activeAgents = (agents || []).filter((a: any) => a.is_active).length;
  const inactiveAgents = totalAgents - activeAgents;

  const totalTickets = tickets?.length || 0;
  const totalCO2Kg = (tickets || []).reduce((s, t: any) => s + Number(t.total_co2 || 0), 0);
  const treesCommitted = (tickets || []).reduce((s, t: any) => s + Number(t.trees_needed || 0), 0);
  const treesPlanted = (tickets || []).reduce((s, t: any) => s + Number(t.trees_planted || 0), 0);
  const contributionsUsd = (tickets || []).reduce((s, t: any) => s + Number(t.offset_amount_paid || 0), 0);
  const paymentsDue = (tickets || []).filter((t: any) => t.ktb_payment_status === 'Payment Due').length;

  // Per-agent rollup
  const perAgent = useMemo(() => {
    const map = new Map<string, { name: string; business: string; active: boolean; tickets: number; co2: number; trees: number; planted: number; usd: number }>();
    (agents || []).forEach((a: any) => {
      map.set(a.id, { name: a.name, business: a.business_name, active: a.is_active, tickets: 0, co2: 0, trees: 0, planted: 0, usd: 0 });
    });
    (tickets || []).forEach((t: any) => {
      const row = map.get(t.agent_id);
      if (!row) return;
      row.tickets += 1;
      row.co2 += Number(t.total_co2 || 0);
      row.trees += Number(t.trees_needed || 0);
      row.planted += Number(t.trees_planted || 0);
      row.usd += Number(t.offset_amount_paid || 0);
    });
    return Array.from(map.values()).sort((a, b) => b.tickets - a.tickets);
  }, [agents, tickets]);

  const loading = loadingAgents || loadingTickets;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-muted-foreground">
          Aggregated analytics for {orgInfo?.organizationName || 'your organization'} — scoped to your allocated modules.
        </p>
      </div>

      {/* Travel Agents KPIs */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Travel Agents</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Agents</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold tabular-nums">{loading ? <Skeleton className="h-8 w-16" /> : totalAgents}</p>
              <p className="text-xs text-muted-foreground mt-1">{activeAgents} active · {inactiveAgents} inactive</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tickets Issued</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold tabular-nums">{loading ? <Skeleton className="h-8 w-16" /> : totalTickets}</p>
              <p className="text-xs text-muted-foreground mt-1">{paymentsDue} payment due</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">CO₂ Offset</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold tabular-nums">{loading ? <Skeleton className="h-8 w-16" /> : (totalCO2Kg / 1000).toFixed(2)}<span className="text-base font-normal text-muted-foreground ml-1">t</span></p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Contributions</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold tabular-nums">${loading ? '—' : contributionsUsd.toFixed(2)}</p></CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Trees Committed</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold tabular-nums">{loading ? <Skeleton className="h-8 w-16" /> : treesCommitted.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Trees Planted</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold tabular-nums text-emerald-700">{loading ? <Skeleton className="h-8 w-16" /> : treesPlanted.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{treesCommitted > 0 ? Math.round((treesPlanted / treesCommitted) * 100) : 0}% of committed</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Per-agent breakdown */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Per-Agent Breakdown</h2>
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tickets</TableHead>
                <TableHead className="text-right">CO₂ (kg)</TableHead>
                <TableHead className="text-right">Trees Committed</TableHead>
                <TableHead className="text-right">Trees Planted</TableHead>
                <TableHead className="text-right">Contributions (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : perAgent.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No travel agents yet.</TableCell></TableRow>
              ) : perAgent.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.business}</TableCell>
                  <TableCell>
                    <Badge variant={row.active ? 'default' : 'secondary'}>{row.active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.tickets}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.co2.toFixed(0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.trees}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.planted}</TableCell>
                  <TableCell className="text-right tabular-nums">${row.usd.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Recent tickets */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Tickets</h2>
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead className="text-right">CO₂ (kg)</TableHead>
                <TableHead className="text-right">Trees</TableHead>
                <TableHead>Tree Status</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : !tickets || tickets.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No tickets yet.</TableCell></TableRow>
              ) : tickets.slice(0, 10).map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm">{format(new Date(t.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{t.staff_name}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(t.total_co2).toFixed(0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.trees_planted}/{t.trees_needed}</TableCell>
                  <TableCell><Badge variant={t.tree_status === 'Planted' ? 'default' : 'secondary'}>{t.tree_status}</Badge></TableCell>
                  <TableCell><Badge variant={t.ktb_payment_status === 'Paid' ? 'default' : 'secondary'}>{t.ktb_payment_status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
