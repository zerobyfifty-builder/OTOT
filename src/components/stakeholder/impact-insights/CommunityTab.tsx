import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Users, Briefcase, Heart, GraduationCap, Wallet, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import type { CommunityLog, CommunityReport } from "@/hooks/useImpactInsights";

const StatCard = ({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}) => (
  <Card className="p-4">
    <div className="flex items-start gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-xl font-bold tabular-nums text-foreground mt-0.5 truncate">{value}</p>
      </div>
    </div>
  </Card>
);

export const CommunityTab = ({
  logs,
  reports,
}: {
  logs: CommunityLog[];
  reports: CommunityReport[];
}) => {
  const totals = logs.reduce(
    (acc, l) => ({
      jobs: acc.jobs + (Number(l.jobs_created) || 0),
      families: acc.families + (Number(l.families_supported) || 0),
      women: acc.women + (Number(l.women_employed) || 0),
      youth: acc.youth + (Number(l.youth_employed) || 0),
      participants: acc.participants + (Number(l.local_participants_count) || 0),
      nurseryIncome: acc.nurseryIncome + (Number(l.nursery_income_kes) || 0),
      avgIncomeSum: acc.avgIncomeSum + (Number(l.avg_monthly_income_kes) || 0),
      avgIncomeCount: acc.avgIncomeCount + (Number(l.avg_monthly_income_kes) > 0 ? 1 : 0),
    }),
    { jobs: 0, families: 0, women: 0, youth: 0, participants: 0, nurseryIncome: 0, avgIncomeSum: 0, avgIncomeCount: 0 },
  );

  const avgMonthlyIncome = totals.avgIncomeCount > 0 ? totals.avgIncomeSum / totals.avgIncomeCount : 0;

  const stackData = [
    {
      name: "Totals",
      Jobs: totals.jobs,
      Families: totals.families,
      Women: totals.women,
      Youth: totals.youth,
    },
  ];

  // Nursery income trend (sorted by log_date asc)
  const incomeTrend = [...logs]
    .filter((l) => Number(l.nursery_income_kes) > 0)
    .sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())
    .map((l) => ({
      date: format(new Date(l.log_date), "dd MMM"),
      income: Number(l.nursery_income_kes),
    }));

  const kesFmt = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

  return (
    <div className="space-y-4">
      {/* Top stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Families Supported" value={totals.families.toLocaleString()} icon={Users} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <StatCard label="Jobs Created" value={totals.jobs.toLocaleString()} icon={Briefcase} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard label="Women Employed" value={totals.women.toLocaleString()} icon={Heart} iconBg="bg-pink-50" iconColor="text-pink-600" />
        <StatCard label="Youth Employed" value={totals.youth.toLocaleString()} icon={GraduationCap} iconBg="bg-amber-50" iconColor="text-amber-600" />
        <StatCard label="Nursery Income" value={kesFmt(totals.nurseryIncome)} icon={Wallet} iconBg="bg-violet-50" iconColor="text-violet-600" />
        <StatCard label="Avg Monthly Income" value={kesFmt(avgMonthlyIncome)} icon={TrendingUp} iconBg="bg-teal-50" iconColor="text-teal-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Employment & Reach</h3>
          <p className="text-xs text-muted-foreground mb-4">Aggregated headcount across all community logs</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stackData}>
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Jobs" stackId="a" fill="hsl(199 89% 48%)" />
              <Bar dataKey="Families" stackId="a" fill="hsl(142 70% 45%)" />
              <Bar dataKey="Women" stackId="a" fill="hsl(330 70% 55%)" />
              <Bar dataKey="Youth" stackId="a" fill="hsl(38 92% 50%)" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground tabular-nums">
            <span>Local participants: <span className="text-foreground font-medium">{totals.participants.toLocaleString()}</span></span>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Nursery Income (KES)</h3>
          <p className="text-xs text-muted-foreground mb-4">Trend across reported logs</p>
          {incomeTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No income data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={incomeTrend}>
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="income" stroke="hsl(142 70% 35%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Periodic Community Reports</h3>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No periodic reports yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Period</th>
                  <th className="py-2 pr-4 font-medium tabular-nums">Jobs</th>
                  <th className="py-2 pr-4 font-medium tabular-nums">Families</th>
                  <th className="py-2 pr-4 font-medium tabular-nums">Women</th>
                  <th className="py-2 pr-4 font-medium tabular-nums">Youth</th>
                  <th className="py-2 pr-4 font-medium tabular-nums">Income (KES)</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 tabular-nums">{format(new Date(r.reporting_period), "MMM yyyy")}</td>
                    <td className="py-2 pr-4 tabular-nums">{(r.jobs_created || 0).toLocaleString()}</td>
                    <td className="py-2 pr-4 tabular-nums">{(r.families_supported || 0).toLocaleString()}</td>
                    <td className="py-2 pr-4 tabular-nums">{(r.women_employed || 0).toLocaleString()}</td>
                    <td className="py-2 pr-4 tabular-nums">{(r.youth_employed || 0).toLocaleString()}</td>
                    <td className="py-2 pr-4 tabular-nums">{Math.round(r.nursery_income_kes || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Recent Community Logs</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No community logs yet</p>
        ) : (
          <div className="space-y-3">
            {logs.slice(0, 10).map((l) => (
              <div key={l.id} className="border-b last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="font-mono text-xs">{l.contribution_id}</Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">{format(new Date(l.log_date), "dd MMM yyyy")}</span>
                </div>
                {l.community_benefits && <p className="text-sm text-foreground">{l.community_benefits}</p>}
                <p className="text-xs text-muted-foreground mt-1">By {l.recorded_by}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
