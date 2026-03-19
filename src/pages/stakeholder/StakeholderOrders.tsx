import { useMemo, useState, useCallback } from "react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, TreePine, DollarSign, Clock, CheckCircle2, Plane, ShoppingBag, Layers, CheckCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";
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

const PLANTING_STATUSES = [
  'pending_allocation',
  'allocated',
  'funds_pending',
  'funds_received',
  'planting_in_progress',
  'planted',
  'monitored',
] as const;

const STATUS_LABELS: Record<string, string> = {
  pending_allocation: 'Pending Allocation',
  allocated: 'Allocated',
  funds_pending: 'Funds Pending',
  funds_received: 'Funds Received',
  planting_in_progress: 'Planting In Progress',
  planted: 'Planted',
  monitored: 'Monitored',
};

const PLANTING_STATUS_COLORS: Record<string, string> = {
  pending_allocation: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  allocated: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  funds_pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  funds_received: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  planting_in_progress: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  planted: "bg-green-500/10 text-green-700 border-green-500/20",
  monitored: "bg-accent/10 text-accent border-accent/20",
};

interface TreeGroup {
  key: string;
  tripId: string | null;
  trip: Trip | null;
  trees: Tree[];
  totalTrees: number;
  totalAmount: number;
  earliestDate: string;
  userId: string;
}

type UserInfo = {
  first_name: string | null;
  last_name: string | null;
  country: string | null;
};

const getGroupPlantingStatus = (trees: Tree[]): string => {
  const statuses = trees.map(t => t.planting_status || 'pending_allocation');
  if (statuses.every(s => s === "planted" || s === "monitored")) return "planted";
  if (statuses.some(s => s === "planted" || s === "monitored")) return "partially_planted";
  if (statuses.every(s => s === "pending_allocation")) return "pending_allocation";
  if (statuses.some(s => s === "planting_in_progress")) return "planting_in_progress";
  if (statuses.some(s => s === "funds_received")) return "funds_received";
  return statuses[0] || "pending_allocation";
};

const getGroupStatusLabel = (status: string): string => {
  if (status === "partially_planted") return "Partially Planted";
  return STATUS_LABELS[status] || status;
};

const getGroupStatusColor = (status: string): string => {
  if (status === "partially_planted") return "bg-blue-500/10 text-blue-700 border-blue-500/20";
  return PLANTING_STATUS_COLORS[status] || "bg-muted text-muted-foreground";
};

