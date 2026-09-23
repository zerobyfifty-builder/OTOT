import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Eye,
  Info,
  Leaf,
  MoreVertical,
  Plane,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { kg } from "@/lib/format";
import {
  ACCOMMODATION_LABELS,
  TRAVEL_CLASS_LABELS,
  airportCity,
  formatDateRange,
  offsetStatus,
  remainingCarbonKg,
  remainingTrees,
  treesPlantedForTrip,
  tripNights,
} from "@/lib/trips";
import type { Trip } from "@/types/otot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TripDetailsDialog } from "@/components/tourist/TripDetailsDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Filter = "all" | "fully" | "partially" | "not";

function OffsetBadge({ planted, needed }: { planted: number; needed: number }) {
  if (planted >= needed) {
    return <Badge className="bg-green-100 hover:bg-green-100 text-green-700 border-green-200">Fully Offset</Badge>;
  }
  if (planted > 0) {
    return <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-700 border-amber-200">Partially Offset</Badge>;
  }
  return <Badge className="bg-red-100 hover:bg-red-100 text-red-700 border-red-200">Not Offset</Badge>;
}

export default function MyTrips() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { state, deleteTrip } = useStore();
  const [statusFilter, setStatusFilter] = useState<Filter>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [details, setDetails] = useState<Trip | null>(null);

  const trips = useMemo(() => {
    return state.trips
      .filter((t) => t.userId === session?.userId)
      .map((trip) => ({
        trip,
        planted: treesPlantedForTrip(trip.id, state.donations),
      }));
  }, [session?.userId, state.donations, state.trips]);

  const filtered = trips.filter(({ trip, planted }) => {
    const status = offsetStatus(trip, planted);
    if (statusFilter === "all") return true;
    return status === statusFilter;
  });

  const counts = {
    all: trips.length,
    fully: trips.filter(({ trip, planted }) => offsetStatus(trip, planted) === "fully").length,
    partially: trips.filter(({ trip, planted }) => offsetStatus(trip, planted) === "partially").length,
    not: trips.filter(({ trip, planted }) => offsetStatus(trip, planted) === "not").length,
  };

  const offsetTrip = (trip: Trip) => {
    navigate("/donate", {
      state: {
        carbonOffsetKg: remainingCarbonKg(trip, state.donations) || trip.totalCo2,
        treesNeeded: remainingTrees(trip, state.donations),
        tripId: trip.id,
      },
    });
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteTrip(deletingId);
      toast.success("Trip deleted");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const filterCards: { key: Filter; label: string; value: number; icon: typeof Plane; ring: string; iconWrap: string; iconColor: string }[] = [
    { key: "all", label: "Total Trips", value: counts.all, icon: Plane, ring: "ring-primary", iconWrap: "bg-primary/10", iconColor: "text-primary" },
    { key: "fully", label: "Fully Offset", value: counts.fully, icon: CheckCircle2, ring: "ring-green-600", iconWrap: "bg-green-500/10", iconColor: "text-green-600" },
    { key: "partially", label: "Partially Offset", value: counts.partially, icon: AlertCircle, ring: "ring-amber-500", iconWrap: "bg-amber-500/10", iconColor: "text-amber-600" },
    { key: "not", label: "Not Offset", value: counts.not, icon: XCircle, ring: "ring-destructive", iconWrap: "bg-destructive/10", iconColor: "text-destructive" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl py-8">
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-foreground mb-2">My Trips</h1>
            <p className="text-sm text-muted-foreground italic w-full">
              If your trip does not appear here, please add it manually.
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer inline align-middle ml-0.5" />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-[220px]">
                      Travel partners can add trips automatically when you book with the same email. Until then, add them here.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </p>
          </div>
          <Button onClick={() => navigate("/carbon-calculator")} className="ml-4 shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Trip
          </Button>
        </div>
      </div>

      {trips.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {filterCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.key}
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === card.key ? `ring-2 ${card.ring}` : ""}`}
                onClick={() => setStatusFilter(card.key)}
              >
                <CardContent className="pt-6 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full ${card.iconWrap} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-5 w-5 ${card.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{card.value}</p>
                      <p className="text-xs text-muted-foreground">{card.label}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {trips.length === 0 ? (
        <Card className="py-12">
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
        </Card>
      ) : (
        <>
          {statusFilter !== "all" && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{filtered.length}</span> of {trips.length} trips
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStatusFilter("all")} className="text-primary hover:text-primary">
                <XCircle className="h-4 w-4 mr-1" />
                Clear filter
              </Button>
            </div>
          )}

          <div className="hidden lg:block">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        {["Trip ID/Dt", "Travel Dates", "Trip Details", "CO₂ Emissions", "Trees Needed", "Trees Planted", "Offset Status", "Actions"].map(
                          (h) => (
                            <th key={h} className="px-6 py-4 text-left text-sm font-semibold text-foreground whitespace-nowrap">
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(({ trip, planted }) => {
                        const range = formatDateRange(trip.fromDate, trip.toDate);
                        return (
                          <tr key={trip.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-6 py-6 whitespace-nowrap">
                              <div className="space-y-1">
                                <div className="text-sm font-semibold text-foreground">{trip.friendlyTripId}</div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(trip.createdAt), "dd MMM yyyy, h:mm a")}
                                </div>
                                <Badge variant={trip.entrySource === "Manual" ? "secondary" : "default"} className="text-xs mt-1">
                                  {trip.entrySource}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-6 py-6 whitespace-nowrap">
                              <div className="text-sm">
                                <div className="font-medium text-foreground">{range.dateText}</div>
                                <div className="text-xs text-muted-foreground">{range.daysText}</div>
                              </div>
                            </td>
                            <td className="px-6 py-6 space-y-1">
                              <div className="font-medium text-foreground">
                                {airportCity(trip.originAirport)} → {airportCity(trip.destinationAirport)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {TRAVEL_CLASS_LABELS[trip.travelClass]}, {trip.isReturn ? "Return" : "One-way"}
                              </div>
                              {trip.accommodationType !== "none" && (
                                <div className="text-xs text-muted-foreground">{ACCOMMODATION_LABELS[trip.accommodationType]}</div>
                              )}
                            </td>
                            <td className="px-6 py-6 whitespace-nowrap text-sm space-y-1">
                              <div>
                                <span className="text-muted-foreground">Flight: </span>
                                <span className="font-semibold">{kg(trip.flightCo2)}</span>
                              </div>
                              {trip.accommodationCo2 > 0 && (
                                <div>
                                  <span className="text-muted-foreground">Stay: </span>
                                  <span className="font-semibold">{kg(trip.accommodationCo2)}</span>
                                </div>
                              )}
                              <div className="pt-1 border-t">
                                <span className="text-muted-foreground">Total: </span>
                                <span className="font-bold">{kg(trip.totalCo2)} CO₂</span>
                              </div>
                            </td>
                            <td className="px-6 py-6">
                              <div className="flex items-center gap-2">
                                <Leaf className="h-5 w-5 text-primary" />
                                <div>
                                  <div className="font-bold text-lg">{trip.treesNeeded}</div>
                                  <div className="text-xs text-muted-foreground">{trip.treesNeeded === 1 ? "tree" : "trees"}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-6">
                              <div className="flex items-center gap-2">
                                <Leaf className="h-5 w-5 text-accent" />
                                <div>
                                  <div className="font-bold text-lg">{planted}</div>
                                  <div className="text-xs text-muted-foreground">{planted === 1 ? "tree" : "trees"}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-6">
                              <OffsetBadge planted={planted} needed={trip.treesNeeded} />
                            </td>
                            <td className="px-6 py-6">
                              <div className="flex items-center gap-2">
                                <Button size="sm" onClick={() => offsetTrip(trip)} disabled={planted >= trip.treesNeeded}>
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
                                    <DropdownMenuItem onClick={() => setDetails(trip)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Trip Details
                                    </DropdownMenuItem>
                                    {planted === 0 ? (
                                      <DropdownMenuItem onClick={() => setDeletingId(trip.id)} className="text-destructive focus:text-destructive">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Trip
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem disabled className="text-muted-foreground opacity-60">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Trip
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:hidden space-y-4">
            {filtered.map(({ trip, planted }) => {
              const range = formatDateRange(trip.fromDate, trip.toDate);
              const nights = tripNights(trip.fromDate, trip.toDate);
              return (
                <Card key={trip.id}>
                  <CardHeader className="pb-1.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold text-muted-foreground">{trip.friendlyTripId}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(trip.createdAt), "dd MMM yyyy, h:mm a")}
                        </div>
                        <Badge variant={trip.entrySource === "Manual" ? "secondary" : "default"} className="mt-1.5">
                          {trip.entrySource}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <OffsetBadge planted={planted} needed={trip.treesNeeded} />
                      </div>
                    </div>
                    <CardTitle className="text-lg">
                      {airportCity(trip.originAirport)} → {airportCity(trip.destinationAirport)}
                    </CardTitle>
                    <CardDescription>
                      {range.dateText} ({range.daysText})
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <div className="text-muted-foreground mb-1">
                        {TRAVEL_CLASS_LABELS[trip.travelClass]}, {trip.isReturn ? "Return" : "One-way"}
                      </div>
                      <div className="text-muted-foreground">{ACCOMMODATION_LABELS[trip.accommodationType]}</div>
                      {trip.numTravelers > 1 && <div className="text-muted-foreground">{trip.numTravelers} travelers</div>}
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Flight:</span>
                        <span className="font-medium">{kg(trip.flightCo2)} CO₂</span>
                      </div>
                      {trip.accommodationCo2 > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Stay ({nights} {nights === 1 ? "night" : "nights"}):
                          </span>
                          <span className="font-medium">{kg(trip.accommodationCo2)} CO₂</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-semibold">{kg(trip.totalCo2)} CO₂</span>
                      </div>
                      <div className="flex justify-between items-center text-primary font-medium">
                        <span className="flex items-center gap-1">
                          <Leaf className="h-3 w-3" />
                          Trees needed:
                        </span>
                        <span>{trip.treesNeeded}</span>
                      </div>
                      <div className="flex justify-between items-center text-accent font-medium">
                        <span className="flex items-center gap-1">
                          <Leaf className="h-3 w-3" />
                          Trees planted:
                        </span>
                        <span>{planted}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => offsetTrip(trip)} className="flex-1" disabled={planted >= trip.treesNeeded}>
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
                          <DropdownMenuItem onClick={() => setDetails(trip)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Trip Details
                          </DropdownMenuItem>
                          {planted === 0 ? (
                            <DropdownMenuItem onClick={() => setDeletingId(trip.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Trip
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled className="text-muted-foreground opacity-60">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Trip
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <TripDetailsDialog trip={details} donations={state.donations} onClose={() => setDetails(null)} />

      <AlertDialog open={Boolean(deletingId)} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Trips with funded trees cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
