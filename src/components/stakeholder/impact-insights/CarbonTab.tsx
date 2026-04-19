import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { CarbonLog } from "@/hooks/useImpactInsights";

const COLORS = ["hsl(var(--primary))", "hsl(142 70% 45%)", "hsl(199 89% 48%)", "hsl(38 92% 50%)", "hsl(280 65% 60%)"];

export const CarbonTab = ({ logs }: { logs: CarbonLog[] }) => {
  const totalEst = logs.reduce((s, l) => s + (Number(l.co2_offset_estimated_kg) || 0), 0);
  const totalAct = logs.reduce((s, l) => s + (Number(l.co2_offset_actual_kg) || 0), 0);

  const methodCounts = logs.reduce<Record<string, number>>((acc, l) => {
    const k = l.calculation_method || "Unspecified";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const methodData = Object.entries(methodCounts).map(([name, value]) => ({ name, value }));

  const byContribution = logs.reduce<Record<string, { est: number; act: number }>>((acc, l) => {
    const k = l.contribution_id;
    if (!acc[k]) acc[k] = { est: 0, act: 0 };
    acc[k].est += Number(l.co2_offset_estimated_kg) || 0;
    acc[k].act += Number(l.co2_offset_actual_kg) || 0;
    return acc;
  }, {});
  const leaderboard = Object.entries(byContribution)
    .map(([cid, v]) => ({ cid, ...v, total: v.est + v.act }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const allPhotos = logs.flatMap((l) => l.photos || []).slice(0, 12);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Estimated vs Actual CO₂</h3>
          <p className="text-xs text-muted-foreground mb-4">Aggregated kilograms across all logs</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[{ name: "Total", Estimated: Math.round(totalEst), Actual: Math.round(totalAct) }]}>
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Estimated" fill="hsl(199 89% 48%)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Actual" fill="hsl(142 70% 45%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Calculation Method</h3>
          <p className="text-xs text-muted-foreground mb-4">Breakdown of methods used in carbon logs</p>
          {methodData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={methodData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {methodData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Top Contributions by CO₂</h3>
        <div className="space-y-2">
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No carbon data yet</p>
          ) : (
            leaderboard.map((row) => (
              <div key={row.cid} className="flex items-center justify-between border-b last:border-0 py-2">
                <Badge variant="outline" className="font-mono text-xs">{row.cid}</Badge>
                <div className="flex gap-6 text-sm tabular-nums">
                  <span className="text-muted-foreground">Est: <span className="text-foreground font-medium">{Math.round(row.est)} kg</span></span>
                  <span className="text-muted-foreground">Actual: <span className="text-foreground font-medium">{Math.round(row.act)} kg</span></span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {allPhotos.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Field Evidence</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {allPhotos.map((src, i) => (
              <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-md overflow-hidden bg-muted">
                <img src={src} alt="Carbon log evidence" className="w-full h-full object-cover hover:scale-105 transition-transform" loading="lazy" />
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
