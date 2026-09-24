import type { ReactElement } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface DashboardChartData {
  userGrowth: { date: string; tourists: number; partners: number }[];
  treeTrends: { date: string; trees: number }[];
  revenue: { name: string; value: number; color: string }[];
  topPartners: { name: string; trees: number }[];
}

const TOOLTIP_STYLE = {
  backgroundColor: "#fff",
  border: "1px solid #e0e0e0",
  borderRadius: "8px",
};

const dayTick = (value: string) => new Date(value).getDate().toString();

function ChartCard({ title, empty, children }: { title: string; empty?: boolean; children: ReactElement }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-admin-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            {children}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardCharts({ data }: { data: DashboardChartData }) {
  const revenueTotal = data.revenue.reduce((s, r) => s + r.value, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="User Growth (Last 30 Days)">
          <LineChart data={data.userGrowth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="date" tickFormatter={dayTick} stroke="#666" />
            <YAxis stroke="#666" allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend />
            <Line type="monotone" dataKey="tourists" stroke="#1a5d1a" strokeWidth={2} name="Tourists" />
            <Line type="monotone" dataKey="partners" stroke="#d4704b" strokeWidth={2} name="Partners" />
          </LineChart>
        </ChartCard>

        <ChartCard title="Tree Planting Trends">
          <AreaChart data={data.treeTrends}>
            <defs>
              <linearGradient id="colorTrees" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1a5d1a" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#1a5d1a" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="date" tickFormatter={dayTick} stroke="#666" />
            <YAxis stroke="#666" allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area
              type="monotone"
              dataKey="trees"
              stroke="#1a5d1a"
              fillOpacity={1}
              fill="url(#colorTrees)"
              name="Trees Funded"
            />
          </AreaChart>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue Distribution" empty={revenueTotal === 0}>
          <PieChart>
            <Pie
              data={data.revenue}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              dataKey="value"
            >
              {data.revenue.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
          </PieChart>
        </ChartCard>

        <ChartCard title="Top Performing Partners" empty={data.topPartners.length === 0}>
          <BarChart data={data.topPartners} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis type="number" stroke="#666" allowDecimals={false} />
            <YAxis dataKey="name" type="category" width={120} stroke="#666" tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="trees" fill="#1a5d1a" name="Trees Assigned" />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
}
