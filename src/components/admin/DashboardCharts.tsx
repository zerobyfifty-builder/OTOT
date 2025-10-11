import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ['#1a5d1a', '#d4704b', '#faf8f5', '#8b4513', '#2d7d2d'];

export function DashboardCharts() {
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [treeTrendsData, setTreeTrendsData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [topPartnersData, setTopPartnersData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      // Generate mock data for last 30 days
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toISOString().split('T')[0];
      });

      // User Growth Data (mock for now)
      const userGrowth = last30Days.map((date, index) => ({
        date,
        tourists: Math.floor(100 + Math.random() * 50 + index * 2),
        partners: Math.floor(20 + Math.random() * 10 + index * 0.5),
      }));
      setUserGrowthData(userGrowth);

      // Tree Planting Trends (mock for now)
      const treeTrends = last30Days.map((date, index) => ({
        date,
        trees: Math.floor(50 + Math.random() * 30 + index * 1.5),
      }));
      setTreeTrendsData(treeTrends);

      // Revenue Distribution
      const revenue = [
        { name: 'One-time', value: 65, color: '#1a5d1a' },
        { name: 'Subscriptions', value: 25, color: '#d4704b' },
        { name: 'Commissions', value: 10, color: '#8b4513' },
      ];
      setRevenueData(revenue);

      // Top Performing Partners (fetch real data)
      const { data: partnersData } = await supabase
        .from('trees')
        .select('lodge_id, lodges(name)')
        .not('lodge_id', 'is', null)
        .limit(100);

      if (partnersData) {
        const partnerCounts = partnersData.reduce((acc: any, tree: any) => {
          const lodgeName = tree.lodges?.name || 'Unknown';
          acc[lodgeName] = (acc[lodgeName] || 0) + 1;
          return acc;
        }, {});

        const topPartners = Object.entries(partnerCounts)
          .sort((a: any, b: any) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, count]) => ({
            name,
            trees: count as number,
          }));

        setTopPartnersData(topPartners);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-primary"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: User Growth & Tree Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-admin-primary">User Growth (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).getDate().toString()}
                  stroke="#666"
                />
                <YAxis stroke="#666" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="tourists"
                  stroke="#1a5d1a"
                  strokeWidth={2}
                  name="Tourists"
                />
                <Line
                  type="monotone"
                  dataKey="partners"
                  stroke="#d4704b"
                  strokeWidth={2}
                  name="Partners"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-admin-primary">Tree Planting Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={treeTrendsData}>
                <defs>
                  <linearGradient id="colorTrees" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a5d1a" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#1a5d1a" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).getDate().toString()}
                  stroke="#666"
                />
                <YAxis stroke="#666" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="trees"
                  stroke="#1a5d1a"
                  fillOpacity={1}
                  fill="url(#colorTrees)"
                  name="Trees Planted"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Revenue Distribution & Top Partners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-admin-primary">Revenue Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-admin-primary">Top Performing Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPartnersData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis type="number" stroke="#666" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  stroke="#666"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="trees" fill="#1a5d1a" name="Trees Planted" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
