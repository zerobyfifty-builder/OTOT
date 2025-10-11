import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Trees, DollarSign, Activity as ActivityIcon } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { DashboardCharts } from "@/components/admin/DashboardCharts";
import { QuickActions } from "@/components/admin/QuickActions";
import { AlertsPanel } from "@/components/admin/AlertsPanel";

interface DashboardStats {
  totalUsers: number;
  userBreakdown: {
    tourists: number;
    partners: number;
    admins: number;
  };
  userGrowth: number;
  totalTrees: number;
  treesByStatus: any;
  totalCO2: number;
  treeGrowth: number;
  totalRevenue: number;
  monthRevenue: number;
  revenueGrowth: number;
  activeSessions: number;
  peakToday: number;
}

export default function GodModeOverview() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    userBreakdown: { tourists: 0, partners: 0, admins: 0 },
    userGrowth: 0,
    totalTrees: 0,
    treesByStatus: {},
    totalCO2: 0,
    treeGrowth: 0,
    totalRevenue: 0,
    monthRevenue: 0,
    revenueGrowth: 0,
    activeSessions: 0,
    peakToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch total users
      const { count: totalUsers, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Fetch user breakdown by role
      const { data: rolesData, error: rolesError } = await supabase
        .from('users')
        .select(`
          role_id,
          roles!inner(name)
        `);

      if (rolesError) throw rolesError;

      const userBreakdown = {
        tourists: rolesData?.filter((u: any) => u.roles?.name === 'tourist').length || 0,
        partners: rolesData?.filter((u: any) => u.roles?.name === 'business_partner' || u.roles?.name === 'institutional_partner').length || 0,
        admins: rolesData?.filter((u: any) => u.roles?.name === 'super_admin').length || 0,
      };

      // Fetch total trees
      const { count: totalTrees, error: treesError } = await supabase
        .from('trees')
        .select('*', { count: 'exact', head: true });

      if (treesError) throw treesError;

      // Fetch trees by status
      const { data: treesData, error: treesDataError } = await supabase
        .from('trees')
        .select('status, num_trees');

      if (treesDataError) throw treesDataError;

      const treesByStatus = treesData?.reduce((acc: any, tree: any) => {
        acc[tree.status] = (acc[tree.status] || 0) + (tree.num_trees || 1);
        return acc;
      }, {});

      // Calculate total CO2 offset (assuming 22kg per tree per year)
      const totalCO2 = (totalTrees || 0) * 22;

      // Fetch total revenue from transactions
      const { data: transactionsData, error: transError } = await supabase
        .from('partner_transactions')
        .select('amount');

      if (transError) throw transError;

      const totalRevenue = transactionsData?.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0) || 0;

      // Calculate month revenue (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: monthTransData, error: monthError } = await supabase
        .from('partner_transactions')
        .select('amount')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (monthError) throw monthError;

      const monthRevenue = monthTransData?.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0) || 0;

      // Mock growth percentages (calculate from historical data in production)
      const userGrowth = 12.5;
      const treeGrowth = 8.3;
      const revenueGrowth = 15.7;

      // Mock active sessions
      const activeSessions = Math.floor(Math.random() * 50) + 10;
      const peakToday = Math.floor(Math.random() * 100) + 50;

      setStats({
        totalUsers: totalUsers || 0,
        userBreakdown,
        userGrowth,
        totalTrees: totalTrees || 0,
        treesByStatus,
        totalCO2,
        treeGrowth,
        totalRevenue,
        monthRevenue,
        revenueGrowth,
        activeSessions,
        peakToday,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-admin-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-admin-cream p-8">
      <div className="max-w-[1920px] mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-admin-primary mb-2">God Mode Dashboard</h1>
          <p className="text-admin-primary/70">Complete system oversight and control</p>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            icon={Users}
            description="Across all roles"
            trend={{
              value: stats.userGrowth,
              isPositive: true,
            }}
            breakdown={[
              { label: 'Tourists', value: stats.userBreakdown.tourists },
              { label: 'Partners', value: stats.userBreakdown.partners },
              { label: 'Admins', value: stats.userBreakdown.admins },
            ]}
          />

          <StatCard
            title="Total Trees"
            value={stats.totalTrees.toLocaleString()}
            icon={Trees}
            description={`${stats.totalCO2.toLocaleString()}kg CO₂ offset`}
            trend={{
              value: stats.treeGrowth,
              isPositive: true,
            }}
            breakdown={Object.entries(stats.treesByStatus || {}).slice(0, 3).map(([status, count]: any) => ({
              label: status,
              value: count,
            }))}
          />

          <StatCard
            title="Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            description={`$${stats.monthRevenue.toLocaleString()} this month`}
            trend={{
              value: stats.revenueGrowth,
              isPositive: true,
            }}
          />

          <StatCard
            title="Active Sessions"
            value={stats.activeSessions}
            icon={ActivityIcon}
            description={`Peak today: ${stats.peakToday}`}
            breakdown={[
              { label: 'Tourists', value: Math.floor(stats.activeSessions * 0.7) },
              { label: 'Partners', value: Math.floor(stats.activeSessions * 0.2) },
              { label: 'Admins', value: Math.floor(stats.activeSessions * 0.1) },
            ]}
          />
        </div>

        {/* Alerts Section */}
        <AlertsPanel />

        {/* Activity Feed */}
        <ActivityFeed />

        {/* Charts Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-admin-primary">Analytics & Insights</h2>
          <DashboardCharts />
        </div>

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </div>
  );
}
