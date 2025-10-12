import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TreePine, TrendingUp, BarChart3, LogOut, Plane, Building } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

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
  const { data: stats } = useQuery({
    queryKey: ["institutionalStats", userProfile?.organization_id],
    queryFn: async () => {
      // Get total trees
      const { count: totalTrees } = await supabase
        .from("trees")
        .select("*", { count: "exact", head: true });

      // Get total users (tourists)
      const { count: totalTourists } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      // Get total trips
      const { count: totalTrips } = await supabase
        .from("trips")
        .select("*", { count: "exact", head: true });

      // Get total CO2 offset
      const { data: co2Data } = await supabase
        .from("trips")
        .select("total_co2");
      
      const totalCO2 = co2Data?.reduce((sum, trip) => sum + (Number(trip.total_co2) || 0), 0) || 0;

      return {
        totalTrees: totalTrees || 0,
        totalTourists: totalTourists || 0,
        totalTrips: totalTrips || 0,
        totalCO2Offset: totalCO2,
      };
    },
  });

  // Get recent activity
  const { data: recentTrees } = useQuery({
    queryKey: ["recentTrees"],
    queryFn: async () => {
      const { data: trees, error } = await supabase
        .from("trees")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch user emails separately
      if (!trees) return [];
      
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
  });

  const { data: recentTrips } = useQuery({
    queryKey: ["recentTrips"],
    queryFn: async () => {
      const { data: trips, error } = await supabase
        .from("trips")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch user emails separately
      if (!trips) return [];
      
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
              <div className="flex items-center gap-2">
                <TreePine className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold">{stats?.totalTrees || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tourists</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold">{stats?.totalTourists || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold">{stats?.totalTrips || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">CO₂ Offset (kg)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold">{stats?.totalCO2Offset?.toFixed(0) || 0}</span>
              </div>
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
                    <BarChart3 className="w-8 h-8 text-primary" />
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
          </TabsContent>

          <TabsContent value="trips">
            <Card>
              <CardHeader>
                <CardTitle>Recent Trips</CardTitle>
                <CardDescription>Latest tourist trips and carbon calculations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentTrips?.map((trip) => (
                    <div key={trip.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{trip.user_email}</p>
                        <p className="text-sm text-muted-foreground">
                          {trip.origin_airport} → {trip.destination_airport}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{trip.total_co2} kg CO₂</p>
                        <p className="text-sm text-muted-foreground">{trip.trees_needed} trees needed</p>
                      </div>
                    </div>
                  ))}
                </div>
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
                <div className="space-y-2">
                  {recentTrees?.map((tree) => (
                    <div key={tree.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{tree.user_email}</p>
                        <p className="text-sm text-muted-foreground">{tree.tree_type || "Tree species"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{tree.num_trees} tree(s)</p>
                        <p className="text-sm text-muted-foreground">{tree.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
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
