import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TreePine, TrendingUp, BarChart3, LogOut, Plane, Building } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { TripsTable } from "@/components/institutional/TripsTable";
import { TreesTable } from "@/components/institutional/TreesTable";

export const InstitutionalDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
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

  // Fetch organization modules
  const { data: modules } = useQuery({
    queryKey: ["organizationModules", userProfile?.organization_id],
    queryFn: async () => {
      if (!userProfile?.organization_id) return [];
      
      const { data, error } = await supabase
        .from("organization_modules")
        .select(`
          *,
          modules!inner(*)
        `)
        .eq("organization_id", userProfile.organization_id)
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
    enabled: !!userProfile?.organization_id,
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

      return {
        totalTrees: totalTrees || 0,
        totalTourists: totalTourists || 0,
        totalTrips: totalTrips || 0,
        totalCO2Offset: totalCO2,
        flightCO2,
        accommodationCO2,
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get recent activity
  const { data: recentTrees, isLoading: treesLoading } = useQuery({
    queryKey: ["recentTrees"],
    queryFn: async () => {
      const { data: trees, error } = await supabase
        .from("trees")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      if (!trees) return [];

      // Fetch user emails for these trees
      const userIds = [...new Set(trees.map(t => t.user_id))];
      const { data: users } = await supabase
        .from("users")
        .select("user_id, email")
        .in("user_id", userIds);

      return trees.map(tree => ({
        ...tree,
        user_email: users?.find(u => u.user_id === tree.user_id)?.email || "Unknown"
      }));
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: recentTrips, isLoading: tripsLoading } = useQuery({
    queryKey: ["recentTrips"],
    queryFn: async () => {
      const { data: trips, error } = await supabase
        .from("trips")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      if (!trips) return [];

      // Fetch user emails for these trips
      const userIds = [...new Set(trips.map(t => t.user_id))];
      const { data: users } = await supabase
        .from("users")
        .select("user_id, email")
        .in("user_id", userIds);

      return trips.map(trip => ({
        ...trip,
        user_email: users?.find(u => u.user_id === trip.user_id)?.email || "Unknown"
      }));
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/auth/login");
  };

  useEffect(() => {
    if (userProfile) {
      setOrganizationInfo(userProfile.organizations);
    }
  }, [userProfile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{organizationInfo?.name || "Institutional Partner"}</h1>
              <p className="text-sm text-muted-foreground">{organizationInfo?.category} Partnership</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Trees Planted</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="flex items-center gap-2">
                  <TreePine className="w-5 h-5 text-primary" />
                  <span className="text-3xl font-bold">{stats?.totalTrees || 0}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tourists</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-3xl font-bold">{stats?.totalTourists || 0}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Trips</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="flex items-center gap-2">
                  <Plane className="w-5 h-5 text-primary" />
                  <span className="text-3xl font-bold">{stats?.totalTrips || 0}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">CO₂ Offset (kg)</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-3xl font-bold">{stats?.totalCO2Offset?.toFixed(0) || 0}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trips">Recent Trips</TabsTrigger>
            <TabsTrigger value="trees">Recent Trees</TabsTrigger>
            <TabsTrigger value="modules">Available Modules</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
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
                          <p className="text-2xl font-bold">{stats.flightCO2.toFixed(0)} kg</p>
                        </div>
                        <Plane className="w-8 h-8 text-primary" />
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/5">
                        <div>
                          <p className="text-sm text-muted-foreground">Accommodation Emissions</p>
                          <p className="text-2xl font-bold">{stats.accommodationCO2.toFixed(0)} kg</p>
                        </div>
                        <Building className="w-8 h-8 text-secondary" />
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-accent/5">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Emissions</p>
                          <p className="text-2xl font-bold">{stats.totalCO2Offset.toFixed(0)} kg</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-accent" />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No emissions data yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Activity</CardTitle>
                  <CardDescription>Real-time insights into conservation and tourism activities</CardDescription>
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
          </TabsContent>

          <TabsContent value="trips">
            <Card>
              <CardHeader>
                <CardTitle>Recent Trips</CardTitle>
                <CardDescription>Latest tourist trips and carbon calculations</CardDescription>
              </CardHeader>
              <CardContent>
                <TripsTable trips={recentTrips || []} isLoading={tripsLoading} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trees">
            <Card>
              <CardHeader>
                <CardTitle>Recent Tree Plantings</CardTitle>
                <CardDescription>Latest tree planting activities</CardDescription>
              </CardHeader>
              <CardContent>
                <TreesTable trees={recentTrees || []} isLoading={treesLoading} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modules">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules?.map((module) => (
                <Card key={module.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{module.modules.display_name}</CardTitle>
                    <CardDescription>{module.modules.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Permissions:</p>
                      <div className="flex flex-wrap gap-1">
                        {(module.permissions as string[])?.map((perm) => (
                          <span key={perm} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
