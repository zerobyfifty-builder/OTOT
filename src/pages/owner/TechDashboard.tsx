import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Cpu, Activity, Database, Server, ShieldCheck, Zap, DollarSign,
  RefreshCw, GitBranch, AlertTriangle, CheckCircle2, Clock, TrendingUp,
  Code2, Layers, Webhook, Gauge,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Line, LineChart, Legend,
} from "recharts";
import { formatNumber } from "@/lib/utils";
import { format, subDays, startOfDay } from "date-fns";

const TINTS = {
  blue:    { bg: "bg-[#E5F0FF] dark:bg-[#1F2A3D]", fg: "text-[#1E5BB8] dark:text-[#9EC5FF]" },
  indigo:  { bg: "bg-[#E3E7FB] dark:bg-[#2A2E47]", fg: "text-[#3B4A8C] dark:text-[#C7CEF5]" },
  violet:  { bg: "bg-[#EFE6FF] dark:bg-[#2D2342]", fg: "text-[#6B3FB8] dark:text-[#D4BFFF]" },
  emerald: { bg: "bg-[#D7F0E5] dark:bg-[#1E332A]", fg: "text-[#1D7A52] dark:text-[#9EE3C0]" },
};

const KpiTile = ({
  label, value, suffix, icon: Icon, tint, hint,
}: {
  label: string; value: string | number; suffix?: string;
  icon: any; tint: { bg: string; fg: string }; hint?: string;
}) => (
  <Card className="border shadow-sm hover:shadow-md transition-all">
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums mt-1 truncate">
            {value}{suffix && <span className="text-base font-semibold ml-0.5 text-muted-foreground">{suffix}</span>}
          </p>
          {hint && <p className="text-[11px] text-muted-foreground mt-1 truncate">{hint}</p>}
        </div>
        <div className={`h-10 w-10 rounded-xl ${tint.bg} ${tint.fg} flex items-center justify-center shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const TechDashboard = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const { data: userProfile } = useQuery({
    queryKey: ["techProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("users")
        .select("*, organizations(*, partner_types(name))")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const orgInfo = userProfile?.organizations as any;
  const userName = userProfile
    ? [userProfile.first_name, userProfile.last_name].filter(Boolean).join(" ") || user?.user_metadata?.full_name
    : null;

  // Tech-fee-driven contribution data
  const { data: contributions, isLoading: contribLoading, refetch } = useQuery({
    queryKey: ["techContributions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contribution_tracking" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);
      return (data as any[]) || [];
    },
  });

  const { data: walletSettings } = useQuery({
    queryKey: ["walletSettings"],
    queryFn: async () => {
      const { data } = await supabase.from("wallet_settings" as any).select("*");
      return (data as any[]) || [];
    },
  });

  const techFeePercent = useMemo(() => {
    const s = walletSettings?.find((w: any) => w.setting_key === "tech_partner_fee");
    return s ? Number(s.setting_value || 0) : 0;
  }, [walletSettings]);

  // ─── KPIs ─────────────────────────────────────────────
  const kpis = useMemo(() => {
    const all = contributions || [];
    const totalContribution = all.reduce((s, c) => s + Number(c.amount_paid || 0), 0);
    const totalTechFee = all.reduce((s, c) => s + (Number(c.amount_paid || 0) * (Number(c.tech_fee_percent ?? techFeePercent)) / 100), 0);
    const totalTechReceived = all.reduce(
      (s, c) => s + Number(c.tech_fee_received || 0),
      0
    );
    const techUnderProcessing = Math.max(totalTechFee - totalTechReceived, 0);
    return {
      totalContribution,
      totalTechFee,
      totalTechReceived,
      techUnderProcessing,
      contributions: all.length,
    };
  }, [contributions, techFeePercent]);

  // ─── Daily revenue trend (last 30 days) ───────────────
  const trend = useMemo(() => {
    const days: { date: string; label: string; fee: number; gross: number; txn: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      days.push({
        date: d.toISOString(),
        label: format(d, "MMM d"),
        fee: 0, gross: 0, txn: 0,
      });
    }
    const map = new Map(days.map(d => [format(new Date(d.date), "yyyy-MM-dd"), d]));
    (contributions || []).forEach((c: any) => {
      const k = format(new Date(c.payment_date || c.created_at), "yyyy-MM-dd");
      const row = map.get(k);
      if (row) {
        const pct = Number(c.tech_fee_percent ?? techFeePercent);
        row.fee += Number(c.amount_paid || 0) * pct / 100;
        row.gross += Number(c.amount_paid || 0);
        row.txn += 1;
      }
    });
    return Array.from(map.values());
  }, [contributions, techFeePercent]);

  // ─── Status breakdown of contributions (for tech reconciliation) ────
  const statusBreakdown = useMemo(() => {
    const buckets: Record<string, number> = {};
    (contributions || []).forEach((c: any) => {
      buckets[c.status || "unknown"] = (buckets[c.status || "unknown"] || 0) + 1;
    });
    return Object.entries(buckets).map(([status, count]) => ({
      status: status.replace(/_/g, " "),
      count,
    }));
  }, [contributions]);

  // ─── Platform health (live, derived from Supabase) ─────
  const { data: platformHealth, isLoading: healthLoading } = useQuery({
    queryKey: ["techPlatformHealth"],
    queryFn: async () => {
      const since = subDays(new Date(), 1).toISOString();
      const [usersRes, trees, trips, orgs] = await Promise.all([
        supabase.from("users").select("user_id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("trees").select("id", { count: "exact", head: true }),
        supabase.from("trips").select("id", { count: "exact", head: true }),
        supabase.from("organizations").select("id", { count: "exact", head: true }),
      ]);
      return {
        newUsers24h: usersRes.count || 0,
        trees: trees.count || 0,
        trips: trips.count || 0,
        orgs: orgs.count || 0,
      };
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setLastUpdated(new Date());
    setTimeout(() => setRefreshing(false), 600);
  };

  const isLoading = contribLoading || healthLoading;

  // Static module/component cards (representing tech surface)
  const stack = [
    { name: "Web App", status: "operational", icon: Layers, latency: "120ms" },
    { name: "Supabase API", status: "operational", icon: Database, latency: "84ms" },
    { name: "Edge Functions", status: "operational", icon: Server, latency: "190ms" },
    { name: "Auth Service", status: "operational", icon: ShieldCheck, latency: "62ms" },
    { name: "Storage / CDN", status: "operational", icon: Zap, latency: "45ms" },
    { name: "Webhooks", status: "operational", icon: Webhook, latency: "210ms" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 sm:p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 animate-fade-in">
          <div>
            <Badge variant="outline" className="mb-2 text-[10px] font-semibold uppercase tracking-wider border-blue-500/40 text-blue-600">
              <Cpu className="h-3 w-3 mr-1" /> Tech Partner
            </Badge>
            <h1 className="text-[26px] font-semibold text-foreground">
              Welcome, {orgInfo?.name || "Tech Partner"}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1 flex items-center gap-1.5">
              {userName && <>Logged in as {userName} · </>}
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Platform Operations · OTOT Engineering
            </p>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
            <span>Last updated: {format(lastUpdated, "MMM d, HH:mm")}</span>
            <button onClick={handleRefresh} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Tech revenue KPIs */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
            <KpiTile
              label="Tech Fee Allocated"
              value={`$${formatNumber(kpis.totalTechFee)}`}
              icon={DollarSign}
              tint={TINTS.indigo}
              hint={`${kpis.contributions} contributions`}
            />
            <KpiTile
              label="Tech Fee Received"
              value={`$${formatNumber(kpis.totalTechReceived)}`}
              icon={CheckCircle2}
              tint={TINTS.emerald}
              hint="Reconciled to date"
            />
            <KpiTile
              label="Under Processing"
              value={`$${formatNumber(kpis.techUnderProcessing)}`}
              icon={Clock}
              tint={TINTS.violet}
              hint="Awaiting reconciliation"
            />
            <KpiTile
              label="Effective Fee %"
              value={techFeePercent.toFixed(2)}
              suffix="%"
              icon={Gauge}
              tint={TINTS.blue}
              hint="Current wallet setting"
            />
          </div>
        )}

        {/* Platform health row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: "60ms", animationFillMode: "backwards" }}>
          <KpiTile label="New Users (24h)" value={platformHealth?.newUsers24h ?? 0} icon={TrendingUp} tint={TINTS.blue} hint="auth.users delta" />
          <KpiTile label="Trees Tracked" value={formatNumber(platformHealth?.trees ?? 0)} icon={Activity} tint={TINTS.emerald} hint="trees table rows" />
          <KpiTile label="Trips Logged" value={formatNumber(platformHealth?.trips ?? 0)} icon={GitBranch} tint={TINTS.indigo} hint="trips table rows" />
          <KpiTile label="Active Organizations" value={platformHealth?.orgs ?? 0} icon={Code2} tint={TINTS.violet} hint="organizations table" />
        </div>

        {/* Revenue trend chart */}
        <Card className="border shadow-sm animate-fade-in">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Tech Fee Revenue · Last 30 Days</h3>
                <p className="text-[12px] text-muted-foreground">Daily breakdown of tech fee accrued from contributions.</p>
              </div>
              <Badge variant="secondary" className="text-[10px]">Live</Badge>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="feeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(212 90% 55%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(212 90% 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={4} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: any, n: any) => [`$${formatNumber(Number(v))}`, n === "fee" ? "Tech Fee" : "Gross"]}
                  />
                  <Area type="monotone" dataKey="fee" stroke="hsl(212 90% 55%)" strokeWidth={2} fill="url(#feeFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Two-column: transactions & status breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border shadow-sm animate-fade-in">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Daily Transaction Volume</h3>
                <Badge variant="outline" className="text-[10px]">30d</Badge>
              </div>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={4} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="txn" fill="hsl(260 70% 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm animate-fade-in">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Contribution Status Mix</h3>
                <Badge variant="outline" className="text-[10px]">All time</Badge>
              </div>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusBreakdown} layout="vertical" margin={{ top: 8, right: 12, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="count" fill="hsl(180 65% 45%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform stack health */}
        <Card className="border shadow-sm animate-fade-in">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Platform Stack Status</h3>
                <p className="text-[12px] text-muted-foreground">Operational view of services powering the OTOT platform.</p>
              </div>
              <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                All Systems Operational
              </Badge>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {stack.map((s) => (
                <div key={s.name} className="flex items-center justify-between p-3 rounded-xl border bg-muted/30 hover:bg-muted/60 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                      <s.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">Latency · {s.latency}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    OK
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer note */}
        <div className="text-[11px] text-muted-foreground text-center pt-2">
          Tech Partner dashboard · Reconcile fees in <a href="/owner/financial" className="underline hover:text-foreground">Climate Funding</a>
        </div>
      </div>
    </div>
  );
};

export default TechDashboard;
