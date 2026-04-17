import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TreePine, Plane, DollarSign, TrendingUp } from "lucide-react";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const COLORS = ["hsl(138, 70%, 35%)", "hsl(200, 70%, 50%)", "hsl(45, 90%, 55%)", "hsl(340, 70%, 50%)", "hsl(270, 60%, 55%)"];

export function StakeholderAnalytics() {
  const { isEnabled, isLoading: permLoading } = useModulePermissions("analytics");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTrees: 0,
    totalTrips: 0,
    totalCO2: 0,
    totalRevenue: 0,
  });
  const [treesByStatus, setTreesByStatus] = useState<{ name: string; value: number }[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; trees: number; trips: number }[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [treesRes, tripsRes] = await Promise.all([
        supabase.from("trees").select("num_trees, status, amount_paid, created_at"),
        supabase.from("trips").select("total_co2, trees_needed, created_at"),
      ]);

      const trees = treesRes.data || [];
      const trips = tripsRes.data || [];

      const totalTrees = trees.reduce((s, t) => s + (t.num_trees || 0), 0);
      const totalTrips = trips.length;
      const totalCO2 = trips.reduce((s, t) => s + Number(t.total_co2 || 0), 0);
      const totalRevenue = trees.reduce((s, t) => s + Number(t.amount_paid || 0), 0);

      setStats({ totalTrees, totalTrips, totalCO2, totalRevenue });

      // Trees by status
      const statusMap: Record<string, number> = {};
      trees.forEach((t) => {
        const st = t.status || "Unknown";
        statusMap[st] = (statusMap[st] || 0) + t.num_trees;
      });
      setTreesByStatus(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

      // Monthly trend (last 6 months)
      const now = new Date();
      const months: { month: string; trees: number; trips: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        const mStart = d.toISOString();
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString();
        const mTrees = trees.filter((t) => t.created_at >= mStart && t.created_at <= mEnd).reduce((s, t) => s + t.num_trees, 0);
        const mTrips = trips.filter((t) => t.created_at >= mStart && t.created_at <= mEnd).length;
        months.push({ month: label, trees: mTrees, trips: mTrips });
      }
      setMonthlyTrend(months);
    } catch (err) {
      console.error("Analytics fetch error:", err);
    }
    setLoading(false);
  };

  if (permLoading) return <Skeleton className="h-64 w-full m-8" />;

  if (!isEnabled) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">You do not have access to this module.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform-wide metrics and trends</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <TreePine className="h-5 w-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Trees</p>
                    <p className="text-2xl font-bold">{stats.totalTrees.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Plane className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Trips</p>
                    <p className="text-2xl font-bold">{stats.totalTrips.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total CO₂ Offset</p>
                    <p className="text-2xl font-bold">{(stats.totalCO2 / 1000).toFixed(1)}t</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-purple-700" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Trend (Trees & Trips)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="trees" fill="hsl(138, 70%, 35%)" name="Trees" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="trips" fill="hsl(200, 70%, 50%)" name="Trips" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trees by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={treesByStatus} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} fontSize={11}>
                      {treesByStatus.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default StakeholderAnalytics;