export const StakeholderOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: orgId } = useQuery({
    queryKey: ["stakeholderOrgId", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("organization_id").eq("user_id", user!.id).single();
      return data?.organization_id;
    },
    enabled: !!user?.id,
  });

  const { data: trees, isLoading, refetch } = useQuery({
    queryKey: ["stakeholderOrders", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trees")
        .select("*")
        .eq("stakeholder_org_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tree[];
    },
    enabled: !!orgId,
  });

  const { data: tripsData } = useQuery({
    queryKey: ["stakeholderOrderTrips", trees],
    queryFn: async () => {
      const tripIds = [...new Set(trees?.map(t => t.trip_id).filter(Boolean) || [])];
      if (tripIds.length === 0) return {};
      const { data } = await supabase.from("trips").select("*").in("id", tripIds);
      return (data || []).reduce((acc, trip) => {
        acc[trip.id] = trip;
        return acc;
      }, {} as Record<string, Trip>);
    },
    enabled: !!trees && trees.length > 0,
  });

  const trips = tripsData || {};

  // Fetch user info for all unique user_ids
  const { data: usersData } = useQuery({
    queryKey: ["stakeholderOrderUsers", trees],
    queryFn: async () => {
      const userIds = [...new Set(trees?.map(t => t.user_id).filter(Boolean) || [])];
      if (userIds.length === 0) return {};
      const { data } = await supabase
        .from("users")
        .select("user_id, first_name, last_name, country")
        .in("user_id", userIds);
      return (data || []).reduce((acc, u) => {
        acc[u.user_id] = { first_name: u.first_name, last_name: u.last_name, country: u.country };
        return acc;
      }, {} as Record<string, UserInfo>);
    },
    enabled: !!trees && trees.length > 0,
  });

  const users = usersData || {};

  const { data: disbursements } = useQuery({
    queryKey: ["stakeholderDisbursementTotal", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stakeholder_disbursements")
        .select("amount, status")
        .eq("stakeholder_org_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ treeId, status }: { treeId: string; status: string }) => {
      const { error } = await supabase
        .from("trees")
        .update({ planting_status: status as any })
        .eq("id", treeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stakeholderOrders"] });
      toast.success("Planting status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const bulkUpdateStatus = useMutation({
    mutationFn: async ({ treeIds, status }: { treeIds: string[]; status: string }) => {
      const { error } = await supabase
        .from("trees")
        .update({ planting_status: status as any })
        .in("id", treeIds);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stakeholderOrders"] });
      toast.success(`Updated ${variables.treeIds.length} tree(s) to ${STATUS_LABELS[variables.status]}`);
      setBulkSelections({});
    },
    onError: () => toast.error("Failed to bulk update status"),
  });

  const [bulkSelections, setBulkSelections] = useState<Record<string, string>>({});

  const handleBulkApply = useCallback((groupKey: string, treeIds: string[]) => {
    const status = bulkSelections[groupKey];
    if (!status) {
      toast.error("Please select a status first");
      return;
    }
    bulkUpdateStatus.mutate({ treeIds, status });
  }, [bulkSelections, bulkUpdateStatus]);

  // Group trees by payment batch: same trip_id + user_id + purchase date
  const treeGroups = useMemo<TreeGroup[]>(() => {
    if (!trees) return [];

    const grouped: Record<string, Tree[]> = {};
    trees.forEach(tree => {
      const dateKey = format(new Date(tree.created_at), "yyyy-MM-dd");
      const batchKey = `${tree.trip_id || 'direct'}_${tree.user_id}_${dateKey}`;
      if (!grouped[batchKey]) grouped[batchKey] = [];
      grouped[batchKey].push(tree);
    });

    const groups: TreeGroup[] = Object.entries(grouped).map(([key, batchTrees]) => {
      const first = batchTrees[0];
      return {
        key,
        tripId: first.trip_id,
        trip: first.trip_id ? (trips[first.trip_id] || null) : null,
        trees: batchTrees,
        totalTrees: batchTrees.reduce((s, t) => s + t.num_trees, 0),
        totalAmount: batchTrees.reduce((s, t) => s + Number(t.amount_paid), 0),
        earliestDate: first.created_at,
        userId: first.user_id,
      };
    });

    groups.sort((a, b) => new Date(b.earliestDate).getTime() - new Date(a.earliestDate).getTime());
    return groups;
  }, [trees, trips]);

  const totalPages = Math.ceil(treeGroups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedGroups = treeGroups.slice(startIndex, startIndex + itemsPerPage);

  const totalTrees = trees?.reduce((s, t) => s + t.num_trees, 0) || 0;
  const fundsReceived = disbursements?.filter(d => d.status === 'received' || d.status === 'reconciled').reduce((s, d) => s + Number(d.amount), 0) || 0;
  const planted = trees?.filter(t => t.planting_status === 'planted' || t.planting_status === 'monitored').reduce((s, t) => s + t.num_trees, 0) || 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Tree Orders</h1>
          <p className="text-muted-foreground mt-1">Trees allocated to your organization from tourist purchases</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><TreePine className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Allocated</p>
                <p className="text-2xl font-bold">{formatNumber(totalTrees)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Planted</p>
                <p className="text-2xl font-bold">{formatNumber(planted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><DollarSign className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Funds Received</p>
                <p className="text-2xl font-bold">KES {formatNumber(fundsReceived)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100"><Clock className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Planting</p>
                <p className="text-2xl font-bold">{formatNumber(totalTrees - planted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : !trees?.length ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <TreePine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No trees have been allocated to your organization yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Accordion type="multiple" className="w-full">
              {paginatedGroups.map((group) => {
                const groupStatus = getGroupPlantingStatus(group.trees);
                const isTrip = group.tripId !== null;
                const trip = group.trip;
                const plantedInGroup = group.trees.filter(t => t.planting_status === 'planted' || t.planting_status === 'monitored').reduce((s, t) => s + t.num_trees, 0);
                const userInfo = users[group.userId];
                const touristName = userInfo
                  ? `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || 'Unknown'
                  : 'Unknown';
                const touristCountry = userInfo?.country || '';

                return (
                  <AccordionItem key={group.key} value={group.key} className="border-b last:border-b-0">
                    <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-muted/30">
                      <div className="flex items-center justify-between w-full mr-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center ${isTrip ? 'bg-primary/10' : 'bg-muted'}`}>
                            {isTrip ? <Plane className="h-4 w-4 text-primary" /> : <ShoppingBag className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground text-sm">
                                {isTrip && trip
                                  ? trip.friendly_trip_id || 'Trip'
                                  : "Direct Purchase"}
                              </span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-sm text-foreground">
                                {touristName}{touristCountry ? ` (${touristCountry})` : ''}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(group.earliestDate), "d MMM yyyy")}
                              {isTrip && trip && (
                                <span className="ml-2">{trip.origin_airport} → {trip.destination_airport}</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Planting progress bar */}
                          <div className="hidden sm:flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1">
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                                  style={{ width: `${group.totalTrees > 0 ? Math.min(100, (plantedInGroup / group.totalTrees) * 100) : 0}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {plantedInGroup}/{group.totalTrees}
                            </span>
                          </div>
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-foreground">{group.totalTrees} {group.totalTrees === 1 ? 'tree' : 'trees'}</p>
                            <p className="text-xs text-muted-foreground">${group.totalAmount.toFixed(2)}</p>
                          </div>
                          <Badge className={getGroupStatusColor(groupStatus)}>
                            {getGroupStatusLabel(groupStatus)}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {/* Bulk Status Update Bar */}
                      <div className="mx-4 mb-3 mt-1 flex items-center gap-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Layers className="h-4 w-4 text-primary" />
                          <span>Batch update:</span>
                        </div>
                        <Select
                          value={bulkSelections[group.key] || ""}
                          onValueChange={(value) =>
                            setBulkSelections(prev => ({ ...prev, [group.key]: value }))
                          }
                        >
                          <SelectTrigger className="w-[200px] h-9 bg-background">
                            <SelectValue placeholder="Select status for all…" />
                          </SelectTrigger>
                          <SelectContent>
                            {PLANTING_STATUSES.map(s => (
                              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="default"
                          className="h-9 gap-1.5"
                          disabled={!bulkSelections[group.key] || bulkUpdateStatus.isPending}
                          onClick={() => handleBulkApply(group.key, group.trees.map(t => t.id))}
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          Apply to all ({group.trees.length})
                        </Button>
                        <span className="text-xs text-muted-foreground ml-auto hidden md:inline">
                          Or update individually below
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead className="w-12">No.</TableHead>
                              <TableHead>OTOT ID</TableHead>
                              <TableHead>Trees</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Purchase Date</TableHead>
                              <TableHead>Planting Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.trees.map((tree, index) => (
                              <TableRow key={tree.id}>
                                <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                <TableCell className="font-mono text-sm">{tree.otot_id}</TableCell>
                                <TableCell>{tree.num_trees}</TableCell>
                                <TableCell>${Number(tree.amount_paid).toFixed(2)}</TableCell>
                                <TableCell>{format(new Date(tree.created_at), "d MMM yyyy")}</TableCell>
                                <TableCell>
                                  <Select
                                    value={tree.planting_status || 'pending_allocation'}
                                    onValueChange={(value) => updateStatus.mutate({ treeId: tree.id, status: value })}
                                  >
                                    <SelectTrigger className="w-[180px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PLANTING_STATUSES.map(s => (
                                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
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
                      if (page >= 1 && page <= totalPages) setCurrentPage(page);
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
      )}
    </div>
  );
};
