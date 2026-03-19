import { format } from "date-fns";
import { Plane, Calendar, Leaf, CreditCard } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";
import { airports } from "@/data/airports";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Trip = Database["public"]["Tables"]["trips"]["Row"];
type Tree = Database["public"]["Tables"]["trees"]["Row"];

interface TripDetailsSheetProps {
  trip: Trip | null;
  isOpen: boolean;
  onClose: () => void;
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

interface PaymentRecord {
  date: string;
  numTrees: number;
  amount: number;
}

export const TripDetailsSheet = ({ trip, isOpen, onClose }: TripDetailsSheetProps) => {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [isLoadingTrees, setIsLoadingTrees] = useState(false);

  useEffect(() => {
    if (trip && isOpen) {
      fetchTrees();
    }
  }, [trip, isOpen]);

  const fetchTrees = async () => {
    if (!trip) return;
    
    setIsLoadingTrees(true);
    try {
      const { data, error } = await supabase
        .from("trees")
        .select("*")
        .eq("trip_id", trip.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTrees(data || []);
    } catch (error) {
      console.error("Error fetching trees:", error);
    } finally {
      setIsLoadingTrees(false);
    }
  };

  if (!trip) return null;

  const calculateNights = (fromDate: string, toDate: string) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getAirportInfo = (code: string) => {
    const airport = airports.find(a => a.code === code);
    return airport ? `${airport.city} (${code})` : code;
  };

  const nights = calculateNights(trip.from_date, trip.to_date);
  const totalTreesPlanted = trees.reduce((sum, tree) => sum + tree.num_trees, 0);

  // Group trees into payment records by created_at date (same date = same payment batch)
  const payments: PaymentRecord[] = (() => {
    const paymentMap = new Map<string, PaymentRecord>();
    trees.forEach(tree => {
      const dateKey = format(new Date(tree.created_at), "yyyy-MM-dd");
      if (paymentMap.has(dateKey)) {
        const existing = paymentMap.get(dateKey)!;
        existing.numTrees += tree.num_trees;
        existing.amount += Number(tree.amount_paid);
      } else {
        paymentMap.set(dateKey, {
          date: tree.created_at,
          numTrees: tree.num_trees,
          amount: Number(tree.amount_paid),
        });
      }
    });
    return Array.from(paymentMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  })();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">Trip Details</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Trip Route */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Route</h3>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Plane className="h-5 w-5 text-primary" />
              {getAirportInfo(trip.origin_airport)} → {getAirportInfo(trip.destination_airport)}
            </div>
            <Badge variant={trip.is_return ? "default" : "secondary"} className="mt-2">
              {trip.is_return ? "Round Trip" : "One-way"}
            </Badge>
          </div>

          {/* Travel Dates */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Travel Dates</h3>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">
                  {format(new Date(trip.from_date), "dd MMM yyyy")} - {format(new Date(trip.to_date), "dd MMM yyyy")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {nights} {nights === 1 ? "night" : "nights"}
                </div>
              </div>
            </div>
          </div>

          {/* Travel Class */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Travel Class</h3>
            <p className="font-medium">{TRAVEL_CLASS_LABELS[trip.travel_class]}</p>
          </div>

          {/* Accommodation */}
          {trip.accommodation_type && trip.accommodation_type !== "None" && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Accommodation</h3>
              <p className="font-medium">{ACCOMMODATION_LABELS[trip.accommodation_type]}</p>
            </div>
          )}

          {/* Number of Travelers */}
          {trip.num_travelers > 1 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Travelers</h3>
              <p className="font-medium">{trip.num_travelers} travelers</p>
            </div>
          )}

          {/* Emissions Breakdown */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">CO₂ Emissions</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Flight:</span>
                <span className="font-semibold">{trip.flight_co2.toFixed(1)} kg CO₂</span>
              </div>
              {trip.accommodation_co2 > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Accommodation:</span>
                  <span className="font-semibold">{trip.accommodation_co2.toFixed(1)} kg CO₂</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm font-medium">Total:</span>
                <span className="font-bold">{trip.total_co2.toFixed(1)} kg CO₂</span>
              </div>
            </div>
          </div>

          {/* Trees Needed */}
          <div className="bg-primary/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-primary" />
                <span className="font-medium">Trees Needed:</span>
              </div>
              <span className="text-2xl font-bold text-primary">{trip.trees_needed}</span>
            </div>
          </div>

          {/* Trees Planted Count */}
          <div className="bg-accent/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-accent" />
                <span className="font-medium">Trees Planted:</span>
              </div>
              <span className="text-2xl font-bold text-accent">{totalTreesPlanted}</span>
            </div>
          </div>

          {/* Payments Section */}
          {payments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payments ({payments.length})
              </h3>
              {isLoadingTrees ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">Payment Date</TableHead>
                      <TableHead className="text-center">No. of Trees</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-left">
                          {format(new Date(payment.date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-center">{payment.numTrees}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${payment.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2">
                      <TableCell className="text-left font-semibold">Total</TableCell>
                      <TableCell className="text-center font-semibold">{totalTreesPlanted}</TableCell>
                      <TableCell className="text-right font-bold">
                        ${payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* Entry Source */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Entry Source</h3>
            <Badge variant={trip.entry_source === "Manual" ? "secondary" : "default"}>
              {trip.entry_source}
            </Badge>
          </div>

          {/* Date Added */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Added On</h3>
            <p className="font-medium">
              {format(new Date(trip.created_at), "dd MMM yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
