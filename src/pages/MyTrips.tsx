import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plane, Calendar, Edit, Eye, Leaf, Plus, Trash2, MoreVertical, CheckCircle2, AlertCircle, XCircle, ChevronRight } from "lucide-react";
import ktbLogo from '@/assets/ktb-logo.png';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { airports } from "@/data/airports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TripDetailsSheet } from "@/components/trees/TripDetailsSheet";
import { TreeDetailsSheet } from "@/components/trees/TreeDetailsSheet";

type Trip = Database["public"]["Tables"]["trips"]["Row"];

interface TripWithTreeCount extends Trip {
  treesPlanted: number;
}
const TRAVEL_CLASS_LABELS: Record<Database["public"]["Enums"]["travel_class_type"], string> = {
  "Economy": "Economy",
  "Premium Economy": "Premium Economy",
  "Business": "Business",
  "First": "First Class"
};
const ACCOMMODATION_LABELS: Record<Database["public"]["Enums"]["accommodation_type"], string> = {
  "None": "No Accommodation",
  "Hotel": "Hotel",
  "Rental": "Rental",
  "Cruise Ship": "Cruise Ship",
  "Service Apartment": "Service Apartment"
};
export const MyTrips = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trips, setTrips] = useState<TripWithTreeCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [selectedTripForDetails, setSelectedTripForDetails] = useState<Trip | null>(null);
  const [selectedTripForTrees, setSelectedTripForTrees] = useState<string | null>(null);
  const [isTripDetailsOpen, setIsTripDetailsOpen] = useState(false);
  const [isTreeDetailsOpen, setIsTreeDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "fully" | "partially" | "not">("all");

  const getFilteredTrips = () => {
    switch (statusFilter) {
      case "fully": return trips.filter(t => t.treesPlanted >= t.trees_needed);
      case "partially": return trips.filter(t => t.treesPlanted > 0 && t.treesPlanted < t.trees_needed);
      case "not": return trips.filter(t => t.treesPlanted === 0);
      default: return trips;
    }
  };
  const filteredTrips = getFilteredTrips();
  useEffect(() => {
    fetchTrips();
  }, []);
  const fetchTrips = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view your trips.",
          variant: "destructive"
        });
        navigate("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch tree counts for each trip
      const tripsWithCounts = await Promise.all(
        (data || []).map(async (trip) => {
          const { data: treesData } = await supabase
            .from("trees")
            .select("num_trees")
            .eq("trip_id", trip.id);

          const treesPlanted = treesData?.reduce((sum, t) => sum + t.num_trees, 0) || 0;

          return {
            ...trip,
            treesPlanted
          };
        })
      );

      setTrips(tripsWithCounts);
    } catch (error) {
      console.error("Error fetching trips:", error);
      toast({
        title: "Error",
        description: "Failed to load your trips. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const getAirportName = (code: string) => {
    const airport = airports.find(a => a.code === code);
    return airport ? airport.city : code;
  };
  const calculateNights = (fromDate: string, toDate: string) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  };
  const formatDateRange = (fromDate: string, toDate: string) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const days = calculateNights(fromDate, toDate);

    // Format as "12 to 15 Oct 2025" or "12 Oct 2025" if same day
    if (format(from, "dd MMM yyyy") === format(to, "dd MMM yyyy")) {
      return {
        dateText: format(from, "dd MMM yyyy"),
        daysText: "Same day"
      };
    }

    // Check if same month and year
    if (format(from, "MMM yyyy") === format(to, "MMM yyyy")) {
      return {
        dateText: `${format(from, "dd")} to ${format(to, "dd MMM yyyy")}`,
        daysText: `${days} ${days === 1 ? 'day' : 'days'}`
      };
    }

    // Check if same year
    if (format(from, "yyyy") === format(to, "yyyy")) {
      return {
        dateText: `${format(from, "dd MMM")} to ${format(to, "dd MMM yyyy")}`,
        daysText: `${days} ${days === 1 ? 'day' : 'days'}`
      };
    }

    // Different years
    return {
      dateText: `${format(from, "dd MMM yyyy")} to ${format(to, "dd MMM yyyy")}`,
      daysText: `${days} ${days === 1 ? 'day' : 'days'}`
    };
  };
  const handleOffsetEmissions = (trip: TripWithTreeCount) => {
    // Convert database enum values to form values
    const travelClassMap: Record<Database["public"]["Enums"]["travel_class_type"], "economy" | "premium_economy" | "business" | "first"> = {
      "Economy": "economy",
      "Premium Economy": "premium_economy",
      "Business": "business",
      "First": "first"
    };
    const accommodationMap: Record<Database["public"]["Enums"]["accommodation_type"], "none" | "hotel" | "rental" | "cruise" | "service_apartment"> = {
      "None": "none",
      "Hotel": "hotel",
      "Rental": "rental",
      "Cruise Ship": "cruise",
      "Service Apartment": "service_apartment"
    };
    navigate("/tree-purchase", {
      state: {
        treesNeeded: trip.trees_needed,
        totalCO2: trip.total_co2,
        tripId: trip.id,
        // Pass the trip ID
        tripData: {
          originAirport: trip.origin_airport,
          destinationAirport: trip.destination_airport,
          travelClass: travelClassMap[trip.travel_class],
          isReturn: trip.is_return,
          fromDate: new Date(trip.from_date),
          toDate: new Date(trip.to_date ? trip.to_date : trip.from_date),
          accommodationType: accommodationMap[trip.accommodation_type || "None"],
          numTravelers: trip.num_travelers
        }
      }
    });
  };
  const handleEditTrip = (tripId: string) => {
    // TODO: Implement edit functionality
    toast({
      title: "Edit Trip",
      description: "Edit functionality will be implemented soon."
    });
  };
  const handleViewDetails = (trip: TripWithTreeCount) => {
    setSelectedTripForDetails(trip);
    setIsTripDetailsOpen(true);
  };

  const handleViewTreeDetails = (tripId: string) => {
    setSelectedTripForTrees(tripId);
    setIsTreeDetailsOpen(true);
  };
  const handleDeleteTrip = async (tripId: string) => {
    try {
      const {
        error
      } = await supabase.from("trips").delete().eq("id", tripId);
      if (error) throw error;
      toast({
        title: "Trip Deleted",
        description: "Your trip has been deleted successfully."
      });

      // Refresh the trips list
      fetchTrips();
    } catch (error) {
      console.error("Error deleting trip:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete your trip. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeletingTripId(null);
    }
  };
  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your trips...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <div className="container max-w-7xl py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-foreground mb-2">My Trips</h1>
              <p className="text-muted-foreground mb-2">Our Travel Partners automatically add your trips when you book using the same email and mobile number.</p>
              <p className="text-sm text-muted-foreground italic">
                If your trip does not appear here, please add it manually.
              </p>
            </div>
            <Button onClick={() => navigate("/carbon-calculator")} className="ml-4 shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Add Trip Manually
            </Button>
          </div>
        </div>

        {/* Trip Stats */}
        {trips.length > 0 && (() => {
          const totalTrips = trips.length;
          const fullyOffset = trips.filter(t => t.treesPlanted >= t.trees_needed).length;
          const partiallyOffset = trips.filter(t => t.treesPlanted > 0 && t.treesPlanted < t.trees_needed).length;
          const notOffset = trips.filter(t => t.treesPlanted === 0).length;
          return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "all" ? "ring-2 ring-primary" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                <CardContent className="pt-6 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Plane className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{totalTrips}</p>
                      <p className="text-xs text-muted-foreground">Total Trips</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "fully" ? "ring-2 ring-green-600" : ""}`}
                onClick={() => setStatusFilter("fully")}
              >
                <CardContent className="pt-6 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{fullyOffset}</p>
                      <p className="text-xs text-muted-foreground">Fully Offset</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "partially" ? "ring-2 ring-amber-500" : ""}`}
                onClick={() => setStatusFilter("partially")}
              >
                <CardContent className="pt-6 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{partiallyOffset}</p>
                      <p className="text-xs text-muted-foreground">Partially Offset</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "not" ? "ring-2 ring-destructive" : ""}`}
                onClick={() => setStatusFilter("not")}
              >
                <CardContent className="pt-6 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <XCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{notOffset}</p>
                      <p className="text-xs text-muted-foreground">Not Offset</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* Empty State */}
        {trips.length === 0 ? <Card className="py-12">
            <CardContent className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Plane className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No trips found</h3>
              <p className="text-muted-foreground mb-6">
                Add your first trip to calculate emissions and start offsetting your carbon footprint.
              </p>
              <Button onClick={() => navigate("/carbon-calculator")}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Trip
              </Button>
            </CardContent>
          </Card> : <>
            {/* Active filter indicator */}
            {statusFilter !== "all" && (
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-medium text-foreground">{filteredTrips.length}</span> of {trips.length} trips
                </p>
                <Button variant="ghost" size="sm" onClick={() => setStatusFilter("all")} className="text-primary hover:text-primary">
                  <XCircle className="h-4 w-4 mr-1" />
                  Clear filter
                </Button>
              </div>
            )}

            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                            Trip ID
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                            Date Added
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                            Travel Dates
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                            Trip Details
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                            CO₂ Emissions
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                            Trees Needed
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                            Trees Planted
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTrips.map(trip => {
                      const nights = calculateNights(trip.from_date, trip.to_date);
                      const {
                        dateText,
                        daysText
                      } = formatDateRange(trip.from_date, trip.to_date);
                      return <tr key={trip.id} className="border-b last:border-0 hover:bg-muted/30">
                              {/* Trip ID */}
                              <td className="px-6 py-6">
                                <span className="text-sm font-semibold text-foreground">
                                  {trip.friendly_trip_id}
                                </span>
                              </td>

                              {/* Date Added */}
                              <td className="px-6 py-6">
                                <div className="text-sm">
                                  <div className="font-medium text-foreground">
                                    {format(new Date(trip.created_at), "dd MMM yyyy")}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(trip.created_at), "h:mm a")}
                                  </div>
                                  <Badge variant={trip.entry_source === "Manual" ? "secondary" : "default"} className="text-xs mt-1">
                                    {trip.entry_source}
                                  </Badge>
                                </div>
                              </td>

                              {/* Travel Dates */}
                              <td className="px-6 py-6">
                                <div className="text-sm">
                                  <div className="font-medium text-foreground">{dateText}</div>
                                  <div className="text-xs text-muted-foreground">{daysText}</div>
                                </div>
                              </td>

                              {/* Trip Details */}
                              <td className="px-6 py-6">
                                <div className="space-y-1">
                                  <div className="font-medium text-foreground">
                                    {getAirportName(trip.origin_airport)} → {getAirportName(trip.destination_airport)}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {TRAVEL_CLASS_LABELS[trip.travel_class]}, {trip.is_return ? "Return" : "One-way"}
                                  </div>
                                  {trip.accommodation_type && trip.accommodation_type !== "None" && <div className="text-xs text-muted-foreground">
                                      {ACCOMMODATION_LABELS[trip.accommodation_type]}
                                    </div>}
                                </div>
                              </td>

                              {/* CO2 Emissions */}
                              <td className="px-6 py-6">
                                <div className="space-y-1 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Flight: </span>
                                    <span className="font-semibold text-foreground">{trip.flight_co2.toFixed(1)} kg</span>
                                  </div>
                                  {trip.accommodation_co2 > 0 && <div>
                                      <span className="text-muted-foreground">Stay: </span>
                                      <span className="font-semibold text-foreground">{trip.accommodation_co2.toFixed(1)} kg</span>
                                    </div>}
                                  <div className="pt-1 border-t">
                                    <span className="text-muted-foreground">Total: </span>
                                    <span className="font-bold text-foreground">{trip.total_co2.toFixed(1)} kg CO₂</span>
                                  </div>
                                </div>
                              </td>

                              {/* Trees Needed */}
                              <td className="px-6 py-6">
                                <div className="flex items-center gap-2">
                                  <Leaf className="h-5 w-5 text-primary" />
                                  <div>
                                    <div className="font-bold text-lg text-foreground">{trip.trees_needed}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {trip.trees_needed === 1 ? "tree" : "trees"}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Trees Planted */}
                              <td className="px-6 py-6">
                                <div className="flex items-center gap-2">
                                  <Leaf className="h-5 w-5 text-accent" />
                                  <div>
                                    <div className="font-bold text-lg text-foreground">{trip.treesPlanted}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {trip.treesPlanted === 1 ? "tree" : "trees"}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Status */}
                              <td className="px-6 py-6 text-center">
                                {trip.treesPlanted >= trip.trees_needed ? (
                                  <Badge className="bg-green-100 hover:bg-green-100 text-green-700 border-green-200">Fully Offset</Badge>
                                ) : trip.treesPlanted > 0 ? (
                                  <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-700 border-amber-200">Partially Offset</Badge>
                                ) : (
                                  <Badge className="bg-red-100 hover:bg-red-100 text-red-700 border-red-200">Not Offset</Badge>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-6 py-6">
                                <div className="flex items-center gap-2">
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleOffsetEmissions(trip)} 
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                    disabled={trip.treesPlanted >= trip.trees_needed}
                                  >
                                    <Leaf className="h-3 w-3 mr-1" />
                                    Offset
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleViewDetails(trip)}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleViewTreeDetails(trip.id)}>
                                        <Leaf className="h-4 w-4 mr-2" />
                                        Tree Details
                                      </DropdownMenuItem>
                                      {trip.treesPlanted === 0 ? (
                                        <DropdownMenuItem onClick={() => setDeletingTripId(trip.id)} className="text-destructive focus:text-destructive">
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete Trip
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem disabled className="text-muted-foreground opacity-60" title="Trees planted — cannot delete">
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete Trip
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            </tr>;
                    })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {filteredTrips.map(trip => {
            const nights = calculateNights(trip.from_date, trip.to_date);
            return <Card key={trip.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-sm font-semibold text-muted-foreground">
                            Trip ID: {trip.friendly_trip_id}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(trip.created_at), "dd MMM yyyy, h:mm a")}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {trip.treesPlanted >= trip.trees_needed ? (
                            <Badge className="bg-green-100 hover:bg-green-100 text-green-700 border-green-200">Fully Offset</Badge>
                          ) : trip.treesPlanted > 0 ? (
                            <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-700 border-amber-200">Partially Offset</Badge>
                          ) : (
                            <Badge className="bg-red-100 hover:bg-red-100 text-red-700 border-red-200">Not Offset</Badge>
                          )}
                          <Badge variant={trip.entry_source === "Manual" ? "secondary" : "default"}>
                            {trip.entry_source}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">
                          {getAirportName(trip.origin_airport)} → {getAirportName(trip.destination_airport)}
                        </CardTitle>
                      </div>
                      <CardDescription>
                        {format(new Date(trip.from_date), "dd MMM yyyy")} - {format(new Date(trip.to_date), "dd MMM yyyy")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Trip Details */}
                      <div className="text-sm">
                        <div className="text-muted-foreground mb-1">
                          {TRAVEL_CLASS_LABELS[trip.travel_class]}, {trip.is_return ? "Return" : "One-way"}
                        </div>
                        <div className="text-muted-foreground">
                          {ACCOMMODATION_LABELS[trip.accommodation_type]}
                        </div>
                        {trip.num_travelers > 1 && <div className="text-muted-foreground">
                            {trip.num_travelers} travelers
                          </div>}
                      </div>

                      {/* Emissions */}
                      <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Flight:</span>
                          <span className="font-medium">{trip.flight_co2.toFixed(1)} kg CO₂</span>
                        </div>
                        {trip.accommodation_co2 > 0 && <div className="flex justify-between">
                            <span className="text-muted-foreground">Stay ({nights} {nights === 1 ? "night" : "nights"}):</span>
                            <span className="font-medium">{trip.accommodation_co2.toFixed(1)} kg CO₂</span>
                          </div>}
                        <div className="flex justify-between pt-1 border-t">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-semibold">{trip.total_co2.toFixed(1)} kg CO₂</span>
                        </div>
                        <div className="flex justify-between items-center text-primary font-medium">
                          <span className="flex items-center gap-1">
                            <Leaf className="h-3 w-3" />
                            Trees needed:
                          </span>
                          <span>{trip.trees_needed}</span>
                        </div>
                        <div className="flex justify-between items-center text-accent font-medium">
                          <span className="flex items-center gap-1">
                            <Leaf className="h-3 w-3" />
                            Trees planted:
                          </span>
                          <span>{trip.treesPlanted}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleOffsetEmissions(trip)} 
                          className="flex-1"
                          disabled={trip.treesPlanted >= trip.trees_needed}
                        >
                          <Leaf className="h-3 w-3 mr-1" />
                          Offset Emissions
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-9 w-9 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(trip)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewTreeDetails(trip.id)}>
                              <Leaf className="h-4 w-4 mr-2" />
                              Tree Details
                            </DropdownMenuItem>
                            {trip.treesPlanted === 0 ? (
                              <DropdownMenuItem onClick={() => setDeletingTripId(trip.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Trip
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem disabled className="text-muted-foreground opacity-60" title="Trees planted — cannot delete">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Trip
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>;
          })}
            </div>
          </>}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingTripId} onOpenChange={() => setDeletingTripId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your trip
                and remove the data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deletingTripId && handleDeleteTrip(deletingTripId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Trip Details Sheet */}
        <TripDetailsSheet
          trip={selectedTripForDetails}
          isOpen={isTripDetailsOpen}
          onClose={() => {
            setIsTripDetailsOpen(false);
            setSelectedTripForDetails(null);
          }}
        />

        {/* Tree Details Sheet */}
        <TreeDetailsSheet
          tripId={selectedTripForTrees}
          isOpen={isTreeDetailsOpen}
          onClose={() => {
            setIsTreeDetailsOpen(false);
            setSelectedTripForTrees(null);
          }}
        />
      </div>
    </div>;
};