import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TreePine, Users, DollarSign, Leaf } from 'lucide-react';

interface DashboardMetrics {
  totalPledges: number;
  totalTreesPurchased: number;
  totalTreesPlanted: number;
  totalCO2Offset: number;
  totalRevenue: number;
  activeUsers: number;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalPledges: 0,
    totalTreesPurchased: 0,
    totalTreesPlanted: 0,
    totalCO2Offset: 0,
    totalRevenue: 0,
    activeUsers: 0,
  });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch total pledges
      const { count: pledgeCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('pledge_status', true);

      // Fetch total trees
      const { data: treesData } = await supabase
        .from('trees')
        .select('num_trees, amount_paid, status');

      const totalTreesPurchased = treesData?.reduce((sum, tree) => sum + tree.num_trees, 0) || 0;
      const totalTreesPlanted = treesData?.filter(t => t.status === 'Planted').reduce((sum, tree) => sum + tree.num_trees, 0) || 0;
      const totalRevenue = treesData?.reduce((sum, tree) => sum + Number(tree.amount_paid), 0) || 0;
      const totalCO2Offset = totalTreesPlanted * 22; // Approximate kg CO2 per tree per year

      // Fetch active users
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch monthly trends
      const { data: monthlyTrees } = await supabase
        .from('trees')
        .select('created_at, num_trees')
        .order('created_at', { ascending: true });

      // Group by month
      const monthlyData = monthlyTrees?.reduce((acc: any, tree) => {
        const month = new Date(tree.created_at).toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!acc[month]) {
          acc[month] = { month, trees: 0 };
        }
        acc[month].trees += tree.num_trees;
        return acc;
      }, {});

      setMetrics({
        totalPledges: pledgeCount || 0,
        totalTreesPurchased,
        totalTreesPlanted,
        totalCO2Offset,
        totalRevenue,
        activeUsers: userCount || 0,
      });

      setTrendData(Object.values(monthlyData || {}).slice(-6));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">KTB Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pledges</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalPledges}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trees Purchased</CardTitle>
            <TreePine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTreesPurchased}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trees Planted</CardTitle>
            <Leaf className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTreesPlanted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CO2 Offset (kg)</CardTitle>
            <Leaf className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCO2Offset.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {metrics.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trees Planted - Last 6 Months</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="trees" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
