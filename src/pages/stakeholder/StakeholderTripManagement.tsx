import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plane } from "lucide-react";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { format } from "date-fns";

interface Trip {
  id: string;
  friendly_trip_id: string | null;
  origin_airport: string;
  destination_airport: string;
  travel_class: string;
  is_return: boolean;
  num_travelers: number;
  flight_co2: number;
  accommodation_co2: number;
  total_co2: number;
  trees_needed: number;
  from_date: string;
  to_date: string | null;
  created_at: string;
  users?: { email: string; first_name: string | null; last_name: string | null };
}

export function StakeholderTripManagement() {
  const { isEnabled, isLoading: permLoading } = useModulePermissions("trip_management");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error && data) setTrips(data as any);
    setLoading(false);
  };

  const filtered = trips.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.friendly_trip_id?.toLowerCase().includes(s) ||
      t.origin_airport.toLowerCase().includes(s) ||
      t.destination_airport.toLowerCase().includes(s)
    );
  });

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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Plane className="h-6 w-6 text-blue-600" /> Trip Management
        </h1>
        <p className="text-muted-foreground text-sm mt-1">View all trips and carbon offset calculations</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by trip ID, airport..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip ID</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Return</TableHead>
                    <TableHead>Travelers</TableHead>
                    <TableHead>Flight CO₂</TableHead>
                    <TableHead>Total CO₂</TableHead>
                    <TableHead>Trees</TableHead>
                    <TableHead>Travel Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No trips found</TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((trip) => (
                      <TableRow key={trip.id}>
                        <TableCell className="font-mono text-xs">{trip.friendly_trip_id || trip.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-sm">{trip.origin_airport} → {trip.destination_airport}</TableCell>
                        <TableCell><Badge variant="outline">{trip.travel_class}</Badge></TableCell>
                        <TableCell>{trip.is_return ? "Yes" : "No"}</TableCell>
                        <TableCell>{trip.num_travelers}</TableCell>
                        <TableCell>{Number(trip.flight_co2).toFixed(1)} kg</TableCell>
                        <TableCell className="font-medium">{Number(trip.total_co2).toFixed(1)} kg</TableCell>
                        <TableCell>{trip.trees_needed}</TableCell>
                        <TableCell className="text-sm">{format(new Date(trip.from_date), "dd MMM yyyy")}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StakeholderTripManagement;
