import { useMemo, useState, useCallback } from "react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, TreePine, DollarSign, Clock, CheckCircle2, Plane, ShoppingBag, Layers, CheckCheck, Eye } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

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
  const [viewSheet, setViewSheet] = useState<TreeGroup | null>(null);
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
                    <div className="flex items-center">
                      <AccordionTrigger className="px-3 sm:px-4 py-3 sm:py-4 hover:no-underline hover:bg-muted/30 flex-1 min-w-0">
                        {/* Mobile: stacked layout, Desktop: single row */}
                        <div className="flex flex-col sm:flex-row sm:items-center w-full mr-2 sm:mr-4 gap-2 sm:gap-0">
                          {/* Row 1 (mobile) / Left section (desktop): Icon + info */}
                          <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                            <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center shrink-0 ${isTrip ? 'bg-primary/10' : 'bg-muted'}`}>
                              {isTrip ? <Plane className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" /> : <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />}
                            </div>
                            <div className="text-left min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="font-semibold text-foreground text-xs sm:text-sm whitespace-nowrap">
                                  {isTrip && trip ? trip.friendly_trip_id || 'Trip' : "Direct"}
                                </span>
                                <span className="text-xs text-muted-foreground hidden xs:inline">•</span>
                                <span className="text-xs sm:text-sm text-foreground truncate">
                                  {touristName}{touristCountry ? ` (${touristCountry})` : ''}
                                </span>
                              </div>
                              <p className="text-[11px] sm:text-xs text-muted-foreground">
                                {format(new Date(group.earliestDate), "d MMM yyyy")}
                              </p>
                            </div>
                          </div>

                          {/* Row 2 (mobile) / Right section (desktop): progress, trees, badge */}
                          <div className="flex items-center gap-3 sm:gap-4 pl-11 sm:pl-0 sm:shrink-0">
                            {/* Progress bar */}
                            <div className="flex items-center gap-1.5 w-[90px] sm:w-[120px] shrink-0">
                              <div className="flex-1">
                                <div className="h-1.5 sm:h-2 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                                    style={{ width: `${group.totalTrees > 0 ? Math.min(100, (plantedInGroup / group.totalTrees) * 100) : 0}%` }}
                                  />
                                </div>
                              </div>
                              <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                                {plantedInGroup}/{group.totalTrees}
                              </span>
                            </div>

                            {/* Trees count + amount */}
                            <div className="text-right shrink-0 w-[70px] sm:w-[80px]">
                              <p className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">{group.totalTrees} trees</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">${group.totalAmount.toFixed(2)}</p>
                            </div>

                            {/* Status badge */}
                            <div className="shrink-0">
                              <Badge className={`text-[10px] sm:text-xs whitespace-nowrap ${getGroupStatusColor(groupStatus)}`}>
                                {getGroupStatusLabel(groupStatus)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9 mr-1 sm:mr-2 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewSheet(group);
                        }}
                        title="View trip details"
                      >
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
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

      {/* Trip Details Sheet */}
      <Sheet open={!!viewSheet} onOpenChange={(open) => !open && setViewSheet(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {viewSheet && (() => {
            const trip = viewSheet.trip;
            const userInfo = users[viewSheet.userId];
            const touristName = userInfo
              ? `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || 'Unknown'
              : 'Unknown';
            const touristCountry = userInfo?.country || '';

            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Plane className="h-5 w-5 text-primary" />
                    {trip?.friendly_trip_id || 'Direct Purchase'} Details
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Tourist Info */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tourist</h3>
                    <div className="rounded-lg border bg-card p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Name</span>
                        <span className="text-sm font-medium">{touristName}</span>
                      </div>
                      {touristCountry && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Country</span>
                          <span className="text-sm font-medium">{touristCountry}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Payment Date</span>
                        <span className="text-sm font-medium">{format(new Date(viewSheet.earliestDate), "d MMM yyyy")}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Order Summary */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Order Summary</h3>
                    <div className="rounded-lg border bg-card p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Trees</span>
                        <span className="text-sm font-medium">{viewSheet.totalTrees}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Amount</span>
                        <span className="text-sm font-medium">${viewSheet.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {trip && (
                    <>
                      <Separator />

                      {/* Carbon Emission Details */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Carbon Emission</h3>
                        <div className="rounded-lg border bg-card p-4 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total CO₂</span>
                            <span className="text-sm font-semibold text-foreground">{Number(trip.total_co2).toFixed(1)} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Flight CO₂</span>
                            <span className="text-sm font-medium">{Number(trip.flight_co2).toFixed(1)} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Accommodation CO₂</span>
                            <span className="text-sm font-medium">{Number(trip.accommodation_co2).toFixed(1)} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Trees Needed</span>
                            <span className="text-sm font-medium">{trip.trees_needed}</span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Flight Details */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Flight Details</h3>
                        <div className="rounded-lg border bg-card p-4 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Origin</span>
                            <span className="text-sm font-medium">{trip.origin_airport}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Destination</span>
                            <span className="text-sm font-medium">{trip.destination_airport}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Travel Class</span>
                            <span className="text-sm font-medium">{trip.travel_class}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Return Flight</span>
                            <span className="text-sm font-medium">{trip.is_return ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Travelers</span>
                            <span className="text-sm font-medium">{trip.num_travelers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Travel Date</span>
                            <span className="text-sm font-medium">{format(new Date(trip.from_date), "d MMM yyyy")}</span>
                          </div>
                          {trip.accommodation_type && trip.accommodation_type !== 'None' && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Accommodation</span>
                              <span className="text-sm font-medium">{trip.accommodation_type}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
};
