import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TreePine, TrendingUp, BarChart3, Plane, Building, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatNumber } from "@/lib/utils";
import { InstitutionalStatCard } from "@/components/institutional/InstitutionalStatCard";

export const InstitutionalDashboard = () => {
  const { user } = useAuth();
  const [organizationInfo, setOrganizationInfo] = useState<any>(null);

  // Fetch organization and user info
  const { data: userProfile } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("users")
        .select(`
          *,
          roles!inner(name, display_name),
          organizations!inner(*)
        `)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["institutionalStats"],
    queryFn: async () => {
      // Get all trees with their amounts
      const { data: allTreesData, count: totalTrees } = await supabase
        .from("trees")
        .select("status, amount_paid", { count: "exact" });

      // Get tourists by role
      const { data: roles } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "tourist")
        .single();

      const { count: totalTourists } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role_id", roles?.id);

      // Get total trips
      const { count: totalTrips } = await supabase
        .from("trips")
        .select("*", { count: "exact", head: true });

      // Get CO2 data
      const { data: co2Data } = await supabase
        .from("trips")
        .select("flight_co2, accommodation_co2, total_co2");
      
      const flightCO2 = co2Data?.reduce((sum, trip) => sum + (Number(trip.flight_co2) || 0), 0) || 0;
      const accommodationCO2 = co2Data?.reduce((sum, trip) => sum + (Number(trip.accommodation_co2) || 0), 0) || 0;
      const totalCO2 = co2Data?.reduce((sum, trip) => sum + (Number(trip.total_co2) || 0), 0) || 0;

      // Count planted trees
      const plantedTrees = allTreesData?.filter(tree => tree.status === "Planted").length || 0;

      // Calculate revenue from all trees
      const totalRevenue = allTreesData?.reduce((sum, tree) => sum + (Number(tree.amount_paid) || 0), 0) || 0;

      // Calculate trees needed (1 tree offsets ~25kg CO2)
      const treesNeeded = Math.ceil(totalCO2 / 25);

      // CO2 offset by all trees (25kg per tree)
      const co2OffsetCommitted = (totalTrees || 0) * 25;

      return {
        totalTrees: totalTrees || 0,
        totalTourists: totalTourists || 0,
        totalTrips: totalTrips || 0,
        totalCO2: totalCO2,
        totalCO2Offset: co2OffsetCommitted,
        flightCO2,
        accommodationCO2,
        treesNeeded,
        plantedTrees: plantedTrees,
        totalRevenue: totalRevenue,
      };
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (userProfile) {
      setOrganizationInfo(userProfile.organizations);
    }
  }, [userProfile]);


  return (
    <div className="p-8 space-y-6">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          {organizationInfo?.name || 'Kenya Tourism Board'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Institutional Partner
        </p>
      </div>

      {/* Modern Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </>
        ) : (
          <>
            <InstitutionalStatCard
              title="Total Trees"
              value={stats?.totalTrees || 0}
              icon={TreePine}
              description={`${formatNumber(stats?.totalTrees || 0)} trees in the system`}
              trend={{ value: 8.3, isPositive: true }}
              breakdown={[
                { label: "Total Trees", value: formatNumber(stats?.totalTrees || 0) },
                { label: "Planted Trees", value: formatNumber(stats?.plantedTrees || 0) },
              ]}
            />

            <InstitutionalStatCard
              title="CO₂ Offset"
              value={`${formatNumber(stats?.totalCO2Offset || 0)} kg`}
              icon={TrendingUp}
              description={`Carbon offset by ${stats?.totalTrees || 0} trees`}
              breakdown={[
                { label: "Total Trees", value: formatNumber(stats?.totalTrees || 0) },
                { label: "CO₂ per Tree", value: "25 kg" },
                { label: "Total Offset", value: `${formatNumber(stats?.totalCO2Offset || 0)} kg` },
              ]}
            />

            <InstitutionalStatCard
              title="Revenue"
              value={`$${formatNumber(stats?.totalRevenue || 0)}`}
              icon={DollarSign}
              description={`Total revenue from all trees`}
              trend={{ value: 15.7, isPositive: true }}
              breakdown={[
                { label: "Total Revenue", value: `$${formatNumber(stats?.totalRevenue || 0)}` },
                { label: "Total Trees", value: formatNumber(stats?.totalTrees || 0) },
              ]}
            />

            <InstitutionalStatCard
              title="Countries"
              value="5"
              icon={BarChart3}
              description="Tourist origin countries"
              breakdown={[
                { label: "United States", value: "25" },
                { label: "United Kingdom", value: "18" },
                { label: "Germany", value: "12" },
                { label: "Spain", value: "8" },
                { label: "France", value: "6" },
              ]}
            />
          </>
        )}
      </div>

      {/* Overview Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>CO₂ Emissions Breakdown</CardTitle>
            <CardDescription>Distribution of carbon emissions by source</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : stats && (stats.flightCO2 > 0 || stats.accommodationCO2 > 0) ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
                  <div>
                    <p className="text-sm text-muted-foreground">Flight Emissions</p>
                    <p className="text-2xl font-bold">{formatNumber(stats.flightCO2)} kg</p>
                  </div>
                  <Plane className="w-8 h-8 text-primary" />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/5">
                  <div>
                    <p className="text-sm text-muted-foreground">Accommodation Emissions</p>
                    <p className="text-2xl font-bold">{formatNumber(stats.accommodationCO2)} kg</p>
                  </div>
                  <Building className="w-8 h-8 text-secondary" />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-accent/5">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Emissions</p>
                    <p className="text-2xl font-bold">{formatNumber(stats.totalCO2 || 0)} kg</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-accent" />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No emissions data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Activity</CardTitle>
            <CardDescription>Real-time insights into conservation efforts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Active Conservation Projects</p>
                  <p className="text-sm text-muted-foreground">Trees being planted and tracked</p>
                </div>
                <TreePine className="w-8 h-8 text-primary" />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Carbon Offsetting Program</p>
                  <p className="text-sm text-muted-foreground">Tourist carbon footprint tracking</p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
