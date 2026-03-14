import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Leaf, Plus, Sprout, ExternalLink, Eye, TreePine, Cloud, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TreeDetailPanel } from "@/components/trees/TreeDetailPanel";
import { TripDetailsSheet } from "@/components/trees/TripDetailsSheet";
import { Database } from "@/integrations/supabase/types";
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

export const MyTrees = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trees, setTrees] = useState<Tree[]>([]);
  const [trips, setTrips] = useState<Record<string, Trip>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isTripSheetOpen, setIsTripSheetOpen] = useState(false);
  const [mapboxToken, setMapboxToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTrees();
    checkMapboxToken();
  }, []);

  const checkMapboxToken = async () => {
    // In production, this would come from Supabase edge function secrets
    // For now, we'll show an input for the user to enter their token
    const storedToken = localStorage.getItem("mapbox_token");
    if (storedToken) {
      setMapboxToken(storedToken);
    } else {
      setShowTokenInput(true);
    }
  };

  const handleSaveMapboxToken = () => {
    if (mapboxToken) {
      localStorage.setItem("mapbox_token", mapboxToken);
      setShowTokenInput(false);
      toast({
        title: "Token Saved",
        description: "Mapbox token has been saved successfully.",
      });
    }
  };

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
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrees(data || []);

      // Fetch associated trips with friendly_trip_id
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

  // Pagination
  const totalPages = Math.ceil(trees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTrees = trees.slice(startIndex, endIndex);

  const calculateTotals = () => {
    const totalTrees = trees.reduce((sum, tree) => sum + tree.num_trees, 0);
    // Approximate CO2 offset: 22kg per tree per year
    const totalCO2 = totalTrees * 22;
    return { totalTrees, totalCO2 };
  };

  const { totalTrees, totalCO2 } = calculateTotals();

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
        {/* Mapbox Token Input */}
        {showTokenInput && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Mapbox Configuration Required</CardTitle>
              <CardDescription>
                To view tree locations on the map, please enter your Mapbox public token.
                Get your token from{" "}
                <a
                  href="https://mapbox.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  mapbox.com
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Input
                placeholder="Enter Mapbox public token (pk.xxx)"
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSaveMapboxToken}>Save Token</Button>
            </CardContent>
          </Card>
        )}

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
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <Leaf className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Trees Planted</p>
                    <p className="text-4xl font-bold text-foreground">{totalTrees}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-accent/5 border-accent/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center">
                    <Leaf className="h-8 w-8 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total CO₂ Offset (Annually)</p>
                    <p className="text-4xl font-bold text-foreground">{totalCO2} kg</p>
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
            {/* Interactive Map */}
            {!showTokenInput && mapboxToken && (
              <div className="mb-8">
                <TreeMap
                  trees={trees}
                  mapboxToken={mapboxToken}
                  onTreeClick={setSelectedTree}
                />
              </div>
            )}

            {/* Trees Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-16">No.</TableHead>
                        <TableHead className="text-left">Trip ID</TableHead>
                        <TableHead className="text-left">TreeTracker</TableHead>
                        <TableHead className="text-left">County</TableHead>
                        <TableHead className="text-left">Planter</TableHead>
                        <TableHead className="text-left">Carer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Trip</TableHead>
                        <TableHead className="text-right">TreeChain</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTrees.map((tree, index) => {
                        // Demo data for counties and carers
                        const counties = ['Narok', 'Kakamega', 'Bungoma', 'Kisumu', 'Nairobi'];
                        const carers = ['Agnes Wanjiru', 'Peter Otieno', 'Mary Wambui', 'James Kipchoge', 'Grace Akinyi'];
                        const countyIndex = index % counties.length;
                        
                        return (
                          <TableRow key={tree.id}>
                            <TableCell className="font-medium">
                              {startIndex + index + 1}
                            </TableCell>
                            <TableCell className="text-left">
                              {tree.trip_id && trips[tree.trip_id] ? trips[tree.trip_id].friendly_trip_id || "-" : "-"}
                            </TableCell>
                            <TableCell className="text-left">
                              <button
                                onClick={() => setSelectedTree(tree)}
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                {tree.otot_id}
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            </TableCell>
                            <TableCell className="text-left">{counties[countyIndex]}</TableCell>
                            <TableCell className="text-left">
                              {counties[countyIndex] === 'Narok' 
                                ? 'Mara Ecolodge' 
                                : ['Tree for Kenya', 'Tree Planting Society', 'RODI Kenya', 'Emaua'][countyIndex % 4]
                              }
                            </TableCell>
                            <TableCell className="text-left">{carers[countyIndex]}</TableCell>
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
                            <TableCell>
                              {tree.trip_id && trips[tree.trip_id] ? (
                                <button
                                  onClick={() => {
                                    setSelectedTrip(trips[tree.trip_id]);
                                    setIsTripSheetOpen(true);
                                  }}
                                  className="text-primary hover:text-primary/80"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <button className="text-primary hover:underline text-sm">
                                view
                              </button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      →
                    </Button>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
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
