import { format } from "date-fns";
import { Plane, Leaf, CreditCard, FileText, Award, Info } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Database } from "@/integrations/supabase/types";
import { airports } from "@/data/airports";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { generateReceipt, ReceiptData } from "@/utils/receiptGenerator";
import { generateTreeCertificate, downloadCertificate } from "@/utils/certificateGenerator";
import { PdfPreviewDialog, PdfPreviewFile } from "@/components/ui/PdfPreviewDialog";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Trip = Database["public"]["Tables"]["trips"]["Row"];
type Tree = Database["public"]["Tables"]["trees"]["Row"];

interface TripDetailsSheetProps {
  trip: Trip | null;
  isOpen: boolean;
  onClose: () => void;
  view?: "trip" | "contributions";
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
  contributionId: string;
  date: string;
  numTrees: number;
  amount: number;
  treeIds: string[];
  ototIds: string[];
  paymentMethod: string;
}

export const TripDetailsSheet = ({ trip, isOpen, onClose, view = "trip" }: TripDetailsSheetProps) => {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [isLoadingTrees, setIsLoadingTrees] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [previewPdf, setPreviewPdf] = useState<(PdfPreviewFile & { type: 'receipt' | 'certificate' }) | null>(null);
  const [isGeneratingCert, setIsGeneratingCert] = useState<number | null>(null);

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

  const buildPaymentBatches = (): PaymentBatch[] => {
    if (trees.length === 0) return [];
    // Group by contribution_id
    const grouped = new Map<string, Tree[]>();
    trees.forEach(tree => {
      const key = tree.contribution_id || tree.id; // fallback to tree id if no contribution_id
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(tree);
    });

    const batches: PaymentBatch[] = [];
    let idx = 1;
    // Sort groups by earliest date
    const sortedKeys = [...grouped.keys()].sort((a, b) => {
      const aDate = Math.min(...grouped.get(a)!.map(t => new Date(t.created_at).getTime()));
      const bDate = Math.min(...grouped.get(b)!.map(t => new Date(t.created_at).getTime()));
      return aDate - bDate;
    });

    sortedKeys.forEach(contribId => {
      const groupTrees = grouped.get(contribId)!;
      batches.push({
        batchIndex: idx++,
        contributionId: contribId,
        date: groupTrees[0].created_at,
        numTrees: groupTrees.reduce((sum, t) => sum + t.num_trees, 0),
        amount: groupTrees.reduce((sum, t) => sum + Number(t.amount_paid), 0),
        treeIds: groupTrees.map(t => t.id),
        ototIds: groupTrees.map(t => t.otot_id),
        paymentMethod: (groupTrees[0] as any).payment_method || 'Card',
      });
    });

    return batches;
  };

  const payments = buildPaymentBatches();

  const handleViewReceipt = async (batch: PaymentBatch) => {
    const originAirport = airports.find(a => a.code === trip.origin_airport);
    const destAirport = airports.find(a => a.code === trip.destination_airport);
    const originName = originAirport ? `${originAirport.name} (${originAirport.code})` : trip.origin_airport;
    const destName = destAirport ? `${destAirport.name} (${destAirport.code})` : trip.destination_airport;
    const route = `${originName} to ${destName}`;
    const receiptNo = `OTOT-${(trip.friendly_trip_id || "TRIP").replace(/\s/g, "")}-${String(batch.batchIndex).padStart(2, "0")}`;
    const receiptData: ReceiptData = {
      receiptNo,
      paymentDate: batch.date,
      numTrees: batch.numTrees,
      amountPaid: batch.amount,
      tripId: trip.friendly_trip_id || trip.id.slice(0, 8),
      route,
      userName,
      userEmail,
      treeIds: batch.ototIds,
      paymentMethod: batch.paymentMethod,
      isReturn: trip.is_return,
      totalCo2: trip.total_co2,
    };
    const url = await generateReceipt(receiptData);
    // Convert URL to blob for unified preview
    const response = await fetch(url);
    const blob = await response.blob();
    URL.revokeObjectURL(url);
    setPreviewPdf({ blob, name: `${receiptNo}.pdf`, type: 'receipt' });
  };

  const handleViewCertificate = async (batch: PaymentBatch) => {
    setIsGeneratingCert(batch.batchIndex);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const co2PerTree = trip.trees_needed > 0 ? trip.total_co2 / trip.trees_needed : 0;
      const batchCo2 = co2PerTree * batch.numTrees;
      const blob = await generateTreeCertificate({
        userName,
        userId: authData.user.id,
        numTrees: batch.numTrees,
        co2Offset: Number(batchCo2.toFixed(1)),
        ototId: batch.ototIds[0],
        location: 'Mau Forest Complex, Kenya',
      });
      const fileName = `tree-certificate-${batch.numTrees}-trees-${format(new Date(batch.date), "dd-MMM-yyyy")}.pdf`;
      setPreviewPdf({ blob, name: fileName, type: 'certificate' });
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('Failed to generate certificate');
    } finally {
      setIsGeneratingCert(null);
    }
  };

  return (
    <>
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">Trip and Contribution Details</SheetTitle>
        </SheetHeader>
        
        <Tabs defaultValue="trip" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trip" className="text-xs sm:text-sm px-2">Trip Details</TabsTrigger>
            <TabsTrigger value="contributions" className="text-xs sm:text-sm px-2"><span className="sm:hidden">Contributions</span><span className="hidden sm:inline">Contribution Details</span></TabsTrigger>
          </TabsList>

          <TabsContent value="trip" className="space-y-5 mt-5">
          {/* Trip Route */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Route</h3>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Plane className="h-5 w-5 text-primary flex-shrink-0" />
              <span>{getAirportInfo(trip.origin_airport)} → {getAirportInfo(trip.destination_airport)}</span>
            </div>
            <Badge variant={trip.is_return ? "default" : "secondary"} className="mt-2">
              {trip.is_return ? "Round Trip" : "One-way"}
            </Badge>
          </div>

          {/* Compact Trip Info - single lines */}
          <div className="space-y-1.5 text-sm">
            <div>
              <span className="text-muted-foreground">Travel Dates: </span>
              <span className="font-medium">
                {format(new Date(trip.from_date), "dd MMM yyyy")} – {format(new Date(trip.to_date), "dd MMM yyyy")} ({nights} {nights === 1 ? "night" : "nights"})
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Travel Class: </span>
              <span className="font-medium">{TRAVEL_CLASS_LABELS[trip.travel_class]}</span>
            </div>
            {trip.num_travelers > 1 && (
              <div>
                <span className="text-muted-foreground">Travellers: </span>
                <span className="font-medium">{trip.num_travelers}</span>
              </div>
            )}
            {trip.accommodation_type && trip.accommodation_type !== "None" && (
              <div>
                <span className="text-muted-foreground">Accommodation: </span>
                <span className="font-medium">{ACCOMMODATION_LABELS[trip.accommodation_type]}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Added on: </span>
              <span className="font-medium">{format(new Date(trip.created_at), "dd MMM yyyy 'at' h:mm a")}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Entry Source: </span>
              <Badge variant={trip.entry_source === "Manual" ? "secondary" : "default"} className="ml-1">
                {trip.entry_source}
              </Badge>
            </div>
          </div>

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
          </TabsContent>

          <TabsContent value="contributions" className="mt-5">
            {isLoadingTrees ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : payments.length > 0 ? (
              <>
                <TooltipProvider>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-left">Date</TableHead>
                        <TableHead className="text-left">ID</TableHead>
                        <TableHead className="text-center">Trees</TableHead>
                        <TableHead className="text-center">Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center w-20">Docs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((batch) => (
                        <TableRow key={batch.batchIndex}>
                          <TableCell className="text-left text-xs">
                            {format(new Date(batch.date), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="text-left text-xs font-mono text-muted-foreground">
                            {batch.contributionId}
                          </TableCell>
                          <TableCell className="text-center">{batch.numTrees}</TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">{batch.paymentMethod}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${batch.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleViewReceipt(batch)}
                                    className="text-primary hover:text-primary/80"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>View Receipt</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleViewCertificate(batch)}
                                    className="text-amber-600 hover:text-amber-500 disabled:opacity-50"
                                    disabled={isGeneratingCert === batch.batchIndex}
                                  >
                                    {isGeneratingCert === batch.batchIndex ? (
                                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                                    ) : (
                                      <Award className="h-4 w-4" />
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>View Certificate</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2">
                        <TableCell className="text-left font-semibold">Total</TableCell>
                        <TableCell />
                        <TableCell className="text-center font-semibold">{totalTreesPlanted}</TableCell>
                        <TableCell />
                        <TableCell className="text-right font-bold">
                          ${payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </TooltipProvider>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-2 px-1 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 flex-shrink-0" />
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3 text-primary" /> Receipt</span>
                    <span className="flex items-center gap-1"><Award className="h-3 w-3 text-amber-600" /> Certificate</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No contributions yet.</p>
            )}
          </TabsContent>
        </Tabs>

      </SheetContent>
    </Sheet>

    {/* Unified PDF Preview Dialog */}
    <PdfPreviewDialog
      file={previewPdf}
      onClose={() => setPreviewPdf(null)}
      title={previewPdf?.type === 'certificate' ? 'Certificate Preview' : 'Receipt Preview'}
      description={previewPdf?.type === 'certificate'
        ? 'Preview your certificate below, open it in a new tab, or download it.'
        : 'Preview your receipt below, open it in a new tab, or download it.'}
      showShare={previewPdf?.type === 'certificate'}
      onDownload={(f) => {
        if (previewPdf?.type === 'certificate') {
          downloadCertificate(f.blob, f.name);
        } else {
          const url = URL.createObjectURL(f.blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = f.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }}
    />
    </>
  );
};
