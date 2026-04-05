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
  being_mapped: 'Being Mapped',
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

export function StakeholderTreeManagement() {
  const { isEnabled, isLoading: permLoading } = useModulePermissions("tree_management");
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
        .select("tree_id, contribution_id, trip_id, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Build direct tree_id -> contribution map
      const directMap = new Map<string, { contribution_id: string; trip_id: string | null; status: string; created_at: string }>();
      // Build trip_id -> contribution map for fallback
      const tripMap = new Map<string, { contribution_id: string; trip_id: string | null; status: string; created_at: string }>();
      (data || []).forEach((c: any) => {
        if (c.tree_id && !directMap.has(c.tree_id)) {
          directMap.set(c.tree_id, { contribution_id: c.contribution_id, trip_id: c.trip_id, status: c.status, created_at: c.created_at });
        }
        if (c.trip_id && !tripMap.has(c.trip_id)) {
          tripMap.set(c.trip_id, { contribution_id: c.contribution_id, trip_id: c.trip_id, status: c.status, created_at: c.created_at });
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

  if (!isEnabled) {
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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TreePine className="h-6 w-6 text-green-700" /> Tree Management
        </h1>
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
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Planting Date</TableHead>
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
                        <TableCell className="text-xs">{formatDate(tree.plant_date)}</TableCell>
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

      {/* Tree Info Sheet */}
      <Sheet open={!!infoSheet} onOpenChange={(open) => !open && setInfoSheet(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {infoSheet && (() => {
            const plantingStatus = infoSheet.planting_status || 'waiting_to_be_assigned';
            const survivalData = allSurvivalStatuses instanceof Map ? allSurvivalStatuses.get(infoSheet.id) : undefined;
            const growthData = allGrowthStages instanceof Map ? allGrowthStages.get(infoSheet.id) : undefined;
            const hasGeotag = allGeotags instanceof Map && allGeotags.has(infoSheet.id);
            const geo = hasGeotag ? allGeotags.get(infoSheet.id) : null;

            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <TreePine className="h-5 w-5 text-primary" />
                    Tree Info
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground">{infoSheet.otot_id}</p>
                </SheetHeader>

                <div className="space-y-4 mt-4">
                  {/* Basic Info */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tree Details</h4>
                    <div className="rounded-lg border bg-card p-3">
                      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                        <span className="text-muted-foreground">Tree ID:</span>
                        <span className="font-medium font-mono">{infoSheet.otot_id}</span>
                        <span className="text-muted-foreground">Contribution ID:</span>
                        <span className="font-medium font-mono">{infoSheetContrib?.contribution_id || infoSheet.contribution_id || "—"}</span>
                        <span className="text-muted-foreground">Trip ID:</span>
                        <span className="font-medium font-mono">
                          {infoSheetContrib?.trip_id ? (tripsMap?.get(infoSheetContrib.trip_id) || infoSheetContrib.trip_id?.slice(0, 8)) : "—"}
                        </span>
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">{infoSheet.location_name || "—"}</span>
                        <span className="text-muted-foreground">Tree Type:</span>
                        <span className="font-medium">{infoSheet.tree_type || "—"}</span>
                        <span className="text-muted-foreground">Created:</span>
                        <span className="font-medium">{formatDate(infoSheet.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Funding Status */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Funding Status</h4>
                    <div className="rounded-lg border bg-card p-3">
                      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <span>
                          {infoSheetContrib ? (
                            <Badge className={`whitespace-nowrap px-2 py-0.5 text-[10px] font-medium ${CONTRIBUTION_STATUS_COLORS[infoSheetContrib.status] || "bg-muted text-muted-foreground"}`}>
                              {CONTRIBUTION_STATUS_LABELS[infoSheetContrib.status] || infoSheetContrib.status}
                            </Badge>
                          ) : "—"}
                        </span>
                        <span className="text-muted-foreground">Amount Paid:</span>
                        <span className="font-medium">${Number(infoSheet.amount_paid).toFixed(2)}</span>
                        <span className="text-muted-foreground">Payment Method:</span>
                        <span className="font-medium">{infoSheet.payment_method || "—"}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Planting Status */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Planting Info</h4>
                    <div className="rounded-lg border bg-card p-3">
                      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                        <span className="text-muted-foreground">Planting Status:</span>
                        <span>
                          <Badge className={`text-xs whitespace-nowrap px-2 py-0.5 font-medium ${PLANTING_STATUS_COLORS[plantingStatus] || ''}`}>
                            {STATUS_LABELS[plantingStatus]}
                          </Badge>
                        </span>
                        <span className="text-muted-foreground">Plant Date:</span>
                        <span className="font-medium">{formatDate(infoSheet.plant_date)}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Growth & Survival */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Growth & Survival</h4>
                    <div className="rounded-lg border bg-card p-3">
                      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                        <span className="text-muted-foreground">Growth Stage:</span>
                        <span>
                          {growthData ? (
                            <Badge className={`text-xs whitespace-nowrap px-2 py-0.5 font-medium capitalize ${GROWTH_STAGE_COLORS[growthData.growth_stage] || 'bg-muted text-muted-foreground'}`}>
                              {growthData.growth_stage}
                            </Badge>
                          ) : "—"}
                        </span>
                        <span className="text-muted-foreground">Survival Status:</span>
                        <span>
                          {survivalData ? (
                            <Badge className={`text-xs whitespace-nowrap px-2 py-0.5 font-medium ${SURVIVAL_COLORS[survivalData.survival_status] || 'bg-muted text-muted-foreground'}`}>
                              {survivalData.survival_status}
                            </Badge>
                          ) : "—"}
                        </span>
                        <span className="text-muted-foreground">Last Checked:</span>
                        <span className="font-medium">{survivalData?.last_checked_date ? formatDate(survivalData.last_checked_date) : "—"}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Geolocation */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Geolocation</h4>
                    <div className="rounded-lg border bg-card p-3">
                      {geo ? (
                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                          <span className="text-muted-foreground">Latitude:</span>
                          <span className="font-medium">{geo.latitude}</span>
                          <span className="text-muted-foreground">Longitude:</span>
                          <span className="font-medium">{geo.longitude}</span>
                          <span className="text-muted-foreground">Map:</span>
                          <a
                            href={`https://www.google.com/maps?q=${geo.latitude},${geo.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm flex items-center gap-1"
                          >
                            <MapPin className="h-3.5 w-3.5" /> Open in Maps
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No geotag recorded</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default StakeholderTreeManagement;
