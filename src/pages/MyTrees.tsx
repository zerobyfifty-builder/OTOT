import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Sprout, ExternalLink, Eye, TreePine, Cloud, ChevronDown, Plane, ShoppingBag, MapPin } from "lucide-react";
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

const SOURCE_COLORS: Record<PurchaseType, string> = {
  "One-time": "bg-blue-500/10 text-blue-700 border-blue-500/20",
  "Subscription": "bg-green-500/10 text-green-700 border-green-500/20",
};

const getGroupStatus = (trees: Tree[]): string => {
  const statuses = trees.map(t => t.status);
  if (statuses.every(s => s === "Planted")) return "Planted";
  if (statuses.some(s => s === "Planted")) return "Partially Planted";
  if (statuses.every(s => s === "Waiting to be Assigned")) return "Waiting to be Assigned";
  return statuses[0] || "Unknown";
};

const getGroupStatusColor = (status: string): string => {
  if (status === "Planted") return "bg-accent/10 text-accent border-accent/20";
  if (status === "Partially Planted") return "bg-blue-500/10 text-blue-700 border-blue-500/20";
  if (status === "Waiting to be Assigned") return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
  return "bg-muted text-muted-foreground";
};

export const MyTrees = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trees, setTrees] = useState<Tree[]>([]);
  const [trips, setTrips] = useState<Record<string, Trip>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isTripSheetOpen, setIsTripSheetOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
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
        .select("*, organizations:stakeholder_org_id(name)")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrees(data || []);

      const tripIds = [...new Set(data?.map(t => t.trip_id).filter(Boolean) || [])];
      if (tripIds.length > 0) {
        const { data: tripsData } = await supabase
          .from("trips")
          .select("*")
          .in("id", tripIds);
        
        if (tripsData) {
          const tripsMap = tripsData.reduce((acc, trip) => {
            acc[trip.id] = trip;
            return acc;
          }, {} as Record<string, Trip>);
          setTrips(tripsMap);
        }
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
        latestDate: groupTrees[0].created_at,
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
      <div className="container max-w-7xl py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">My Trees</h1>
              <p className="text-muted-foreground">
                Track your reforestation journey and environmental impact
              </p>
            </div>
            <Button onClick={() => navigate("/carbon-calculator")}>
              <Plus className="h-4 w-4 mr-2" />
              Plant More Trees
            </Button>
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
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-background/60">
                    <p className="text-2xl font-bold text-foreground">{treesNeeded}</p>
                    <p className="text-xs text-muted-foreground mt-1">Needed</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background/60">
                    <p className="text-2xl font-bold text-green-600">{plantedTrees}</p>
                    <p className="text-xs text-muted-foreground mt-1">Planted</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background/60">
                    <p className="text-2xl font-bold text-orange-500">{treesRemaining}</p>
                    <p className="text-xs text-muted-foreground mt-1">Remaining</p>
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
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-background/60">
                    <p className="text-2xl font-bold text-foreground">{totalCO2ToOffset.toFixed(0)}<span className="text-sm font-normal ml-1">kg</span></p>
                    <p className="text-xs text-muted-foreground mt-1">To Offset</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background/60">
                    <p className="text-2xl font-bold text-green-600">{co2AlreadyOffset}<span className="text-sm font-normal ml-1">kg</span></p>
                    <p className="text-xs text-muted-foreground mt-1">Offset</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background/60">
                    <p className="text-2xl font-bold text-orange-500">{co2Remaining.toFixed(0)}<span className="text-sm font-normal ml-1">kg</span></p>
                    <p className="text-xs text-muted-foreground mt-1">Remaining</p>
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
                        <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-muted/30">
                          <div className="flex items-center justify-between w-full mr-4">
                            <div className="flex items-center gap-3">
                              <div className={`h-9 w-9 rounded-full flex items-center justify-center ${isTrip ? 'bg-primary/10' : 'bg-muted'}`}>
                                {isTrip ? <Plane className="h-4 w-4 text-primary" /> : <ShoppingBag className="h-4 w-4 text-muted-foreground" />}
                              </div>
                              <div className="text-left">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground text-sm">
                                    {isTrip && trip
                                      ? trip.friendly_trip_id || `Trip ${startIndex + groupIndex + 1}`
                                      : "Direct Purchase"}
                                  </span>
                                  {isTrip && trip && (
                                    <span className="text-xs text-muted-foreground">
                                      {trip.origin_airport} → {trip.destination_airport}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(group.latestDate), "d MMM yyyy")}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-foreground">{group.totalTrees} {group.totalTrees === 1 ? 'tree' : 'trees'}</p>
                                <p className="text-xs text-muted-foreground">${group.totalAmount.toFixed(2)}</p>
                              </div>
                              <Badge className={getGroupStatusColor(groupStatus)}>
                                {groupStatus === "Planted" ? "gifted" : groupStatus}
                              </Badge>
                              {isTrip && trip && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTrip(trip);
                                    setIsTripSheetOpen(true);
                                  }}
                                  className="text-primary hover:text-primary/80"
                                  title="View trip details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/30">
                                  <TableHead className="w-12">No.</TableHead>
                                  <TableHead className="text-left">TreeTracker</TableHead>
                                  <TableHead className="text-left">Location</TableHead>
                                  <TableHead className="text-left">County</TableHead>
                                  <TableHead className="text-left">Planted By</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Source</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.trees.map((tree, index) => (
                                  <TableRow key={tree.id}>
                                    <TableCell className="font-medium text-muted-foreground">
                                      {index + 1}
                                    </TableCell>
                                    <TableCell className="text-left">
                                      <button
                                        onClick={() => setSelectedTree(tree)}
                                        className="text-primary hover:text-primary/80 flex items-center justify-center"
                                        title={`View ${tree.otot_id}`}
                                      >
                                        <MapPin className="h-4 w-4" />
                                      </button>
                                    </TableCell>
                                    <TableCell className="text-left">{(tree as any).organizations?.name || 'Mau Forest Complex'}</TableCell>
                                    <TableCell className="text-left">{tree.location_name || 'Nakuru'}</TableCell>
                                    <TableCell className="text-left">{(tree as any).organizations?.name || 'Kenya Forest Service'}</TableCell>
                                    <TableCell>
                                      <Badge className={STATUS_COLORS[tree.status]}>
                                        {tree.status === "Planted" ? "gifted" : tree.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {format(new Date(tree.created_at), "d/M/yyyy")}
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={SOURCE_COLORS[tree.purchase_type]}>
                                        {tree.purchase_type}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </AccordionContent>
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
      </div>
    </div>
  );
};
