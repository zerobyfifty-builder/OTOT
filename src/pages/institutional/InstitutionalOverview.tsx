import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { format, startOfMonth, subMonths } from 'date-fns';
import { Users, Ticket, Leaf, DollarSign, TreePine, AlertCircle } from 'lucide-react';

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
        .select('id, agent_id, total_co2, trees_needed, trees_planted, tree_status, ktb_payment_status, offset_amount_paid, created_at')
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

  // Monthly trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const buckets: { key: string; label: string; tickets: number; co2: number; usd: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = startOfMonth(subMonths(new Date(), i));
      buckets.push({ key: format(d, 'yyyy-MM'), label: format(d, 'MMM'), tickets: 0, co2: 0, usd: 0 });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    (tickets || []).forEach((t: any) => {
      const k = format(new Date(t.created_at), 'yyyy-MM');
      const i = idx.get(k);
      if (i === undefined) return;
      buckets[i].tickets += 1;
      buckets[i].co2 += Number(t.total_co2 || 0);
      buckets[i].usd += Number(t.offset_amount_paid || 0);
    });
    return buckets;
  }, [tickets]);

  // Top agents by contribution
  const topAgents = useMemo(() => {
    const map = new Map<string, { name: string; tickets: number; co2: number; usd: number }>();
    (agents || []).forEach((a: any) => map.set(a.id, { name: a.name, tickets: 0, co2: 0, usd: 0 }));
    (tickets || []).forEach((t: any) => {
      const r = map.get(t.agent_id);
      if (!r) return;
      r.tickets += 1;
      r.co2 += Number(t.total_co2 || 0);
      r.usd += Number(t.offset_amount_paid || 0);
    });
    return Array.from(map.values())
      .sort((a, b) => b.usd - a.usd)
      .slice(0, 5);
  }, [agents, tickets]);

  // Payment status distribution
  const paymentDist = useMemo(() => {
    const counts: Record<string, number> = {};
    (tickets || []).forEach((t: any) => {
      const k = t.ktb_payment_status || 'Unknown';
      counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tickets]);

  // Tree status distribution
  const treeDist = useMemo(() => {
    const counts: Record<string, number> = {};
    (tickets || []).forEach((t: any) => {
      const k = t.tree_status || 'Unknown';
      counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tickets]);

  const loading = loadingAgents || loadingTickets;

  const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted-foreground))', 'hsl(var(--destructive))'];

  const kpis = [
    { label: 'Travel Agents', value: totalAgents, sub: `${activeAgents} active · ${inactiveAgents} inactive`, icon: Users },
    { label: 'Tickets Issued', value: totalTickets, sub: `${paymentsDue} payment due`, icon: Ticket },
    { label: 'CO₂ Offset', value: `${(totalCO2Kg / 1000).toFixed(2)} t`, sub: `${totalCO2Kg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg total`, icon: Leaf },
    { label: 'Contributions', value: `$${contributionsUsd.toFixed(2)}`, sub: 'USD lifetime', icon: DollarSign },
    { label: 'Trees Committed', value: treesCommitted.toLocaleString(), sub: `${treesPlanted.toLocaleString()} planted`, icon: TreePine },
    { label: 'Planting Progress', value: `${treesCommitted > 0 ? Math.round((treesPlanted / treesCommitted) * 100) : 0}%`, sub: 'of committed', icon: AlertCircle },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-muted-foreground">
          Aggregated analytics for {orgInfo?.organizationName || 'your organization'} — scoped to your allocated modules.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold tabular-nums mt-2">
                  {loading ? <Skeleton className="h-7 w-20" /> : k.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity — last 6 months</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="gTickets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCo2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Legend />
                <Area type="monotone" dataKey="tickets" name="Tickets" stroke="hsl(var(--primary))" fill="url(#gTickets)" strokeWidth={2} />
                <Area type="monotone" dataKey="co2" name="CO₂ (kg)" stroke="hsl(var(--accent))" fill="url(#gCo2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top agents */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top agents by contribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topAgents} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={120} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Bar dataKey="usd" name="USD" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {paymentDist.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trees committed vs planted */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trees — committed vs planted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ name: 'Trees', committed: treesCommitted, planted: treesPlanted }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="committed" name="Committed" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="planted" name="Planted" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tree status distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tree status distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={treeDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {treeDist.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
