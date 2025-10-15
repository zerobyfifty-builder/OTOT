import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TripsTable } from "@/components/institutional/TripsTable";

export default function RecentTrips() {
  const { data: recentTrips, isLoading: tripsLoading } = useQuery({
    queryKey: ["recentTrips"],
    queryFn: async () => {
      const { data: trips, error } = await supabase
        .from("trips")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

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
    refetchInterval: 30000,
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Recent Trips</h1>
        <p className="text-muted-foreground mt-1">
          Latest tourist trips and carbon calculations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Recent Trips</CardTitle>
          <CardDescription>Tourist travel data with CO₂ emissions</CardDescription>
        </CardHeader>
        <CardContent>
          <TripsTable trips={recentTrips || []} isLoading={tripsLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
