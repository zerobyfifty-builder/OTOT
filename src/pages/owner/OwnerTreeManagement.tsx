import React, { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, TreePine, MapPin, Eye, CheckCircle2, Circle, ZoomIn, Activity, TrendingUp } from "lucide-react";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Database } from "@/integrations/supabase/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Tree = Database["public"]["Tables"]["trees"]["Row"];

const STATUS_LABELS: Record<string, string> = {
  waiting_to_be_assigned: 'Waiting to be Assigned',
  assigned: 'Assigned',
  site_prepared: 'Site Prepared',
  saplings_ready: 'Saplings Ready',
  planting_scheduled: 'Planting Scheduled',
  sapling_planted: 'Sapling Planted',
  being_mapped: 'Location Mapped',
  verified: 'Verified',
  planted: 'Planted',
  dead: 'Dead',
  re_planted: 'Re-planted',
  pending_allocation: 'Waiting to be Assigned',
  allocated: 'Assigned',
  funds_pending: 'Planting Scheduled',
  funds_received: 'Saplings Ready',
  planting_in_progress: 'Sapling Planted',
  monitored: 'Verified',
};

const PLANTING_STATUS_COLORS: Record<string, string> = {
  waiting_to_be_assigned: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  assigned: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  site_prepared: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  saplings_ready: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  planting_scheduled: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
  sapling_planted: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  being_mapped: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  verified: "bg-teal-500/10 text-teal-700 border-teal-500/20",
  planted: "bg-green-500/10 text-green-700 border-green-500/20",
  dead: "bg-red-500/10 text-red-700 border-red-500/20",
  re_planted: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
};

const PLANTING_STATUSES = [
  'waiting_to_be_assigned', 'assigned', 'site_prepared', 'saplings_ready',
  'planting_scheduled', 'sapling_planted', 'being_mapped', 'verified', 'planted',
] as const;

const getPlantingStatusOrder = (status: string) => {
  const order: Record<string, number> = {
    waiting_to_be_assigned: 0, assigned: 1, site_prepared: 2, saplings_ready: 3,
    planting_scheduled: 4, sapling_planted: 5, being_mapped: 6, verified: 7,
    partially_planted: 8, planted: 9, dead: 10, re_planted: 11,
  };
  return order[status] ?? 0;
};

const SURVIVAL_COLORS: Record<string, string> = {
  'Alive': 'bg-green-500/10 text-green-700 border-green-500/20',
  'Dead': 'bg-red-500/10 text-red-700 border-red-500/20',
  'Replaced': 'bg-blue-500/10 text-blue-700 border-blue-500/20',
};

const GROWTH_STAGE_COLORS: Record<string, string> = {
  'sapling': 'bg-lime-500/10 text-lime-700 border-lime-500/20',
  'young': 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  'mature': 'bg-green-500/10 text-green-700 border-green-500/20',
};

const CONTRIBUTION_STATUS_LABELS: Record<string, string> = {
  contribution_received: "Received",
  contribution_confirmed: "Confirmed",
  funds_received: "Received by KTB",
  transferred_for_planting: "Transferred for Plantation",
  received_for_planting: "Received for Plantation",
};

