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
      // Get total trees
      const { count: totalTrees } = await supabase
        .from("trees")
        .select("*", { count: "exact", head: true });

      // Get tourists by role - find role_id for tourist role
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

      // Get planted trees count
      const { count: plantedTrees } = await supabase
        .from("trees")
        .select("*", { count: "exact", head: true })
        .eq("status", "Planted");

      // Calculate trees needed (1 tree offsets ~25kg CO2)
      const treesNeeded = Math.ceil(totalCO2 / 25);

      // Calculate revenue (assuming $10 per tree)
      const potentialRevenue = treesNeeded * 10;
      const committedRevenue = (plantedTrees || 0) * 10;
      
      // CO2 offset committed by planted trees
      const co2OffsetCommitted = (plantedTrees || 0) * 25;

      return {
        totalTrees: totalTrees || 0,
        totalTourists: totalTourists || 0,
        totalTrips: totalTrips || 0,
        totalCO2: totalCO2,
        totalCO2Offset: co2OffsetCommitted, // CO2 offset by planted trees
        flightCO2,
        accommodationCO2,
        treesNeeded,
        plantedTrees: plantedTrees || 0,
        potentialRevenue,
        committedRevenue,
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    if (userProfile) {
      setOrganizationInfo(userProfile.organizations);
    }
  }, [userProfile]);

  const co2OffsetPercentage = stats?.totalCO2 
    ? Math.min(100, Math.round((stats.totalCO2Offset / stats.totalCO2) * 100))
    : 0;

  const treesPlantedPercentage = stats?.treesNeeded 
    ? Math.min(100, Math.round((stats.plantedTrees / stats.treesNeeded) * 100))
    : 0;

  const revenuePercentage = stats?.potentialRevenue 
    ? Math.min(100, Math.round((stats.committedRevenue / stats.potentialRevenue) * 100))
    : 0;

  return (
    <div className="p-8 space-y-6">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          {organizationInfo?.name || 'Kenya Tourism Board'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {organizationInfo?.category || 'Institutional Partner'}
        </p>
      </div>

      {/* Modern Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </>
        ) : (
          <>
            <InstitutionalStatCard
              title="Total Trees"
              value={stats?.plantedTrees || 0}
              icon={TreePine}
              description={`${formatNumber(stats?.plantedTrees || 0)} of ${formatNumber(stats?.treesNeeded || 0)} trees planted`}
              trend={{ value: 8.3, isPositive: true }}
              progress={{
                label: "Planted vs Needed",
                current: stats?.plantedTrees || 0,
                total: stats?.treesNeeded || 1,
                percentage: treesPlantedPercentage,
              }}
              breakdown={[
                { label: "Trees Needed", value: formatNumber(stats?.treesNeeded || 0) },
                { label: "Waiting to be Assigned", value: formatNumber((stats?.treesNeeded || 0) - (stats?.plantedTrees || 0)) },
              ]}
            />

            <InstitutionalStatCard
              title="CO₂ Offset"
              value={`${formatNumber(stats?.totalCO2Offset || 0)} kg`}
              icon={TrendingUp}
              description={`${formatNumber(stats?.totalCO2Offset || 0)} of ${formatNumber(stats?.totalCO2 || 0)} kg offset`}
              progress={{
                label: "Offset vs Total Emission",
                current: stats?.totalCO2Offset || 0,
                total: stats?.totalCO2 || 1,
                percentage: co2OffsetPercentage,
              }}
              breakdown={[
                { label: "Total Emissions", value: `${formatNumber(stats?.totalCO2 || 0)} kg` },
                { label: "Offset Committed", value: `${formatNumber(stats?.totalCO2Offset || 0)} kg` },
              ]}
            />

            <InstitutionalStatCard
              title="Revenue"
              value={`$${formatNumber(stats?.committedRevenue || 0)}`}
              icon={DollarSign}
              description={`$${formatNumber(stats?.committedRevenue || 0)} of $${formatNumber(stats?.potentialRevenue || 0)} committed`}
              trend={{ value: 15.7, isPositive: true }}
              progress={{
                label: "Committed vs Potential",
                current: stats?.committedRevenue || 0,
                total: stats?.potentialRevenue || 1,
                percentage: revenuePercentage,
              }}
              breakdown={[
                { label: "Potential Revenue", value: `$${formatNumber(stats?.potentialRevenue || 0)}` },
                { label: "Remaining", value: `$${formatNumber((stats?.potentialRevenue || 0) - (stats?.committedRevenue || 0))}` },
              ]}
            />

            <InstitutionalStatCard
              title="OTOT Activity"
              value={`${formatNumber((stats?.totalTourists || 0) + (stats?.plantedTrees || 0))}`}
              icon={Users}
              description="Platform engagement metrics"
              breakdown={[
                { label: "Tourists", value: formatNumber(stats?.totalTourists || 0) },
                { label: "Partners", value: "5" },
                { label: "Planting", value: formatNumber(stats?.plantedTrees || 0) },
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
