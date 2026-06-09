import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Sprout, ExternalLink, Eye, TreePine, Cloud, ChevronDown, Plane, ShoppingBag, MapPin, Award, Leaf, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContributionTreesSheet } from "@/components/trees/ContributionTreesSheet";
import { generateTreeCertificate, downloadCertificate } from "@/utils/certificateGenerator";
import { airports } from "@/data/airports";
import { CertificatePreviewDialog, CertificatePreviewFile } from "@/components/certificates/CertificatePreviewDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TreeDetailPanel } from "@/components/trees/TreeDetailPanel";
import { TripDetailsSheet } from "@/components/trees/TripDetailsSheet";
import { Database } from "@/integrations/supabase/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTouristModulePermissions } from "@/hooks/useTouristModulePermissions";

type Tree = Database["public"]["Tables"]["trees"]["Row"];
type Trip = Database["public"]["Tables"]["trips"]["Row"];
type TreeStatus = Database["public"]["Enums"]["tree_status_type"];
type PurchaseType = Database["public"]["Enums"]["purchase_type"];

interface TreeGroup {
  key: string;
  tripId: string | null;
  trip: Trip | null;
  trees: Tree[];
  totalTrees: number;
  totalAmount: number;
  latestDate: string;
}

const STATUS_COLORS: Record<TreeStatus, string> = {
  "Waiting to be Assigned": "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  "Assigned": "bg-orange-500/10 text-orange-700 border-orange-500/20",
  "Sapling Planted": "bg-green-500/10 text-green-700 border-green-500/20",
  "Being Mapped": "bg-blue-500/10 text-blue-700 border-blue-500/20",
  "Planted": "bg-accent/10 text-accent border-accent/20",
};

// Tourist portal only surfaces four high-level planting stages.
// The full 10-status workflow from the plantation portal is collapsed into these buckets.
const TOURIST_STAGE_LABELS = {
  waiting: "Waiting to be Assigned",
  assigned: "Assigned",
  scheduled: "Planting Scheduled",
  planted: "Planted",
} as const;

type TouristStage = keyof typeof TOURIST_STAGE_LABELS;

const toTouristStage = (status: string | null | undefined): TouristStage => {
  switch (status) {
    case "planted":
    case "verified":
    case "being_mapped":
    case "sapling_planted":
      return "planted";
    case "planting_scheduled":
      return "scheduled";
    case "assigned":
    case "site_prepared":
    case "saplings_ready":
      return "assigned";
    case "waiting_to_be_assigned":
    default:
      return "waiting";
  }
};

const PLANTING_STATUS_LABELS: Record<TouristStage, string> = {
  waiting: TOURIST_STAGE_LABELS.waiting,
  assigned: TOURIST_STAGE_LABELS.assigned,
  scheduled: TOURIST_STAGE_LABELS.scheduled,
  planted: TOURIST_STAGE_LABELS.planted,
};

const PLANTING_STATUS_COLORS: Record<TouristStage, string> = {
  waiting: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  assigned: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  scheduled: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  planted: "bg-accent/10 text-accent border-accent/20",
};

const SOURCE_COLORS: Record<PurchaseType, string> = {
  "One-time": "bg-blue-500/10 text-blue-700 border-blue-500/20",
  "Subscription": "bg-green-500/10 text-green-700 border-green-500/20",
};

const STAGE_ORDER: TouristStage[] = ["waiting", "assigned", "scheduled", "planted"];

const getGroupStatus = (trees: Tree[]): string => {
  const stages = trees.map(t => toTouristStage(t.planting_status));
  if (stages.every(s => s === "planted")) return "Planted";
  if (stages.some(s => s === "planted")) return "Partially Planted";
  // Show the least-advanced stage so the user sees what's still pending
  const min = stages.reduce<TouristStage>(
    (acc, s) => (STAGE_ORDER.indexOf(s) < STAGE_ORDER.indexOf(acc) ? s : acc),
    "planted"
  );
  return TOURIST_STAGE_LABELS[min];
};

const getGroupStatusColor = (status: string): string => {
  if (status === "Planted") return "bg-accent/10 text-accent border-accent/20";
  if (status === "Partially Planted") return "bg-blue-500/10 text-blue-700 border-blue-500/20";
  if (status === TOURIST_STAGE_LABELS.waiting) return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
  if (status === TOURIST_STAGE_LABELS.assigned) return "bg-orange-500/10 text-orange-700 border-orange-500/20";
  if (status === TOURIST_STAGE_LABELS.scheduled) return "bg-cyan-500/10 text-cyan-700 border-cyan-500/20";
  return "bg-muted text-muted-foreground";
};

