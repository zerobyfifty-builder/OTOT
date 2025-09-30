import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Leaf, MapPin, Filter, Search, Plus, Sprout } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TreeDetailsModal } from "@/components/trees/TreeDetailsModal";
import { Database } from "@/integrations/supabase/types";

type Tree = Database["public"]["Tables"]["trees"]["Row"];
type TreeStatus = Database["public"]["Enums"]["tree_status_type"];

const STATUS_COLORS: Record<TreeStatus, string> = {
  "Waiting to be Assigned": "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  "Assigned": "bg-orange-500/10 text-orange-700 border-orange-500/20",
  "Sapling Planted": "bg-green-500/10 text-green-700 border-green-500/20",
  "Being Mapped": "bg-blue-500/10 text-blue-700 border-blue-500/20",
  "Planted": "bg-accent/10 text-accent border-accent/20",
};

export const MyTrees = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trees, setTrees] = useState<Tree[]>([]);
  const [filteredTrees, setFilteredTrees] = useState<Tree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [mapboxToken, setMapboxToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);

  useEffect(() => {
    fetchTrees();
    checkMapboxToken();
  }, []);

  useEffect(() => {
    filterAndSortTrees();
  }, [trees, searchQuery, statusFilter, sortBy]);

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

  const filterAndSortTrees = () => {
    let filtered = [...trees];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(tree => tree.status === statusFilter);
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(tree =>
        tree.location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tree.otot_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "location":
          return (a.location_name || "").localeCompare(b.location_name || "");
        case "trees":
          return b.num_trees - a.num_trees;
        default:
          return 0;
      }
    });

    setFilteredTrees(filtered);
  };

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
            {/* Filters and Search */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by location or OTOT ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Waiting to be Assigned">Waiting to be Assigned</SelectItem>
                      <SelectItem value="Assigned">Assigned</SelectItem>
                      <SelectItem value="Sapling Planted">Sapling Planted</SelectItem>
                      <SelectItem value="Being Mapped">Being Mapped</SelectItem>
                      <SelectItem value="Planted">Planted</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date (Newest)</SelectItem>
                      <SelectItem value="location">Location</SelectItem>
                      <SelectItem value="trees">Number of Trees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                            Date
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                            No of Trees
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                            Location
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTrees.map((tree) => (
                          <tr key={tree.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-6 py-4 text-sm">
                              {format(new Date(tree.created_at), "dd MMM yyyy")}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 font-medium">
                                <Leaf className="h-4 w-4 text-primary" />
                                {tree.num_trees} {tree.num_trees === 1 ? "tree" : "trees"}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {tree.location_name ? (
                                <button
                                  onClick={() => setSelectedTree(tree)}
                                  className="flex items-center gap-2 text-primary hover:underline"
                                >
                                  <MapPin className="h-4 w-4" />
                                  {tree.location_name}
                                </button>
                              ) : (
                                <span className="text-muted-foreground">Pending Assignment</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {tree.status === "Planted" && tree.latitude && tree.longitude ? (
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedTree(tree)}
                                  className="bg-accent hover:bg-accent/90"
                                >
                                  <MapPin className="h-3 w-3 mr-1" />
                                  View Location
                                </Button>
                              ) : (
                                <Badge className={STATUS_COLORS[tree.status]}>
                                  {tree.status}
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {filteredTrees.map((tree) => (
                <Card key={tree.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Leaf className="h-5 w-5 text-primary" />
                          {tree.num_trees} {tree.num_trees === 1 ? "tree" : "trees"}
                        </CardTitle>
                        <CardDescription>
                          {format(new Date(tree.created_at), "dd MMM yyyy")}
                        </CardDescription>
                      </div>
                      <Badge className={STATUS_COLORS[tree.status]}>
                        {tree.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {tree.location_name ? (
                      <button
                        onClick={() => setSelectedTree(tree)}
                        className="flex items-center gap-2 text-primary hover:underline w-full text-left"
                      >
                        <MapPin className="h-4 w-4" />
                        {tree.location_name}
                      </button>
                    ) : (
                      <p className="text-sm text-muted-foreground">Location: Pending Assignment</p>
                    )}
                    {tree.status === "Planted" && tree.latitude && tree.longitude && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedTree(tree)}
                        className="w-full"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        View Location
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Tree Details Modal */}
        {selectedTree && (
          <TreeDetailsModal
            isOpen={!!selectedTree}
            onClose={() => setSelectedTree(null)}
            tree={selectedTree}
            mapboxToken={mapboxToken}
          />
        )}
      </div>
    </div>
  );
};
