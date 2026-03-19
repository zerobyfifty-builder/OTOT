import { format } from "date-fns";
import { Plane, Calendar, Leaf, CreditCard, FileText } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Database } from "@/integrations/supabase/types";
import { airports } from "@/data/airports";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { generateReceipt, ReceiptData } from "@/utils/receiptGenerator";
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

interface PaymentBatch {
  batchIndex: number;
  date: string;
  numTrees: number;
  amount: number;
  treeIds: string[];
  ototIds: string[];
  paymentMethod: string;
}

export const TripDetailsSheet = ({ trip, isOpen, onClose }: TripDetailsSheetProps) => {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [isLoadingTrees, setIsLoadingTrees] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    if (trip && isOpen) {
      fetchTrees();
      fetchUser();
    }
  }, [trip, isOpen]);

  const fetchUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setUserEmail(data.user.email || "");
      const { data: profile } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("user_id", data.user.id)
        .single();
      if (profile) {
        setUserName(`${profile.first_name || ""} ${profile.last_name || ""}`.trim() || data.user.email || "");
      }
    }
  };

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
  const offsetPercent = trip.trees_needed > 0 ? Math.min(100, Math.round((totalTreesPlanted / trip.trees_needed) * 100)) : 0;

  // Group trees into payment batches by timestamp proximity (within 5 minutes = same batch)
  const buildPaymentBatches = (): PaymentBatch[] => {
    if (trees.length === 0) return [];
    const sorted = [...trees].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const batches: PaymentBatch[] = [];
    let current: PaymentBatch = {
      batchIndex: 1,
      date: sorted[0].created_at,
      numTrees: sorted[0].num_trees,
      amount: Number(sorted[0].amount_paid),
      treeIds: [sorted[0].id],
      ototIds: [sorted[0].otot_id],
      paymentMethod: (sorted[0] as any).payment_method || 'Card',
    };
    for (let i = 1; i < sorted.length; i++) {
      const gap = new Date(sorted[i].created_at).getTime() - new Date(sorted[i - 1].created_at).getTime();
      if (gap <= 5 * 60 * 1000) {
        current.numTrees += sorted[i].num_trees;
        current.amount += Number(sorted[i].amount_paid);
        current.treeIds.push(sorted[i].id);
        current.ototIds.push(sorted[i].otot_id);
      } else {
        batches.push(current);
        current = {
          batchIndex: batches.length + 2,
          date: sorted[i].created_at,
          numTrees: sorted[i].num_trees,
          amount: Number(sorted[i].amount_paid),
          treeIds: [sorted[i].id],
          ototIds: [sorted[i].otot_id],
          paymentMethod: (sorted[i] as any).payment_method || 'Card',
        };
      }
    }
    batches.push(current);
    return batches;
  };

  const payments = buildPaymentBatches();

  const handleDownloadReceipt = async (batch: PaymentBatch) => {
    const route = `${trip.origin_airport} → ${trip.destination_airport}`;
    const receiptData: ReceiptData = {
      receiptNo: `OTOT-${(trip.friendly_trip_id || "TRIP").replace(/\s/g, "")}-${String(batch.batchIndex).padStart(2, "0")}`,
      paymentDate: batch.date,
      numTrees: batch.numTrees,
      amountPaid: batch.amount,
      tripId: trip.friendly_trip_id || trip.id.slice(0, 8),
      route,
      userName,
      userEmail,
      treeIds: batch.ototIds,
    };
    await generateReceipt(receiptData);
  };

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

          {/* Offset Progress */}
          <div className="bg-primary/10 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-primary" />
                <span className="font-medium">Offset Progress</span>
              </div>
              <span className="text-sm font-semibold text-primary">{offsetPercent}%</span>
            </div>
            <Progress value={offsetPercent} className="h-2.5" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{totalTreesPlanted} planted</span>
              <span>{trip.trees_needed} needed</span>
            </div>
          </div>

          {/* Payments Section */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payments ({payments.length})
            </h3>
            {isLoadingTrees ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : payments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Payment Date</TableHead>
                    <TableHead className="text-center">Trees</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center w-10">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((batch) => (
                    <TableRow key={batch.batchIndex}>
                      <TableCell className="text-left">
                        {format(new Date(batch.date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-center">{batch.numTrees}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${batch.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleDownloadReceipt(batch)}
                          className="text-primary hover:text-primary/80"
                          title="Download receipt"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2">
                    <TableCell className="text-left font-semibold">Total</TableCell>
                    <TableCell className="text-center font-semibold">{totalTreesPlanted}</TableCell>
                    <TableCell className="text-right font-bold">
                      ${payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No payments yet.</p>
            )}
          </div>

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