const CONTRIBUTION_STATUS_COLORS: Record<string, string> = {
  contribution_received: "bg-gray-50 text-gray-700 border-gray-200",
  contribution_confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  funds_received: "bg-amber-50 text-amber-700 border-amber-200",
  transferred_for_planting: "bg-violet-50 text-violet-700 border-violet-200",
  received_for_planting: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const PAGE_SIZE = 20;

export function OwnerTreeManagement({ skipPermissionCheck = false }: { skipPermissionCheck?: boolean }) {
  const { isEnabled, isLoading: permLoading } = useModulePermissions("tree_management");
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [infoSheet, setInfoSheet] = useState<Tree | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  // Fetch all trees
  const { data: trees, isLoading } = useQuery({
    queryKey: ["treeManagementTrees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trees")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tree[];
    },
    enabled: !!user?.id,
  });

  // Fetch contribution tracking for funding status
  const { data: contributions } = useQuery({
    queryKey: ["treeManagementContributions", trees?.length],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contribution_tracking" as any)
        .select("tree_id, contribution_id, trip_id, status, contribution_type, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Build direct tree_id -> contribution map
      const directMap = new Map<string, { contribution_id: string; trip_id: string | null; status: string; contribution_type: string | null; created_at: string }>();
      // Build trip_id -> contribution map for fallback
      const tripMap = new Map<string, { contribution_id: string; trip_id: string | null; status: string; contribution_type: string | null; created_at: string }>();
      (data || []).forEach((c: any) => {
        if (c.tree_id && !directMap.has(c.tree_id)) {
          directMap.set(c.tree_id, { contribution_id: c.contribution_id, trip_id: c.trip_id, status: c.status, contribution_type: c.contribution_type, created_at: c.created_at });
        }
        if (c.trip_id && !tripMap.has(c.trip_id)) {
          tripMap.set(c.trip_id, { contribution_id: c.contribution_id, trip_id: c.trip_id, status: c.status, contribution_type: c.contribution_type, created_at: c.created_at });
        }
      });

      // For trees without a direct contribution entry, resolve via trip_id
      const finalMap = new Map(directMap);
      if (trees) {
        for (const tree of trees) {
          if (!finalMap.has(tree.id) && tree.trip_id) {
            const tripContrib = tripMap.get(tree.trip_id);
            if (tripContrib) {
              finalMap.set(tree.id, tripContrib);
            }
          }
        }
      }
      return finalMap;
    },
    enabled: !!user?.id,
  });

  // Fetch trips for trip IDs
  const tripIds = useMemo(() => {
    if (!contributions) return [];
    const ids = new Set<string>();
    contributions.forEach(v => { if (v.trip_id) ids.add(v.trip_id); });
    return [...ids];
  }, [contributions]);

  const { data: tripsMap } = useQuery({
    queryKey: ["treeManagementTrips", tripIds.length],
    queryFn: async () => {
      const { data } = await supabase.from("trips").select("id, friendly_trip_id").in("id", tripIds);
      const map = new Map<string, string>();
      (data || []).forEach((t: any) => map.set(t.id, t.friendly_trip_id || t.id.slice(0, 8)));
      return map;
    },
    enabled: tripIds.length > 0,
  });

  // Fetch geotags for track column
  const allTreeIds = useMemo(() => trees?.map(t => t.id) || [], [trees]);

  const { data: allGeotags } = useQuery({
    queryKey: ["treeManagementGeotags", allTreeIds.length],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_geotags" as any)
        .select("tree_id, latitude, longitude")
        .in("tree_id", allTreeIds);
      if (error) throw error;
      const map = new Map<string, { latitude: number; longitude: number }>();
      (data || []).forEach((g: any) => map.set(g.tree_id, { latitude: g.latitude, longitude: g.longitude }));
      return map;
    },
    enabled: allTreeIds.length > 0,
  });

  // Fetch survival statuses
  const { data: allSurvivalStatuses } = useQuery({
    queryKey: ["treeManagementSurvival", allTreeIds.length],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_survival_tracking" as any)
        .select("tree_id, survival_status, last_checked_date")
        .in("tree_id", allTreeIds)
        .order("last_checked_date", { ascending: false });
      if (error) throw error;
      const map = new Map<string, { survival_status: string; last_checked_date: string }>();
      (data || []).forEach((r: any) => {
        if (!map.has(r.tree_id)) {
          map.set(r.tree_id, { survival_status: r.survival_status, last_checked_date: r.last_checked_date });
        }
      });
      return map;
    },
    enabled: allTreeIds.length > 0,
  });

  // Fetch growth stages
  const { data: allGrowthStages } = useQuery({
    queryKey: ["treeManagementGrowth", allTreeIds.length],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_growth_metrics" as any)
        .select("tree_id, growth_stage, last_measured_date")
        .in("tree_id", allTreeIds)
        .order("last_measured_date", { ascending: false });
      if (error) throw error;
      const map = new Map<string, { growth_stage: string; last_measured_date: string }>();
      (data || []).forEach((r: any) => {
        if (!map.has(r.tree_id)) {
          map.set(r.tree_id, { growth_stage: r.growth_stage, last_measured_date: r.last_measured_date });
        }
      });
      return map;
    },
    enabled: allTreeIds.length > 0,
  });

  // Fetch latest status transition date per tree
  const { data: allStatusDates } = useQuery({
    queryKey: ["treeManagementStatusDates", allTreeIds.length],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_status_transitions" as any)
        .select("tree_id, to_status, created_at")
        .in("tree_id", allTreeIds)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const byTreeStatus = new Map<string, Map<string, string>>();
      const latestByTree = new Map<string, string>();

      (data || []).forEach((r: any) => {
        if (!latestByTree.has(r.tree_id)) {
          latestByTree.set(r.tree_id, r.created_at);
        }

        if (!r.to_status) return;

        if (!byTreeStatus.has(r.tree_id)) {
          byTreeStatus.set(r.tree_id, new Map<string, string>());
        }

        const statusMap = byTreeStatus.get(r.tree_id)!;
        if (!statusMap.has(r.to_status)) {
          statusMap.set(r.to_status, r.created_at);
        }
      });

      return { byTreeStatus, latestByTree };
    },
    enabled: allTreeIds.length > 0,
  });

  const getStatusDateForTree = (tree: Tree) => {
    const plantingStatus = tree.planting_status || 'waiting_to_be_assigned';
    const exactStatusDate = allStatusDates?.byTreeStatus instanceof Map
      ? allStatusDates.byTreeStatus.get(tree.id)?.get(plantingStatus)
      : undefined;
    const latestTransitionDate = allStatusDates?.latestByTree instanceof Map
      ? allStatusDates.latestByTree.get(tree.id)
      : undefined;

    if (exactStatusDate) return exactStatusDate;

    if (plantingStatus === 'waiting_to_be_assigned') {
      return tree.created_at;
    }

    return (tree as any).updated_at || latestTransitionDate || tree.created_at || null;
  };

  // Fetch contribution info for info sheet tree
  const { data: infoSheetContrib } = useQuery({
    queryKey: ["treeInfoContrib", infoSheet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contribution_tracking" as any)
        .select("*")
        .eq("tree_id", infoSheet!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!infoSheet?.id,
  });

  // Tree-level queries for Tree Status & Info sheet
  const { data: treeTransitions } = useQuery({
    queryKey: ["treeStatusTransitions_tm", infoSheet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_status_transitions" as any)
        .select("*")
        .eq("tree_id", infoSheet!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!infoSheet?.id,
  });

  const { data: treeGeotag } = useQuery({
    queryKey: ["treeGeotag_tm", infoSheet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_geotags" as any)
        .select("*")
        .eq("tree_id", infoSheet!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!infoSheet?.id,
  });

  const { data: treeSurvival } = useQuery({
    queryKey: ["treeSurvival_tm", infoSheet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_survival_tracking" as any)
        .select("*")
        .eq("tree_id", infoSheet!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!infoSheet?.id,
  });

  const { data: treeGrowth } = useQuery({
    queryKey: ["treeGrowth_tm", infoSheet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_growth_metrics" as any)
        .select("*")
        .eq("tree_id", infoSheet!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!infoSheet?.id,
  });

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
  };

  const filtered = useMemo(() => {
    if (!trees) return [];
    return trees.filter(t => {
      const contriData = contributions?.get(t.id);
      const matchSearch = !search ||
        t.otot_id?.toLowerCase().includes(search.toLowerCase()) ||
        contriData?.contribution_id?.toLowerCase().includes(search.toLowerCase()) ||
        t.location_name?.toLowerCase().includes(search.toLowerCase());
      const status = t.planting_status || 'waiting_to_be_assigned';
      const matchStatus = statusFilter === "all" || status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [trees, search, statusFilter, contributions]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (permLoading) return <Skeleton className="h-64 w-full m-8" />;

  if (!skipPermissionCheck && !isEnabled) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">You do not have access to this module.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Per-Tree Insights</h1>
        <p className="text-muted-foreground text-sm mt-1">View and manage all individual trees across the platform</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Tree ID, Contri ID, location..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PLANTING_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !filtered.length ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <TreePine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No trees found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tree ID</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contri Dt</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contri ID</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trip ID</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Funding Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Planting Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Date</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Growth Stage</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Survival Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Checked</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Track</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((tree) => {
                    const contriData = contributions?.get(tree.id);
                    const tripFriendlyId = contriData?.trip_id ? tripsMap?.get(contriData.trip_id) : null;
                    const hasGeotag = allGeotags instanceof Map && allGeotags.has(tree.id);
                    const survivalData = allSurvivalStatuses instanceof Map ? allSurvivalStatuses.get(tree.id) : undefined;
                    const growthData = allGrowthStages instanceof Map ? allGrowthStages.get(tree.id) : undefined;
                    const plantingStatus = tree.planting_status || 'waiting_to_be_assigned';
                    const statusDate = getStatusDateForTree(tree);

                    return (
                      <TableRow key={tree.id}>
                        <TableCell className="font-mono text-xs font-medium">{tree.otot_id}</TableCell>
                        <TableCell className="text-xs">{formatDate(contriData?.created_at || tree.created_at)}</TableCell>
                        <TableCell className="font-mono text-xs">{contriData?.contribution_id || "—"}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{tripFriendlyId || "—"}</TableCell>
                        <TableCell>
                          {contriData ? (
                            <Badge className={`whitespace-nowrap px-2 py-0.5 text-[10px] font-medium ${CONTRIBUTION_STATUS_COLORS[contriData.status] || "bg-muted text-muted-foreground"}`}>
                              {CONTRIBUTION_STATUS_LABELS[contriData.status] || contriData.status}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{tree.location_name || "—"}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs whitespace-nowrap px-2 py-0.5 font-medium ${PLANTING_STATUS_COLORS[plantingStatus] || 'bg-muted text-muted-foreground'}`}>
                            {STATUS_LABELS[plantingStatus] || plantingStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(statusDate)}</TableCell>
                        <TableCell>
                          {growthData ? (
                            <Badge className={`text-xs whitespace-nowrap px-2 py-0.5 font-medium capitalize ${GROWTH_STAGE_COLORS[growthData.growth_stage] || 'bg-muted text-muted-foreground'}`}>
                              {growthData.growth_stage}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {survivalData ? (
                            <Badge className={`text-xs whitespace-nowrap px-2 py-0.5 font-medium ${SURVIVAL_COLORS[survivalData.survival_status] || 'bg-muted text-muted-foreground'}`}>
                              {survivalData.survival_status}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {survivalData?.last_checked_date ? formatDate(survivalData.last_checked_date) : "—"}
                        </TableCell>
                        <TableCell>
                          {hasGeotag ? (() => {
                            const geo = allGeotags.get(tree.id)!;
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={`https://www.google.com/maps?q=${geo.latitude},${geo.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex"
                                    >
                                      <MapPin className="h-4 w-4 text-green-600 hover:text-green-800 cursor-pointer" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>{geo.latitude}, {geo.longitude}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })() : (
                            <MapPin className="h-4 w-4 text-muted-foreground/40" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[11px] px-2 font-medium"
                            onClick={() => setInfoSheet(tree)}
                          >
                            Tree Info
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>←</Button>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => { const p = parseInt(e.target.value); if (p >= 1 && p <= totalPages) setCurrentPage(p); }}
                  className="w-16 text-center"
                />
                <span className="text-sm text-muted-foreground">/ {totalPages}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>→</Button>
            </div>
          )}
        </>
      )}

      {/* Tree Status & Info Sheet */}
      <Sheet open={!!infoSheet} onOpenChange={(open) => !open && setInfoSheet(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {infoSheet && (() => {
            const currentStatus = infoSheet.planting_status || 'waiting_to_be_assigned';
            const currentOrder = getPlantingStatusOrder(currentStatus);
            const allLifecycleStatuses = PLANTING_STATUSES;

            const friendlyLabels: Record<string, string> = {
              target_beat_label: 'Location (Target Beat)', assigned_to_name: 'Planter', assigned_date: 'Assigned Date',
              nursery_name: 'Nursery / CBO', species_name: 'Species', tree_carer_name: 'Tree Carer',
              soil_type: 'Soil Type', rainfall_mm: 'Rainfall (mm)', site_prep_date: 'Site Preparation Date', site_notes: 'Site Notes',
              sapling_ready_date: 'Sapling Ready Date', sapling_source: 'Sapling Source',
              scheduled_date: 'Scheduled Date', planting_team_size: 'Team Size',
              planting_date: 'Planting Date', planting_method: 'Planting Method', planting_notes: 'Planting Notes',
              latitude: 'Latitude', longitude: 'Longitude', mapping_date: 'Mapping Date', mapping_method: 'Mapping Method', mapping_notes: 'Mapping Notes', gps_accuracy: 'GPS Accuracy',
              verification_date: 'Verification Date', verified_by: 'Verified By', verification_method: 'Verification Method', verification_notes: 'Verification Notes', health_status: 'Health Status',
              planted_confirmed_date: 'Confirmed Date', date_confirmed_dead: 'Date Confirmed Dead', cause_of_death: 'Cause of Death',
              replacement_planned: 'Replacement Planned', replacement_target_date: 'Replacement Target Date',
              re_planted_date: 'Re-planted Date', re_planting_method: 'Re-planting Method',
              notes: 'Notes', reason: 'Reason', batch_notice: 'Notice', planter_name: 'Planter',
            };
            const idToLabelMap: Record<string, string> = {
              assigned_to: 'assigned_to_name', target_beat: 'target_beat_label',
              nursery_id: 'nursery_name', species_id: 'species_name', tree_carer_id: 'tree_carer_name',
              planted_by: 'planter_name', planting_team_lead: 'planter_name',
            };
            const resolveValue = (key: string, value: unknown, data: Record<string, unknown>): string => {
              if (key === 'verified_by' && data.planter_name) return String(data.planter_name);
              if (typeof value === 'boolean') return value ? 'Yes' : 'No';
              return String(value);
            };

            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <TreePine className="h-5 w-5 text-primary" />
                    Tree Status & Info
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground">
                    Current Status: <span className="font-medium text-foreground">{STATUS_LABELS[currentStatus]}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Tree ID: {infoSheet.otot_id}</p>
                </SheetHeader>

                <Tabs defaultValue="planting" className="mt-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="planting">Planting</TabsTrigger>
                    <TabsTrigger value="tracking">Tracking</TabsTrigger>
                    <TabsTrigger value="growth">Growth</TabsTrigger>
                  </TabsList>

                  {/* Planting Tab */}
                  <TabsContent value="planting">
                    <div className="divide-y">
                      {(() => {
                        const purchaseDate = infoSheet.created_at;
                        return (
                          <div className="flex items-center gap-3 py-3">
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                            <div className="flex flex-col items-start min-w-0">
                              <span className="text-sm font-semibold text-foreground">{STATUS_LABELS['waiting_to_be_assigned']}</span>
                              <span className="text-xs text-muted-foreground">
                                {purchaseDate ? format(new Date(purchaseDate), "dd MMM yyyy, hh:mm a") : 'Date not available'}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      <Accordion type="single" collapsible className="w-full divide-y [&>*]:border-0">
                        {allLifecycleStatuses.filter(s => s !== 'waiting_to_be_assigned').map((status) => {
                          const statusOrder = getPlantingStatusOrder(status);
                          const isCompleted = statusOrder < currentOrder;
                          const isCurrent = statusOrder === currentOrder;
                          const isFuture = statusOrder > currentOrder;
                          const transition = treeTransitions?.find((t: any) => t.to_status === status);
                          const transitionData = transition?.transition_data || {};
                          const photos = transition?.photos || [];
                          const skipKeys = new Set<string>(['reverted']);
                          for (const [idKey, labelKey] of Object.entries(idToLabelMap)) {
                            if (transitionData[labelKey] !== undefined) skipKeys.add(idKey);
                          }
                          if (status === 'verified' && transitionData['planter_name'] !== undefined) skipKeys.add('planter_name');
                          const entrySortOrder: Record<string, number> = { target_beat_label: 0, assigned_to_name: 1 };
                          const entries = Object.entries(transitionData)
                            .filter(([key, value]) => !skipKeys.has(key) && value !== null && value !== undefined && value !== '')
                            .sort((a, b) => (entrySortOrder[a[0]] ?? 99) - (entrySortOrder[b[0]] ?? 99));
                          return (
                            <AccordionItem key={status} value={status} className={`border-0 ${isFuture ? 'opacity-50' : ''}`}>
                              <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-3 w-full">
                                  {isCompleted ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0" /> : isCurrent ? <Circle className="h-5 w-5 text-primary fill-primary/20 shrink-0" /> : <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />}
                                  <div className="flex flex-col items-start text-left min-w-0">
                                    <span className={`text-sm ${isCompleted || isCurrent ? 'font-semibold text-foreground' : 'font-normal text-muted-foreground'}`}>
                                      {STATUS_LABELS[status]}
                                    </span>
                                    {transition?.created_at ? (
                                      <span className="text-xs text-muted-foreground">{format(new Date(transition.created_at), "dd MMM yyyy, hh:mm a")}</span>
                                    ) : isFuture ? (
                                      <span className="text-xs text-muted-foreground italic">Pending</span>
                                    ) : null}
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                {transition ? (
                                  <div className="space-y-3 pt-1 pb-2 pl-8">
                                    {entries.length > 0 && (
                                      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                                        {entries.map(([key, value]) => {
                                          const label = friendlyLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                          return (
                                            <React.Fragment key={key}>
                                              <span className="text-muted-foreground whitespace-nowrap">{label}:</span>
                                              <span className="font-medium">{resolveValue(key, value, transitionData)}</span>
                                            </React.Fragment>
                                          );
                                        })}
                                      </div>
                                    )}
                                    {photos.length > 0 && (
                                      <div className="space-y-1.5">
                                        <span className="text-sm text-muted-foreground">Photos:</span>
                                        <div className="flex gap-2 flex-wrap">
                                          {photos.map((url: string, pi: number) => (
                                            <div key={pi} className="relative group cursor-pointer" onClick={() => setLightboxPhoto(url)}>
                                              <img src={url} alt={`Photo ${pi + 1}`} className="w-16 h-16 object-cover rounded-md border" />
                                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                                                <ZoomIn className="h-4 w-4 text-white" />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {entries.length === 0 && photos.length === 0 && (
                                      <p className="text-sm text-muted-foreground italic">No additional details recorded.</p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic pl-8 pb-2">Not yet reached.</p>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </div>
                  </TabsContent>

                  {/* Tracking Tab */}
                  <TabsContent value="tracking">
                    <div className="space-y-4 pt-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Geotag Information
                      </h4>
                      {treeGeotag ? (
                        <div className="rounded-lg border bg-card p-4 space-y-2">
                          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                            <span className="text-muted-foreground">Geo Tag ID:</span>
                            <span className="font-medium">{treeGeotag.geo_tag_id}</span>
                            <span className="text-muted-foreground">Latitude:</span>
                            <span className="font-medium">{treeGeotag.latitude}</span>
                            <span className="text-muted-foreground">Longitude:</span>
                            <span className="font-medium">{treeGeotag.longitude}</span>
                            <span className="text-muted-foreground">Accuracy:</span>
                            <span className="font-medium">{treeGeotag.geo_accuracy || '-'}</span>
                            <span className="text-muted-foreground">Captured:</span>
                            <span className="font-medium">{treeGeotag.created_at ? format(new Date(treeGeotag.created_at), "dd MMM yyyy, hh:mm a") : '-'}</span>
                          </div>
                          {treeGeotag.map_snapshot && (
                            <div className="mt-3">
                              <img src={treeGeotag.map_snapshot} alt="Map snapshot" className="w-full h-32 object-cover rounded-md border cursor-pointer" onClick={() => setLightboxPhoto(treeGeotag.map_snapshot)} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic text-center py-6">No geotag data captured yet.</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Growth Tab */}
                  <TabsContent value="growth">
                    <div className="space-y-5 pt-2">
                      {/* Survival Tracking */}
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                          <Activity className="h-4 w-4" /> Survival Tracking
                        </h4>
                        {treeSurvival && treeSurvival.length > 0 ? (
                          <div className="rounded-md border overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-muted/50">
                                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Rate</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {treeSurvival.map((record: any) => (
                                  <React.Fragment key={record.id}>
                                    <tr>
                                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                                        {record.last_checked_date ? format(new Date(record.last_checked_date), "dd MMM yyyy") : '-'}
                                      </td>
                                      <td className="px-3 py-2">
                                        <Badge variant="outline" className={`text-xs px-1.5 py-0 ${record.survival_status === 'Alive' ? 'border-green-300 text-green-700 bg-green-50' : record.survival_status === 'Dead' ? 'border-red-300 text-red-700 bg-red-50' : 'border-amber-300 text-amber-700 bg-amber-50'}`}>
                                          {record.survival_status}
                                        </Badge>
                                      </td>
                                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                                        {record.survival_rate !== null ? `${record.survival_rate}%` : '-'}
                                      </td>
                                    </tr>
                                    {record.notes && (
                                      <tr>
                                        <td colSpan={3} className="px-3 pb-2 pt-0">
                                          <p className="text-xs text-muted-foreground italic">{record.notes}</p>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic text-center py-4">No survival records yet.</p>
                        )}
                      </div>

                      <Separator />

                      {/* Growth Metrics */}
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4" /> Growth Metrics
                        </h4>
                        {treeGrowth && treeGrowth.length > 0 ? (
                          <div className="rounded-md border overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-muted/50">
                                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Stage</th>
                                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Age</th>
                                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Height</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {treeGrowth.map((record: any) => (
                                  <React.Fragment key={record.id}>
                                    <tr>
                                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                                        {record.last_measured_date ? format(new Date(record.last_measured_date), "dd MMM yyyy") : '-'}
                                      </td>
                                      <td className="px-3 py-2">
                                        <Badge variant="outline" className="text-xs px-1.5 py-0 border-primary/30 text-primary bg-primary/5">
                                          {record.growth_stage}
                                        </Badge>
                                      </td>
                                      <td className="px-3 py-2">{record.tree_age || '-'}</td>
                                      <td className="px-3 py-2 text-right font-medium">{record.tree_height || '-'}</td>
                                    </tr>
                                    {(record.notes || (record.photos && record.photos.length > 0)) && (
                                      <tr>
                                        <td colSpan={4} className="px-3 pb-2 pt-0">
                                          {record.notes && <p className="text-xs text-muted-foreground italic">{record.notes}</p>}
                                          {record.photos && record.photos.length > 0 && (
                                            <div className="flex gap-1.5 flex-wrap mt-1">
                                              {record.photos.map((url: string, pi: number) => (
                                                <div key={pi} className="relative group cursor-pointer" onClick={() => setLightboxPhoto(url)}>
                                                  <img src={url} alt={`Photo ${pi + 1}`} className="w-10 h-10 object-cover rounded border" />
                                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                                    <ZoomIn className="h-3 w-3 text-white" />
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic text-center py-4">No growth records yet.</p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Photo Lightbox */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxPhoto(null)}>
          <img src={lightboxPhoto} alt="Full size" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}

export default OwnerTreeManagement;