const getAirportCity = (code: string) => {
  const airport = airports.find(a => a.code === code);
  return airport ? airport.city : code;
};

export const MyTrees = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subFeatures: touristMyTreesFeatures } = useTouristModulePermissions("tourist_my_trees");
  const showIndividualTreesAccordion =
    touristMyTreesFeatures["view_individual_trees_accordion"] !== false;
  const [trees, setTrees] = useState<Tree[]>([]);
  const [trips, setTrips] = useState<Record<string, Trip>>({});
  const [transitionDates, setTransitionDates] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isTripSheetOpen, setIsTripSheetOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewCert, setPreviewCert] = useState<CertificatePreviewFile | null>(null);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);
  const [expandedContribs, setExpandedContribs] = useState<Set<string>>(new Set());
  const [contribSheet, setContribSheet] = useState<{ cid: string; trees: Tree[] } | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTrees();
  }, []);

  const fetchTrees = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view your trees.",
          variant: "destructive",
        });
        navigate("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("trees")
        .select("*, organizations:owner_org_id(name)")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrees(data || []);

      const treeIds = data?.map(t => t.id) || [];
      const tripIds = [...new Set(data?.map(t => t.trip_id).filter(Boolean) || [])];

      // Fetch trips and latest transition dates in parallel
      const [tripsResult, transitionsResult] = await Promise.all([
        tripIds.length > 0
          ? supabase.from("trips").select("*").in("id", tripIds)
          : Promise.resolve({ data: null }),
        treeIds.length > 0
          ? supabase
              .from("tree_status_transitions")
              .select("tree_id, to_status, created_at")
              .in("tree_id", treeIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: null }),
      ]);

      if (tripsResult.data) {
        const tripsMap = tripsResult.data.reduce((acc, trip) => {
          acc[trip.id] = trip;
          return acc;
        }, {} as Record<string, Trip>);
        setTrips(tripsMap);
      }

      // Build map of tree_id -> latest transition date (for current planting_status)
      if (transitionsResult.data) {
        const dateMap: Record<string, string> = {};
        for (const t of transitionsResult.data) {
          // Find the tree's current planting_status
          const tree = data?.find(tr => tr.id === t.tree_id);
          if (tree && t.to_status === tree.planting_status && !dateMap[t.tree_id]) {
            dateMap[t.tree_id] = t.created_at;
          }
        }
        // For trees without transitions, fall back to updated_at or created_at
        for (const tree of data || []) {
          if (!dateMap[tree.id]) {
            dateMap[tree.id] = tree.updated_at || tree.created_at;
          }
        }
        setTransitionDates(dateMap);
      }
    } catch (error) {
      console.error("Error fetching trees:", error);
      toast({
        title: "Error",
        description: "Failed to load your trees. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Group trees by trip_id
  const treeGroups = useMemo<TreeGroup[]>(() => {
    const groupMap = new Map<string, Tree[]>();
    
    trees.forEach(tree => {
      const key = tree.trip_id || "__direct__";
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(tree);
    });

    const groups: TreeGroup[] = [];
    
    // Trip groups first (sorted by latest date)
    const tripKeys = [...groupMap.keys()].filter(k => k !== "__direct__");
    tripKeys.sort((a, b) => {
      const aDate = groupMap.get(a)![0].created_at;
      const bDate = groupMap.get(b)![0].created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    tripKeys.forEach(tripId => {
      const groupTrees = groupMap.get(tripId)!;
      groups.push({
        key: tripId,
        tripId,
        trip: trips[tripId] || null,
        trees: groupTrees,
        totalTrees: groupTrees.reduce((sum, t) => sum + t.num_trees, 0),
        totalAmount: groupTrees.reduce((sum, t) => sum + Number(t.amount_paid), 0),
        latestDate: groupTrees[groupTrees.length - 1].created_at,
      });
    });

    // Direct purchases at the end
    if (groupMap.has("__direct__")) {
      const directTrees = groupMap.get("__direct__")!;
      groups.push({
        key: "__direct__",
        tripId: null,
        trip: null,
        trees: directTrees,
        totalTrees: directTrees.reduce((sum, t) => sum + t.num_trees, 0),
        totalAmount: directTrees.reduce((sum, t) => sum + Number(t.amount_paid), 0),
        latestDate: directTrees[0].created_at,
      });
    }

    return groups;
  }, [trees, trips]);

  const totalPages = Math.ceil(treeGroups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedGroups = treeGroups.slice(startIndex, startIndex + itemsPerPage);

  const calculateTotals = () => {
    const plantedTrees = trees.reduce((sum, tree) => sum + tree.num_trees, 0);
    const tripsList = Object.values(trips);
    const totalCO2ToOffset = tripsList.reduce((sum, trip) => sum + Number(trip.total_co2 || 0), 0);
    const co2AlreadyOffset = plantedTrees * 22;
    const treesNeeded = tripsList.reduce((sum, trip) => sum + (trip.trees_needed || 0), 0);
    const treesRemaining = Math.max(0, treesNeeded - plantedTrees);
    const co2Remaining = Math.max(0, totalCO2ToOffset - co2AlreadyOffset);
    return { plantedTrees, totalCO2ToOffset, co2AlreadyOffset, treesNeeded, treesRemaining, co2Remaining };
  };

  const { plantedTrees, totalCO2ToOffset, co2AlreadyOffset, treesNeeded, treesRemaining, co2Remaining } = calculateTotals();

  const handleViewCertificate = async () => {
    setIsGeneratingCert(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: userProfile } = await supabase
        .from("users")
        .select("first_name, last_name, otot_id")
        .eq("user_id", userData.user.id)
        .single();

      const userName = userProfile
        ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Traveler'
        : 'Traveler';

      const blob = await generateTreeCertificate({
        userName,
        userId: userData.user.id,
        numTrees: plantedTrees,
        co2Offset: co2AlreadyOffset,
        ototId: userProfile?.otot_id || userData.user.id.substring(0, 8),
        location: 'Mau Forest Complex, Kenya',
      });

      setPreviewCert({
        blob,
        name: `tree-planting-certificate-${plantedTrees}-trees.pdf`,
      });
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate certificate. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingCert(false);
    }
  };

  const handleOffsetEmissions = (trip: Trip) => {
    const travelClassMap: Record<Database["public"]["Enums"]["travel_class_type"], string> = {
      "Economy": "economy", "Premium Economy": "premium_economy", "Business": "business", "First": "first"
    };
    const accommodationMap: Record<Database["public"]["Enums"]["accommodation_type"], string> = {
      "None": "none", "Hotel": "hotel", "Rental": "rental", "Cruise Ship": "cruise", "Service Apartment": "service_apartment"
    };
    navigate("/tree-purchase", {
      state: {
        treesNeeded: trip.trees_needed,
        totalCO2: trip.total_co2,
        tripId: trip.id,
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your trees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl px-4 sm:px-6 py-4 sm:py-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2">My Trees</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Track your reforestation journey and environmental impact
              </p>
            </div>
            <div className="flex gap-2">
              {plantedTrees > 0 && (
                <Button variant="outline" size="sm" className="sm:size-default" onClick={handleViewCertificate} disabled={isGeneratingCert}>
                  <Award className="h-4 w-4 mr-2" />
                  {isGeneratingCert ? 'Generating...' : 'View Certificate'}
                </Button>
              )}
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <TreePine className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Trees Overview</p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-background/60 min-w-0">
                    <p className="text-lg sm:text-2xl font-bold text-foreground truncate">{treesNeeded}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Needed</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-background/60 min-w-0">
                    <p className="text-lg sm:text-2xl font-bold text-green-600 truncate">{plantedTrees}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Planted</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-background/60 min-w-0">
                    <p className="text-lg sm:text-2xl font-bold text-orange-500 truncate">{treesRemaining}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Remaining</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{treesNeeded > 0 ? Math.min(100, Math.round((plantedTrees / treesNeeded) * 100)) : 0}% planted</span>
                    <span>{plantedTrees} / {treesNeeded}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${treesNeeded > 0 ? Math.min(100, (plantedTrees / treesNeeded) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-accent/5 border-accent/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Cloud className="h-5 w-5 text-accent" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">CO₂ Impact</p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-background/60 min-w-0">
                    <p className="text-base sm:text-2xl font-bold text-foreground truncate">{totalCO2ToOffset.toFixed(0)}<span className="text-[10px] sm:text-sm font-normal ml-0.5">kg</span></p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">To Offset</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-background/60 min-w-0">
                    <p className="text-base sm:text-2xl font-bold text-green-600 truncate">{co2AlreadyOffset}<span className="text-[10px] sm:text-sm font-normal ml-0.5">kg</span></p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Offset</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-background/60 min-w-0">
                    <p className="text-base sm:text-2xl font-bold text-orange-500 truncate">{co2Remaining.toFixed(0)}<span className="text-[10px] sm:text-sm font-normal ml-0.5">kg</span></p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Remaining</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{totalCO2ToOffset > 0 ? Math.min(100, Math.round((co2AlreadyOffset / totalCO2ToOffset) * 100)) : 0}% offset</span>
                    <span>{co2AlreadyOffset} / {totalCO2ToOffset.toFixed(0)} kg</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${totalCO2ToOffset > 0 ? Math.min(100, (co2AlreadyOffset / totalCO2ToOffset) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Empty State */}
        {trees.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Sprout className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No trees planted yet</h3>
              <p className="text-muted-foreground mb-6">
                Start your reforestation journey by planting your first tree!
              </p>
              <Button onClick={() => navigate("/carbon-calculator")}>
                <Plus className="h-4 w-4 mr-2" />
                Plant Your First Tree
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Grouped Trees Accordion */}
            <Card>
              <CardContent className="p-0">
                <Accordion type="multiple" className="w-full">
                  {paginatedGroups.map((group, groupIndex) => {
                    const groupStatus = getGroupStatus(group.trees);
                    const isTrip = group.tripId !== null;
                    const trip = group.trip;

                    return (
                      <AccordionItem key={group.key} value={group.key} className="border-b last:border-b-0">
                        <div className="px-4 py-4 hover:bg-muted/30">
                          {/* Card Header - Trip Info */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${isTrip ? 'bg-primary/10' : 'bg-muted'}`}>
                                {isTrip ? <Plane className="h-4 w-4 text-primary" /> : <ShoppingBag className="h-4 w-4 text-muted-foreground" />}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground text-sm">
                                  {isTrip && trip
                                    ? trip.friendly_trip_id || `Trip ${startIndex + groupIndex + 1}`
                                    : "Direct Purchase"}
                                </p>
                                {isTrip && trip && (
                                  <p className="text-xs text-muted-foreground">
                                    {getAirportCity(trip.origin_airport)} → {getAirportCity(trip.destination_airport)}
                                    {trip.is_return ? ' (Return)' : ' (One Way)'}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(group.latestDate), "d MMM yyyy")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isTrip && trip && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTrip(trip);
                                    setIsTripSheetOpen(true);
                                  }}
                                  className="text-primary hover:text-primary/80 p-1"
                                  title="View trip details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Stats Row */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                            {isTrip && trip ? (
                              <>
                                <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                                  <p className="text-xs text-muted-foreground">Trees Needed</p>
                                  <p className="text-sm font-bold text-foreground">{trip.trees_needed}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                                  <p className="text-xs text-muted-foreground">Trees Planted</p>
                                  <p className="text-sm font-bold text-green-600">{group.totalTrees}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                                  <p className="text-xs text-muted-foreground">Remaining</p>
                                  <p className="text-sm font-bold text-orange-500">{Math.max(0, trip.trees_needed - group.totalTrees)}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                                  <p className="text-xs text-muted-foreground">Contribution</p>
                                  <p className="text-sm font-bold text-foreground">${group.totalAmount.toFixed(2)}</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                                  <p className="text-xs text-muted-foreground">Trees Planted</p>
                                  <p className="text-sm font-bold text-green-600">{group.totalTrees}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                                  <p className="text-xs text-muted-foreground">Contribution</p>
                                  <p className="text-sm font-bold text-foreground">${group.totalAmount.toFixed(2)}</p>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Progress Bar */}
                          {isTrip && trip && (
                            <div className="mb-3">
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>{trip.trees_needed > 0 ? Math.min(100, Math.round((group.totalTrees / trip.trees_needed) * 100)) : 0}% offset</span>
                                <span>{group.totalTrees} / {trip.trees_needed} trees</span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary transition-all duration-500"
                                  style={{ width: `${trip.trees_needed > 0 ? Math.min(100, (group.totalTrees / trip.trees_needed) * 100) : 0}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Offset Button */}
                          {isTrip && trip && (
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOffsetEmissions(trip);
                                }}
                                disabled={group.totalTrees >= trip.trees_needed}
                              >
                                
                                {group.totalTrees >= trip.trees_needed ? 'Planted All Trees' : '+ Plant More Trees'}
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Contributions layer - inset panel */}
                        {showIndividualTreesAccordion && (() => {
                          // Group this trip's trees by contribution_id
                          const contribMap = new Map<string, Tree[]>();
                          group.trees.forEach(t => {
                            const key = t.contribution_id || t.id;
                            if (!contribMap.has(key)) contribMap.set(key, []);
                            contribMap.get(key)!.push(t);
                          });
                          const contribGroups = [...contribMap.entries()]
                            .map(([cid, trs]) => {
                              const dates = trs.map(t => new Date(t.created_at).getTime());
                              const statusDates = trs.map(t =>
                                new Date(transitionDates[t.id] || t.created_at).getTime()
                              );
                              return {
                                cid,
                                trees: trs,
                                date: new Date(Math.min(...dates)).toISOString(),
                                statusDate: new Date(Math.max(...statusDates)).toISOString(),
                                trees_planted: trs.reduce((s, t) => s + t.num_trees, 0),
                                amount: trs.reduce((s, t) => s + Number(t.amount_paid), 0),
                                status: getGroupStatus(trs),
                                paymentMethod: trs[0]?.payment_method || 'Card',
                              };
                            })
                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                          return (
                            <div className="mx-4 mb-4 mt-1 rounded-xl border border-border/60 bg-muted/20 overflow-hidden">
                              <div className="px-4 py-2.5 flex items-center gap-2 border-b border-border/40">
                                <TreePine className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs font-medium text-muted-foreground">
                                  {contribGroups.length} {contribGroups.length === 1 ? 'contribution' : 'contributions'} in this trip
                                </span>
                              </div>
                              <div className="divide-y divide-border/40">
                                {contribGroups.map((cg, cgIdx) => (
                                  <div
                                    key={`${group.key}-${cg.cid}`}
                                    className="px-3 sm:px-4 py-3 hover:bg-muted/30 transition-colors"
                                  >
                                    <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_minmax(0,1.4fr)_auto_auto_auto_auto_auto] items-center gap-x-3 gap-y-1">
                                      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{cgIdx + 1}</span>
                                      <span className="font-mono text-[11px] sm:text-xs text-foreground truncate" title={cg.cid}>{cg.cid}</span>
                                      <span className="hidden sm:inline text-xs tabular-nums text-muted-foreground whitespace-nowrap">{format(new Date(cg.date), "d MMM yyyy")}</span>
                                      <span className="hidden sm:flex items-center gap-1 text-xs tabular-nums text-foreground justify-end">
                                        <Leaf className="h-3 w-3 text-primary/70" />{cg.trees_planted}
                                      </span>
                                      <span className="hidden sm:inline text-xs font-semibold tabular-nums text-foreground text-right whitespace-nowrap">${cg.amount.toFixed(2)}</span>
                                      <Badge className={`${getGroupStatusColor(cg.status)} text-[10px] sm:text-[11px] justify-self-end whitespace-nowrap`}>{cg.status}</Badge>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 justify-self-end" onClick={(e) => e.stopPropagation()}>
                                            <MoreVertical className="h-3.5 w-3.5" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setContribSheet({ cid: cg.cid, trees: cg.trees }); }}>
                                            <Eye className="h-3.5 w-3.5 mr-2" /> View tree details
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                      <div className="col-span-3 sm:hidden flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
                                        <span>{format(new Date(cg.date), "d MMM yyyy")}</span>
                                        <span className="inline-flex items-center gap-1"><Leaf className="h-3 w-3 text-primary/70" />{cg.trees_planted} trees</span>
                                        <span className="font-semibold text-foreground">${cg.amount.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                            </div>
                          );
                        })()}

                      </AccordionItem>
                    );
                  })}
                </Accordion>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 p-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      ←
                    </Button>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={currentPage}
                        onChange={(e) => {
                          const page = parseInt(e.target.value);
                          if (page >= 1 && page <= totalPages) {
                            setCurrentPage(page);
                          }
                        }}
                        className="w-16 text-center"
                      />
                      <span className="text-sm text-muted-foreground">/ {totalPages}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      →
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Tree Detail Panel */}
        {selectedTree && (
          <TreeDetailPanel
            tree={selectedTree}
            onClose={() => setSelectedTree(null)}
          />
        )}

        {/* Trip Details Sheet */}
        <TripDetailsSheet
          trip={selectedTrip}
          isOpen={isTripSheetOpen}
          onClose={() => {
            setIsTripSheetOpen(false);
            setSelectedTrip(null);
          }}
        />

        <ContributionTreesSheet
          isOpen={!!contribSheet}
          onClose={() => setContribSheet(null)}
          contributionId={contribSheet?.cid || null}
          trees={contribSheet?.trees || []}
          transitionDates={transitionDates}
          onTrack={(tree) => setSelectedTree(tree)}
        />

        {/* Certificate Preview Dialog */}
        <CertificatePreviewDialog
          previewCert={previewCert}
          onClose={() => setPreviewCert(null)}
          onDownload={(cert) => downloadCertificate(cert.blob, cert.name)}
        />
      </div>
    </div>
  );
};
