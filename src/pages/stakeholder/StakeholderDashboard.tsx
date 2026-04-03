import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TreePine, Sprout, DollarSign, BarChart3, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatNumber } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { InstitutionalDashboard } from "@/pages/institutional/InstitutionalDashboard";

const COLORS = ['hsl(142 70% 45%)', 'hsl(142 50% 60%)', 'hsl(30 70% 50%)', 'hsl(200 70% 50%)', 'hsl(280 50% 55%)'];

export const StakeholderDashboard = () => {
  const { user } = useAuth();
  const [orgInfo, setOrgInfo] = useState<any>(null);

  const { data: userProfile } = useQuery({
    queryKey: ["stakeholderProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.
      from("users").
      select("*, roles!inner(name, display_name), organizations!inner(*)").
      eq("user_id", user.id).
      single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["stakeholderStats", orgInfo?.id],
    queryFn: async () => {
      if (!orgInfo?.id) return null;

      const [plantingRes, nurseryRes, disbursementRes, monitoringRes] = await Promise.all([
      supabase.from("planting_records").select("*").eq("stakeholder_org_id", orgInfo.id),
      supabase.from("nurseries").select("*").eq("stakeholder_org_id", orgInfo.id),
      supabase.from("stakeholder_disbursements").select("*").eq("stakeholder_org_id", orgInfo.id),
      supabase.from("monitoring_records").select("*, planting_records!inner(stakeholder_org_id)")]
      );

      const plantings = plantingRes.data || [];
      const nurseries = nurseryRes.data || [];
      const disbursements = disbursementRes.data || [];
      const monitoring = monitoringRes.data || [];

      const totalPlanted = plantings.reduce((s, p) => s + (p.seedlings_planted || 0), 0);
      const activeNurseries = nurseries.filter((n) => n.is_active).length;
      const totalReceived = disbursements.filter((d) => d.status === 'received' || d.status === 'reconciled').reduce((s, d) => s + Number(d.amount), 0);
      const pendingDisbursements = disbursements.filter((d) => d.status === 'pending').reduce((s, d) => s + Number(d.amount), 0);

      // Survival rate from latest monitoring
      const avgSurvival = monitoring.length > 0 ?
      monitoring.reduce((s, m) => s + (Number(m.survival_rate) || 0), 0) / monitoring.length :
      0;

      // Species distribution from planting records
      const speciesCounts: Record<string, number> = {};
      plantings.forEach((p) => {
        const key = p.species_id || 'Unknown';
        speciesCounts[key] = (speciesCounts[key] || 0) + p.seedlings_planted;
      });

      // Monthly planting
      const monthlyPlanting: Record<string, number> = {};
      plantings.forEach((p) => {
        const month = p.date_planted?.substring(0, 7) || 'Unknown';
        monthlyPlanting[month] = (monthlyPlanting[month] || 0) + p.seedlings_planted;
      });

      return {
        totalPlanted,
        activeNurseries,
        totalReceived,
        pendingDisbursements,
        avgSurvival,
        totalNurseries: nurseries.length,
        totalDisbursements: disbursements.length,
        recentPlantings: plantings.slice(0, 5),
        monthlyData: Object.entries(monthlyPlanting).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month))
      };
    },
    enabled: !!orgInfo?.id
  });

  useEffect(() => {
    if (userProfile) setOrgInfo(userProfile.organizations);
  }, [userProfile]);

  const userName = userProfile
    ? [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ') || user?.user_metadata?.full_name
    : null;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Welcome, {orgInfo?.name || 'Stakeholder Dashboard'}
        </h1>
        {userName && (
          <p className="text-sm text-muted-foreground mt-1">Logged in as {userName}</p>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {isLoading ?
        [...Array(5)].map((_, i) => <Skeleton key={i} className="h-32" />) :

        <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <TreePine className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Trees Planted</p>
                    <p className="text-2xl font-bold">{formatNumber(stats?.totalPlanted || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <TrendingUp className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Survival Rate</p>
                    <p className="text-2xl font-bold">{(stats?.avgSurvival || 0).toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Sprout className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Active Nurseries</p>
                    <p className="text-2xl font-bold">{stats?.activeNurseries || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Funds Received</p>
                    <p className="text-2xl font-bold">KES {formatNumber(stats?.totalReceived || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100">
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pending Funds</p>
                    <p className="text-2xl font-bold">KES {formatNumber(stats?.pendingDisbursements || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        }
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Planting Progress</CardTitle>
            <CardDescription>Seedlings planted over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ?
            <Skeleton className="h-64 w-full" /> :
            stats?.monthlyData && stats.monthlyData.length > 0 ?
            <ResponsiveContainer width="100%" height={256}>
                <BarChart data={stats.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(142 70% 45%)" radius={[4, 4, 0, 0]} name="Seedlings" />
                </BarChart>
              </ResponsiveContainer> :

            <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p className="text-sm">No planting data yet. Start recording plantings.</p>
              </div>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Programme Context</CardTitle>
            <CardDescription>Mau-ICLIP Restoration Programme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Target Area</p>
                <p className="text-lg font-bold">317,000 ha</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Community Farmers</p>
                <p className="text-lg font-bold">100,000+</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">MoU Duration</p>
                <p className="text-lg font-bold">5 Years</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">SDG Alignment</p>
                <p className="text-lg font-bold">SDG 13, 15</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              The Mau-ICLIP programme is a multi-stakeholder initiative focused on the restoration 
              of the Mau Forest Complex through community-based nurseries and sustainable planting practices, 
              funded through carbon offset contributions from Kenya Tourism Board.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Planting Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentPlantings && stats.recentPlantings.length > 0 ?
          <div className="space-y-3">
              {stats.recentPlantings.map((p: any) =>
            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <p className="text-sm font-medium">{p.block_name} — Beat {p.beat || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">Planted by {p.planter_name || 'Unknown'} on {p.date_planted}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatNumber(p.seedlings_planted)}</p>
                    <p className="text-xs text-muted-foreground">seedlings</p>
                  </div>
                </div>
            )}
            </div> :

          <p className="text-sm text-muted-foreground text-center py-8">No planting records yet.</p>
          }
        </CardContent>
      </Card>
    </div>);

};