import React, { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, TreePine, DollarSign, Clock, CheckCircle2, Eye, ChevronDown, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown, Layers, CheckCheck, Leaf, FileText, AlertTriangle, MoreVertical, ChevronLeft, Circle, Download, X as XIcon, ZoomIn, ClipboardList, BarChart3, MapPin, Crosshair, TrendingUp, Activity, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { Progress } from "@/components/ui/progress";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { StatusTransitionPanel } from "@/components/trees/StatusTransitionPanel";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Plane } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Tree = Database["public"]["Tables"]["trees"]["Row"];
type Trip = Database["public"]["Tables"]["trips"]["Row"];

interface ContributionRow {
  id: string;
  contribution_id: string;
  contribution_type: string | null;
  tree_id: string | null;
  tourist_name: string | null;
  country: string | null;
  trip_id: string | null;
  num_trees: number;
  amount_paid: number;
  amount_transferred: number | null;
  status: string;
  created_at: string;
  payment_date: string | null;
  payment_method: string | null;
  currency: string | null;
}

const PLANTING_STATUSES = [
  'waiting_to_be_assigned',
  'assigned',
  'site_prepared',
  'saplings_ready',
  'planting_scheduled',
  'sapling_planted',
  'being_mapped',
  'verified',
  'planted',
] as const;

// Statuses available only for batch (bulk) updates
const BATCH_STATUSES = [
  'waiting_to_be_assigned',
  'assigned',
  'site_prepared',
  'saplings_ready',
  'planting_scheduled',
  'sapling_planted',
  'verified',
  'planted',
] as const;

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
  // Legacy mappings for any old data
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
  // Legacy mappings
  pending_allocation: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  allocated: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  funds_pending: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
  funds_received: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  planting_in_progress: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  monitored: "bg-teal-500/10 text-teal-700 border-teal-500/20",
};

const CONTRIBUTION_STATUS_LABELS: Record<string, string> = {
  contribution_received: "Received",
  contribution_confirmed: "Confirmed",
  funds_received: "Received by KTB",
  transferred_for_planting: "Transferred for Plantation",
  received_for_planting: "Received for Plantation",
};

const CONTRIBUTION_STATUS_COLORS: Record<string, string> = {
  contribution_received: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-50",
  contribution_confirmed: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
  funds_received: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
  transferred_for_planting: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-50",
  received_for_planting: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50",
};

type SortField = "contribution_id" | "payment_date" | "contribution_type" | "num_trees" | "amount_transferred" | "planting_status" | "payment_status";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 15;

interface ContributionGroup {
  contribution_id: string;
  contribution_type: string | null;
  tourist_name: string | null;
  country: string | null;
  trip_id: string | null;
  total_trees: number;
  total_amount: number;
  amount_transferred: number;
  payment_date: string | null;
  created_at: string;
  currency: string | null;
  payment_method: string | null;
  trees: Tree[];
  trip: Trip | null;
  planting_status: string;
  payment_status: string;
  status_date: string | null;
}

const getGroupPlantingStatus = (trees: Tree[]): string => {
  if (!trees.length) return "waiting_to_be_assigned";
  const statuses: string[] = trees.map(t => t.planting_status || 'waiting_to_be_assigned');
  if (statuses.every(s => s === "planted" || s === "verified")) return "planted";
  if (statuses.some(s => s === "planted" || s === "verified")) return "partially_planted";
  if (statuses.every(s => s === "waiting_to_be_assigned")) return "waiting_to_be_assigned";
  if (statuses.some(s => s === "dead")) return "dead";
  if (statuses.some(s => s === "being_mapped")) return "being_mapped";
  if (statuses.some(s => s === "sapling_planted")) return "sapling_planted";
  if (statuses.some(s => s === "planting_scheduled")) return "planting_scheduled";
  if (statuses.some(s => s === "saplings_ready")) return "saplings_ready";
  if (statuses.some(s => s === "site_prepared")) return "site_prepared";
  if (statuses.some(s => s === "assigned")) return "assigned";
  return statuses[0] || "waiting_to_be_assigned";
};

const getGroupStatusLabel = (status: string): string => {
  if (status === "partially_planted") return "Partially Planted";
  return STATUS_LABELS[status] || status;
};

const getGroupStatusColor = (status: string): string => {
  if (status === "partially_planted") return "bg-blue-500/10 text-blue-700 border-blue-500/20";
  return PLANTING_STATUS_COLORS[status] || "bg-muted text-muted-foreground";
};

const getPlantingStatusOrder = (status: string) => {
  const order: Record<string, number> = {
    waiting_to_be_assigned: 0, assigned: 1, site_prepared: 2, saplings_ready: 3,
    planting_scheduled: 4, sapling_planted: 5, being_mapped: 6, verified: 7,
    partially_planted: 8, planted: 9, dead: 10, re_planted: 11,
  };
  return order[status] ?? 0;
};

const getContriTypeLabel = (type: string | null): string => {
  if (!type) return "-";
  if (type === "tourist") return "Tourist";
  if (type === "travel_agent") return "Travel Agent";
  return type;
};

export const StakeholderOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { hasEdit } = useModulePermissions("tree_orders");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("payment_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [viewSheet, setViewSheet] = useState<ContributionGroup | null>(null);
  const [bulkSelections, setBulkSelections] = useState<Record<string, string>>({});
  const [transitionRequest, setTransitionRequest] = useState<{
    treeIds: string[];
    fromStatus: string;
    toStatus: string;
    contributionId?: string;
    treeCount?: number;
    isBatch: boolean;
  } | null>(null);
  const [transitionPanelOpen, setTransitionPanelOpen] = useState(false);
  const [reversionDialog, setReversionDialog] = useState<{
    treeIds: string[];
    fromStatus: string;
    toStatus: string;
    contributionId?: string;
    treeCount?: number;
    isBatch: boolean;
  } | null>(null);
  const [statusHistoryTree, setStatusHistoryTree] = useState<Tree | null>(null);
  const [statusHistoryGroup, setStatusHistoryGroup] = useState<ContributionGroup | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [monitoringSheet, setMonitoringSheet] = useState<ContributionGroup | null>(null);
  const [impactSheet, setImpactSheet] = useState<ContributionGroup | null>(null);
  const [monitoringForm, setMonitoringForm] = useState({ inspection_id: '', inspection_date: '', inspected_by: '', notes: '', photos: '' });
  const [impactForm, setImpactForm] = useState({ co2_offset_estimated: '', co2_offset_actual: '', calculation_method: '', biodiversity_index: '', soil_improvement_indicator: '', water_retention_indicator: '', jobs_created: '', local_participants_count: '', community_benefits: '' });
  
  // Tree-level status & info
  const [treeStatusSheet, setTreeStatusSheet] = useState<{ tree: Tree; group: ContributionGroup } | null>(null);
  const [geotagDialog, setGeotagDialog] = useState<Tree | null>(null);
  const [geotagForm, setGeotagForm] = useState({ geo_tag_id: '', latitude: '', longitude: '', geo_accuracy: '', map_snapshot: '' });
  const [growthSheet, setGrowthSheet] = useState<Tree | null>(null);
  const [survivalForm, setSurvivalForm] = useState({ survival_status: 'Alive', survival_rate: '', last_checked_date: '', notes: '' });
  const [growthForm, setGrowthForm] = useState({ growth_stage: 'sapling', tree_height: '', tree_age: '', photos: '', last_measured_date: '', notes: '' });
  
  const { data: orgId } = useQuery({
    queryKey: ["stakeholderOrgId", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("organization_id").eq("user_id", user!.id).single();
      return data?.organization_id;
    },
    enabled: !!user?.id,
  });

  const { data: contributions, isLoading, refetch } = useQuery({
    queryKey: ["stakeholderOrderContributions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contribution_tracking" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ContributionRow[];
    },
    enabled: !!user?.id,
  });

  const { data: trees } = useQuery({
    queryKey: ["stakeholderOrderTrees"],
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

  const { data: tripsData } = useQuery({
    queryKey: ["stakeholderOrderTrips", contributions],
    queryFn: async () => {
      const tripIds = [...new Set(contributions?.map(c => c.trip_id).filter(Boolean) || [])];
      if (tripIds.length === 0) return {};
      const { data } = await supabase.from("trips").select("*").in("id", tripIds);
      return (data || []).reduce((acc, trip) => {
        acc[trip.id] = trip;
        return acc;
      }, {} as Record<string, Trip>);
    },
    enabled: !!contributions && contributions.length > 0,
  });

  const trips = tripsData || {};

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

  // Query status transitions for the selected tree (batch or tree-level)
  const transitionTreeId = statusHistoryTree?.id || treeStatusSheet?.tree.id;
  const { data: treeTransitions } = useQuery({
    queryKey: ["treeStatusTransitions", transitionTreeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_status_transitions" as any)
        .select("*")
        .eq("tree_id", transitionTreeId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!transitionTreeId,
  });

  // Query latest transition dates for all trees (for Status Dt column)
  const { data: allTransitionDates } = useQuery({
    queryKey: ["allTreeTransitionDates", trees?.map(t => t.id).join(",")],
    queryFn: async () => {
      if (!trees || trees.length === 0) return {};
      const treeIds = trees.map(t => t.id);
      // Fetch all transitions ordered desc
      const { data, error } = await supabase
        .from("tree_status_transitions" as any)
        .select("tree_id, to_status, created_at")
        .in("tree_id", treeIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Build map: tree_id -> latest transition date matching current planting_status
      const dateMap: Record<string, string> = {};
      for (const row of (data || []) as any[]) {
        const tree = trees.find(t => t.id === row.tree_id);
        if (tree && row.to_status === (tree.planting_status || 'waiting_to_be_assigned') && !dateMap[row.tree_id]) {
          dateMap[row.tree_id] = row.created_at;
        }
      }
      // Fallback for trees without transitions
      for (const tree of trees) {
        if (!dateMap[tree.id]) {
          dateMap[tree.id] = tree.updated_at || tree.created_at;
        }
      }
      return dateMap;
    },
    enabled: !!trees && trees.length > 0,
  });

  // Query monitoring logs for batch status & monitoring sheet
  const batchContribId = statusHistoryGroup?.contribution_id || monitoringSheet?.contribution_id;
  const { data: monitoringLogs, refetch: refetchMonitoring } = useQuery({
    queryKey: ["monitoringLogs", batchContribId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monitoring_logs" as any)
        .select("*")
        .eq("contribution_id", batchContribId!)
        .order("inspection_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!batchContribId,
  });

  // Query impact metrics for batch status & impact sheet
  const impactContribId = statusHistoryGroup?.contribution_id || impactSheet?.contribution_id;
  const { data: impactMetrics, refetch: refetchImpact } = useQuery({
    queryKey: ["impactMetrics", impactContribId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impact_metrics" as any)
        .select("*")
        .eq("contribution_id", impactContribId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!impactContribId,
  });

  // Tree-level queries for Tree Status & Info
  const treeStatusTreeId = treeStatusSheet?.tree.id || geotagDialog?.id || growthSheet?.id;
  
  const { data: treeGeotag, refetch: refetchGeotag } = useQuery({
    queryKey: ["treeGeotag", treeStatusTreeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_geotags" as any)
        .select("*")
        .eq("tree_id", treeStatusTreeId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!treeStatusTreeId,
  });

  const { data: treeSurvival, refetch: refetchSurvival } = useQuery({
    queryKey: ["treeSurvival", treeStatusSheet?.tree.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_survival_tracking" as any)
        .select("*")
        .eq("tree_id", treeStatusSheet!.tree.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!treeStatusSheet?.tree.id,
  });

  const { data: treeGrowth, refetch: refetchGrowth } = useQuery({
    queryKey: ["treeGrowth", treeStatusSheet?.tree.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_growth_metrics" as any)
        .select("*")
        .eq("tree_id", treeStatusSheet!.tree.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!treeStatusSheet?.tree.id,
  });

  // Check geotag status for all trees displayed
  const allTreeIds = useMemo(() => trees?.map(t => t.id) || [], [trees]);
  const { data: allGeotags } = useQuery({
    queryKey: ["allGeotags", allTreeIds.length],
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

  // Fetch latest survival status for all trees
  const { data: allSurvivalStatuses } = useQuery({
    queryKey: ["allSurvivalStatuses", allTreeIds.length],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_survival_tracking" as any)
        .select("tree_id, survival_status, last_checked_date")
        .in("tree_id", allTreeIds)
        .order("last_checked_date", { ascending: false });
      if (error) throw error;
      // Keep only the latest record per tree
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

  // Fetch latest growth stage for all trees
  const { data: allGrowthStages } = useQuery({
    queryKey: ["allGrowthStages", allTreeIds.length],
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

  const updateStatus = useMutation({
    mutationFn: async ({ treeId, status }: { treeId: string; status: string }) => {
      const { error } = await supabase
        .from("trees")
        .update({ planting_status: status as any })
        .eq("id", treeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stakeholderOrderTrees"] });
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
      queryClient.invalidateQueries({ queryKey: ["stakeholderOrderTrees"] });
      toast.success(`Updated ${variables.treeIds.length} tree(s) to ${STATUS_LABELS[variables.status]}`);
      setBulkSelections({});
    },
    onError: () => toast.error("Failed to bulk update status"),
  });

  const treesByContribution = useMemo(() => {
    if (!trees || !contributions) return {};
    const grouped: Record<string, Tree[]> = {};
    trees.forEach(t => {
      const cid = (t as any).contribution_id as string | null;
      if (cid) {
        if (!grouped[cid]) grouped[cid] = [];
        grouped[cid].push(t);
      }
    });
    return grouped;
  }, [trees, contributions]);

  const contributionGroups = useMemo<ContributionGroup[]>(() => {
    if (!contributions) return [];
    const grouped: Record<string, ContributionRow[]> = {};
    contributions.forEach(c => {
      if (!grouped[c.contribution_id]) grouped[c.contribution_id] = [];
      grouped[c.contribution_id].push(c);
    });

    return Object.entries(grouped).map(([contribId, rows]) => {
      const first = rows[0];
      const groupTrees = treesByContribution[contribId] || [];
      // Get the most recent status date from transition dates
      const treeDates = groupTrees
        .map(t => allTransitionDates?.[t.id])
        .filter(Boolean) as string[];
      const latestStatusDate = treeDates.length > 0
        ? treeDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
        : null;
      return {
        contribution_id: contribId,
        contribution_type: first.contribution_type,
        tourist_name: first.tourist_name,
        country: first.country,
        trip_id: first.trip_id,
        total_trees: rows.reduce((s, r) => s + Number(r.num_trees), 0),
        total_amount: rows.reduce((s, r) => s + Number(r.amount_paid), 0),
        amount_transferred: rows.reduce((s, r) => s + Number(r.amount_transferred || 0), 0),
        payment_date: first.payment_date,
        created_at: first.created_at,
        currency: first.currency,
        payment_method: first.payment_method,
        trees: groupTrees,
        trip: first.trip_id ? (trips[first.trip_id] || null) : null,
        planting_status: getGroupPlantingStatus(groupTrees),
        payment_status: first.status,
        status_date: latestStatusDate,
      };
    });
  }, [contributions, treesByContribution, trips, allTransitionDates]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  const filtered = useMemo(() => {
    let result = contributionGroups.filter(g => {
      const tripFriendlyId = g.trip?.friendly_trip_id || "";
      const matchSearch = !search ||
        g.contribution_id?.toLowerCase().includes(search.toLowerCase()) ||
        g.tourist_name?.toLowerCase().includes(search.toLowerCase()) ||
        tripFriendlyId.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || g.planting_status === statusFilter;
      return matchSearch && matchStatus;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "contribution_id": cmp = (a.contribution_id || "").localeCompare(b.contribution_id || ""); break;
        case "payment_date": cmp = (a.payment_date || a.created_at || "").localeCompare(b.payment_date || b.created_at || ""); break;
        case "contribution_type": cmp = (a.contribution_type || "").localeCompare(b.contribution_type || ""); break;
        case "num_trees": cmp = a.total_trees - b.total_trees; break;
        case "amount_transferred": cmp = a.amount_transferred - b.amount_transferred; break;
        case "planting_status": cmp = getPlantingStatusOrder(a.planting_status) - getPlantingStatusOrder(b.planting_status); break;
        case "payment_status": cmp = (a.payment_status || "").localeCompare(b.payment_status || ""); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [contributionGroups, search, statusFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleRow = (contribId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(contribId)) next.delete(contribId); else next.add(contribId);
      return next;
    });
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
  };

  const DateTimeCell = ({ value }: { value: string | null }) => {
    if (!value) return <span>-</span>;
    try {
      const date = new Date(value);
      return (
        <div className="leading-tight">
          <div className="text-sm">{format(date, "dd/MM/yyyy")}</div>
          <div className="text-[11px] text-muted-foreground">{format(date, "hh:mm:ss a")}</div>
        </div>
      );
    } catch { return <span>-</span>; }
  };

  const totalTrees = contributionGroups.reduce((s, g) => s + g.total_trees, 0);
  const allGroupTrees = contributionGroups.flatMap(g => g.trees);
  const planted = allGroupTrees.filter(t => t.planting_status === 'planted' || t.planting_status === 'verified').reduce((s, t) => s + t.num_trees, 0);
  const fundsReceived = disbursements?.filter(d => d.status === 'received' || d.status === 'reconciled').reduce((s, d) => s + Number(d.amount), 0) || 0;

  // Check if current stakeholder is plantation type (not institutional)
  const { data: isPlantationType } = useQuery({
    queryKey: ["isPlantationStakeholder", orgId],
    queryFn: async () => {
      if (!orgId) return false;
      const { data: org } = await supabase
        .from("organizations")
        .select("category, partner_type_id")
        .eq("id", orgId)
        .single();
      if (!org) return false;
      // Institutional partners have category 'institutional' or partner type containing 'institutional'/'ktb'
      if (org.category === 'institutional') return false;
      if (org.partner_type_id) {
        const { data: pt } = await supabase
          .from("partner_types")
          .select("name")
          .eq("id", org.partner_type_id)
          .single();
        if (pt?.name?.toLowerCase().includes('institutional') || pt?.name?.toLowerCase().includes('ktb')) return false;
      }
      return true;
    },
    enabled: !!orgId,
  });

  const canEditPlantingStatus = hasEdit && !!isPlantationType;

  const SortableHead = ({ field, label, className = "" }: { field: SortField; label: string; className?: string }) => (
    <TableHead
      className={`cursor-pointer select-none text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-0.5">{label}{getSortIcon(field)}</span>
    </TableHead>
  );

  const handleBulkApply = useCallback((contribId: string, treeIds: string[]) => {
    const status = bulkSelections[contribId];
    if (!status) { toast.error("Please select a status first"); return; }
    // Find current trees to get from status
    const currentTrees = trees?.filter(t => treeIds.includes(t.id)) || [];
    const fromStatus = currentTrees[0]?.planting_status || "waiting_to_be_assigned";
    const group = contributionGroups.find(g => g.contribution_id === contribId);
    
    const targetOrder = getPlantingStatusOrder(status);
    const currentOrder = getPlantingStatusOrder(fromStatus);
    
    const requestData = {
      treeIds,
      fromStatus,
      toStatus: status,
      contributionId: contribId,
      treeCount: group?.total_trees || treeIds.length,
      isBatch: true,
    };

    // Check for reversion (going backward)
    if (targetOrder < currentOrder) {
      setReversionDialog(requestData);
      return;
    }
    
    // "waiting_to_be_assigned" saves immediately (no panel)
    if (status === "waiting_to_be_assigned") {
      bulkUpdateStatus.mutate({ treeIds, status });
      return;
    }
    
    setTransitionRequest(requestData);
    setTransitionPanelOpen(true);
  }, [bulkSelections, bulkUpdateStatus, trees, contributionGroups]);

  const handleIndividualStatusChange = useCallback((tree: Tree, newStatus: string) => {
    const fromStatus = tree.planting_status || "waiting_to_be_assigned";
    const targetOrder = getPlantingStatusOrder(newStatus);
    const currentOrder = getPlantingStatusOrder(fromStatus);
    const contribId = (tree as any).contribution_id;

    const requestData = {
      treeIds: [tree.id],
      fromStatus,
      toStatus: newStatus,
      contributionId: contribId || undefined,
      treeCount: tree.num_trees,
      isBatch: false,
    };

    // Check for reversion
    if (targetOrder < currentOrder) {
      setReversionDialog(requestData);
      return;
    }

    // "waiting_to_be_assigned" saves immediately
    if (newStatus === "waiting_to_be_assigned") {
      updateStatus.mutate({ treeId: tree.id, status: newStatus });
      return;
    }

    setTransitionRequest(requestData);
    setTransitionPanelOpen(true);
  }, [updateStatus]);

  const handleReversionConfirm = useCallback(async () => {
    if (!reversionDialog) return;
    const { treeIds, toStatus } = reversionDialog;
    
    try {
      // 1. Delete all forward transition records beyond the target status
      const targetOrder = getPlantingStatusOrder(toStatus);
      const forwardStatuses = PLANTING_STATUSES.filter(s => getPlantingStatusOrder(s) > targetOrder);
      
      // Delete transition records where to_status is ahead of target
      if (forwardStatuses.length > 0) {
        const { error: deleteError } = await supabase
          .from("tree_status_transitions" as any)
          .delete()
          .in("tree_id", treeIds)
          .in("to_status", forwardStatuses as any);
        if (deleteError) throw deleteError;
      }
      
      // Also delete the current target status records so the transition panel can create fresh ones
      // 2. Update tree status
      const { error: updateError } = await supabase
        .from("trees")
        .update({ planting_status: toStatus as any })
        .in("id", treeIds);
      if (updateError) throw updateError;

      // 3. Save the reversion transition record
      const records = treeIds.map(treeId => ({
        tree_id: treeId,
        contribution_id: reversionDialog.contributionId || null,
        from_status: reversionDialog.fromStatus,
        to_status: toStatus,
        transition_data: { reverted: true, reason: "Manual reversion by user" },
        photos: [] as string[],
        created_by: user?.id || null,
      }));
      const { error: insertError } = await supabase
        .from("tree_status_transitions" as any)
        .insert(records);
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["stakeholderOrderTrees"] });
      setBulkSelections({});
      toast.success(`Reverted ${treeIds.length} tree(s) to ${STATUS_LABELS[toStatus]}. Forward records deleted.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to revert status");
    } finally {
      setReversionDialog(null);
    }
  }, [reversionDialog, user?.id, queryClient]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Tree Orders</h1>
          <p className="text-muted-foreground mt-1">Manage and track tree planting orders across all contributions</p>
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

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by contribution ID or contributor..."
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
            <SelectItem value="partially_planted">Partially Planted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : !filtered.length ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <TreePine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tree orders found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10" />
                    <SortableHead field="contribution_id" label="Contri ID" />
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trip ID</TableHead>
                    <SortableHead field="payment_date" label="Date" />
                    <SortableHead field="contribution_type" label="Type" />
                    <SortableHead field="num_trees" label="Trees" />
                    <SortableHead field="amount_transferred" label="Planting Amnt" />
                    <SortableHead field="payment_status" label="Payment Status" />
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Planting By</TableHead>
                    <SortableHead field="planting_status" label="Planting Status" />
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Dt</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-16">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((group) => {
                    const isExpanded = expandedRows.has(group.contribution_id);
                    const allSameStatus = group.trees.length > 0 && group.trees.every(t => (t.planting_status || 'waiting_to_be_assigned') === (group.trees[0].planting_status || 'waiting_to_be_assigned'));
                    const commonStatus = allSameStatus ? (group.trees[0].planting_status || 'waiting_to_be_assigned') : null;
                    const commonStatusOrder = commonStatus ? getPlantingStatusOrder(commonStatus) : -1;

                    return (
                      <>
                        <TableRow
                          key={group.contribution_id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleRow(group.contribution_id)}
                        >
                          <TableCell className="w-10 px-3">
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-medium">{group.contribution_id}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{group.trip ? (group.trip.friendly_trip_id || group.trip_id?.slice(0, 8)) : "-"}</TableCell>
                          <TableCell><DateTimeCell value={group.payment_date || group.created_at} /></TableCell>
                          <TableCell className="text-sm">
                            {group.contribution_type === "travel_agent"
                              ? <span className="text-xs font-medium text-indigo-600">Agent</span>
                              : <span className="text-xs font-medium text-teal-600">Tourist</span>}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{group.total_trees}</TableCell>
                          <TableCell className="text-sm font-medium">${group.amount_transferred.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={`whitespace-nowrap px-2 py-0.5 text-[10px] font-medium ${CONTRIBUTION_STATUS_COLORS[group.payment_status] || "bg-muted text-muted-foreground"}`}>
                              {CONTRIBUTION_STATUS_LABELS[group.payment_status] || group.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">MFC-ICLIP</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5">
                              {canEditPlantingStatus && group.trees.length > 0 ? (
                                <>
                                   <Select
                                    value={bulkSelections[group.contribution_id] || ""}
                                    onValueChange={(value) =>
                                      setBulkSelections(prev => ({ ...prev, [group.contribution_id]: value }))
                                    }
                                  >
                                    <SelectTrigger className="w-[150px] h-7 text-xs border-2 border-primary/50 bg-primary/5 hover:border-primary font-medium">
                                      <SelectValue placeholder={getGroupStatusLabel(group.planting_status)} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {BATCH_STATUSES.map((s, idx) => {
                                        const sOrder = getPlantingStatusOrder(s);
                                        const isPassed = commonStatus && sOrder < commonStatusOrder;
                                        const isCurrent = s === commonStatus;
                                        // Find the current status index within BATCH_STATUSES
                                        const currentBatchIdx = commonStatus ? BATCH_STATUSES.indexOf(commonStatus as any) : -1;
                                        const isNextStep = currentBatchIdx >= 0 && idx === currentBatchIdx + 1;
                                        const isFutureSkip = currentBatchIdx >= 0 && idx > currentBatchIdx + 1;
                                        return (
                                          <SelectItem key={s} value={s} disabled={isFutureSkip || false}>
                                            <span className={`flex items-center gap-2 ${isFutureSkip ? 'opacity-40' : ''}`}>
                                              {isPassed && <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />}
                                              {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                                              {isNextStep && <Circle className="h-3 w-3 text-primary shrink-0" />}
                                              {!isPassed && !isCurrent && !isNextStep && <span className="w-3 shrink-0" />}
                                              <span className={isCurrent ? "font-semibold" : ""}>{STATUS_LABELS[s]}</span>
                                            </span>
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                  {bulkSelections[group.contribution_id] && (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="h-7 px-2 text-xs gap-1"
                                        disabled={bulkUpdateStatus.isPending}
                                        onClick={() => handleBulkApply(group.contribution_id, group.trees.map(t => t.id))}
                                      >
                                        <CheckCheck className="h-3 w-3" />
                                        Apply
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-1.5 text-xs text-muted-foreground hover:text-destructive"
                                        onClick={() => setBulkSelections(prev => {
                                          const next = { ...prev };
                                          delete next[group.contribution_id];
                                          return next;
                                        })}
                                      >
                                        <XIcon className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-[200px] text-xs">
                                        Batch update — changes planting status for all individual trees in this order.
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </>
                              ) : (
                                <Badge className={`whitespace-nowrap px-2 py-0.5 text-[10px] font-medium ${getGroupStatusColor(group.planting_status)}`}>
                                  {getGroupStatusLabel(group.planting_status)}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {group.status_date ? (
                              <div>
                                <div>{format(new Date(group.status_date), "d MMM yyyy")}</div>
                                <div className="text-[10px] text-muted-foreground/70">{format(new Date(group.status_date), "hh:mm a")}</div>
                              </div>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/stakeholder/orders/${group.contribution_id}/operations`)}>
                                  <Eye className="h-3.5 w-3.5 mr-2" />
                                  Tree Operations
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setViewSheet(group)}>
                                  <Eye className="h-3.5 w-3.5 mr-2" />
                                  Contribution Info
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  const firstTree = group.trees[0];
                                  if (firstTree) {
                                    setStatusHistoryTree(firstTree);
                                    setStatusHistoryGroup(group);
                                  }
                                }}>
                                  <Eye className="h-3.5 w-3.5 mr-2" />
                                   Planting Overview
                                </DropdownMenuItem>
                                {isPlantationType && (
                                <DropdownMenuItem onClick={() => {
                                  setMonitoringSheet(group);
                                  setMonitoringForm({ inspection_id: '', inspection_date: '', inspected_by: '', notes: '', photos: '' });
                                }}>
                                  <ClipboardList className="h-3.5 w-3.5 mr-2" />
                                  Monitoring Logs
                                </DropdownMenuItem>
                                )}
                                {isPlantationType && (
                                  (group.trees[0]?.planting_status === 'planted' || group.trees[0]?.planting_status === 'verified') ? (
                                    <DropdownMenuItem onClick={() => {
                                      setImpactSheet(group);
                                      setImpactForm({ co2_offset_estimated: '', co2_offset_actual: '', calculation_method: '', biodiversity_index: '', soil_improvement_indicator: '', water_retention_indicator: '', jobs_created: '', local_participants_count: '', community_benefits: '' });
                                    }}>
                                      <BarChart3 className="h-3.5 w-3.5 mr-2" />
                                      Impact Generated
                                    </DropdownMenuItem>
                                  ) : (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground/50 cursor-not-allowed">
                                            <BarChart3 className="h-3.5 w-3.5 mr-2" />
                                            Impact Generated
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Tree not yet planted</p></TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Tree Details */}
                        {isExpanded && (
                          <TableRow key={`${group.contribution_id}-expanded`} className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={11} className="p-0">
                              <div className="px-4 py-3 space-y-3">
                                {/* Tree-level Table */}
                                {(() => {
                                  const matchedTrees = group.trees;
                                  const expectedCount = group.total_trees;
                                  const displayRows: Array<{ type: 'tree'; tree: Tree } | { type: 'placeholder'; index: number }> = 
                                    matchedTrees.map(t => ({ type: 'tree' as const, tree: t }));
                                  
                                  if (matchedTrees.length < expectedCount) {
                                    for (let i = matchedTrees.length; i < expectedCount; i++) {
                                      displayRows.push({ type: 'placeholder' as const, index: i });
                                    }
                                  }

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

                                  return displayRows.length > 0 ? (
                                  <div className="rounded-lg border bg-background overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                         <TableRow className="bg-muted/50">
                                          <TableHead className="w-12 text-xs">No.</TableHead>
                                          <TableHead className="text-xs">Tree ID</TableHead>
                                          <TableHead className="text-xs">Trees</TableHead>
                                          <TableHead className="text-xs">Planting Status</TableHead>
                                          <TableHead className="text-xs">Growth Stage</TableHead>
                                          <TableHead className="text-xs">Survival Status</TableHead>
                                          <TableHead className="text-xs">Last Checked</TableHead>
                                          <TableHead className="text-xs">Track</TableHead>
                                          {isPlantationType && <TableHead className="text-xs">Geotag</TableHead>}
                                          <TableHead className="text-xs w-12"></TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {displayRows.map((row, index) => {
                                          if (row.type === 'tree') {
                                            const tree = row.tree;
                                            const hasGeotag = allGeotags?.has(tree.id) || false;
                                            const survivalData = allSurvivalStatuses?.get(tree.id);
                                            const growthData = allGrowthStages?.get(tree.id);
                                            return (
                                              <TableRow key={tree.id}>
                                                <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                                <TableCell className="font-mono text-sm">{tree.otot_id}</TableCell>
                                                <TableCell>{tree.num_trees}</TableCell>
                                                <TableCell>
                                                  <Badge className={`text-xs whitespace-nowrap px-2 py-0.5 font-medium ${PLANTING_STATUS_COLORS[tree.planting_status || 'waiting_to_be_assigned'] || ''}`}>
                                                    {STATUS_LABELS[tree.planting_status || 'waiting_to_be_assigned']}
                                                  </Badge>
                                                </TableCell>
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
                                                <TableCell>
                                                  {survivalData?.last_checked_date ? (
                                                    <span className="text-xs text-muted-foreground">{formatDate(survivalData.last_checked_date)}</span>
                                                  ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {hasGeotag && allGeotags instanceof Map && allGeotags.get(tree.id) ? (() => {
                                                    const geo = allGeotags.get(tree.id)!;
                                                    return (
                                                      <a
                                                        href={`https://www.google.com/maps?q=${geo.latitude},${geo.longitude}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex"
                                                        title={`${geo.latitude}, ${geo.longitude}`}
                                                      >
                                                        <MapPin className="h-4 w-4 text-green-600 hover:text-green-800 cursor-pointer" />
                                                      </a>
                                                    );
                                                  })() : (
                                                    <MapPin className="h-4 w-4 text-muted-foreground/40" />
                                                  )}
                                                </TableCell>
                                                {isPlantationType && (
                                                <TableCell>
                                                  {tree.planting_status === 'planted' ? (
                                                    <Switch
                                                      checked={hasGeotag}
                                                      onCheckedChange={() => {
                                                        if (!hasGeotag) {
                                                          setGeotagDialog(tree);
                                                          setGeotagForm({ geo_tag_id: '', latitude: '', longitude: '', geo_accuracy: '', map_snapshot: '' });
                                                        }
                                                      }}
                                                      disabled={hasGeotag}
                                                      className="data-[state=checked]:bg-green-500"
                                                    />
                                                  ) : (
                                                    <TooltipProvider>
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <Switch checked={false} disabled className="opacity-50" />
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>Tree not yet planted</p></TooltipContent>
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                  )}
                                                </TableCell>
                                                )}
                                                <TableCell>
                                                  {isPlantationType ? (
                                                    <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                                          <MoreVertical className="h-3.5 w-3.5" />
                                                        </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setTreeStatusSheet({ tree, group })}>
                                                          <Eye className="h-3.5 w-3.5 mr-2" />
                                                          Tree Status & Info
                                                        </DropdownMenuItem>
                                                        {tree.planting_status === 'planted' ? (
                                                          <DropdownMenuItem onClick={() => {
                                                            setGrowthSheet(tree);
                                                            setSurvivalForm({ survival_status: 'Alive', survival_rate: '', last_checked_date: '', notes: '' });
                                                            setGrowthForm({ growth_stage: 'sapling', tree_height: '', tree_age: '', photos: '', last_measured_date: '', notes: '' });
                                                          }}>
                                                            <TrendingUp className="h-3.5 w-3.5 mr-2" />
                                                            Growth Metrics
                                                          </DropdownMenuItem>
                                                        ) : (
                                                          <TooltipProvider>
                                                            <Tooltip>
                                                              <TooltipTrigger asChild>
                                                                <DropdownMenuItem disabled className="opacity-50">
                                                                  <TrendingUp className="h-3.5 w-3.5 mr-2" />
                                                                  Growth Metrics
                                                                </DropdownMenuItem>
                                                              </TooltipTrigger>
                                                              <TooltipContent><p>Tree not yet planted</p></TooltipContent>
                                                            </Tooltip>
                                                          </TooltipProvider>
                                                        )}
                                                      </DropdownMenuContent>
                                                    </DropdownMenu>
                                                  ) : (
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className="h-6 text-[11px] px-2 font-medium"
                                                      onClick={() => setTreeStatusSheet({ tree, group })}
                                                    >
                                                      Tree Info
                                                    </Button>
                                                  )}
                                                </TableCell>
                                              </TableRow>
                                            );
                                          } else {
                                            return (
                                              <TableRow key={`placeholder-${index}`} className="opacity-60">
                                                <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground italic">Pending assignment</TableCell>
                                                <TableCell>1</TableCell>
                                                <TableCell>
                                                  <Badge className={`text-xs whitespace-nowrap px-2 py-0.5 font-medium ${PLANTING_STATUS_COLORS['waiting_to_be_assigned']}`}>
                                                    {STATUS_LABELS['waiting_to_be_assigned']}
                                                  </Badge>
                                                </TableCell>
                                                <TableCell><span className="text-xs text-muted-foreground">—</span></TableCell>
                                                <TableCell><span className="text-xs text-muted-foreground">—</span></TableCell>
                                                <TableCell><span className="text-xs text-muted-foreground">—</span></TableCell>
                                                <TableCell><MapPin className="h-4 w-4 text-muted-foreground/40" /></TableCell>
                                                {isPlantationType && <TableCell>-</TableCell>}
                                                <TableCell></TableCell>
                                              </TableRow>
                                            );
                                          }
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground py-2">No tree records linked to this contribution.</p>
                                );
                                })()}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
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

      {/* View Details Sheet */}
      <Sheet open={!!viewSheet} onOpenChange={(open) => !open && setViewSheet(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {viewSheet && (() => {
            const trip = viewSheet.trip;
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <TreePine className="h-5 w-5 text-primary" />
                    Contribution {viewSheet.contribution_id}
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Contribution Details */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contribution Details</h3>
                    <div className="rounded-lg border bg-card p-4">
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Contributor</span>
                          <p className="font-medium">{viewSheet.tourist_name || "-"}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground text-xs">Country</span>
                          <p className="font-medium">{viewSheet.country || "-"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Type</span>
                          <p className="font-medium">
                            {viewSheet.contribution_type === "travel_agent"
                              ? <span className="text-xs font-medium text-indigo-600">Agent</span>
                              : <span className="text-xs font-medium text-teal-600">Tourist</span>}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground text-xs">Trees</span>
                          <p className="font-medium">{viewSheet.total_trees}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Total Amount</span>
                          <p className="font-medium">${viewSheet.total_amount.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground text-xs">Allocated for Planting</span>
                          <p className="font-medium">${viewSheet.amount_transferred.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Date</span>
                          <p className="font-medium">{formatDate(viewSheet.payment_date || viewSheet.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground text-xs">Planting By</span>
                          <p className="font-medium">MFC-ICLIP</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Payment Status</span>
                          <div className="mt-0.5">
                            <Badge className={`whitespace-nowrap px-2 py-0.5 text-[10px] font-medium ${CONTRIBUTION_STATUS_COLORS[viewSheet.payment_status] || "bg-muted text-muted-foreground"}`}>
                              {CONTRIBUTION_STATUS_LABELS[viewSheet.payment_status] || viewSheet.payment_status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground text-xs">Planting Status</span>
                          <div className="mt-0.5">
                            <Badge className={`whitespace-nowrap px-2 py-0.5 text-[10px] font-medium ${getGroupStatusColor(viewSheet.planting_status)}`}>
                              {getGroupStatusLabel(viewSheet.planting_status)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {trip && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Trip Details</h3>
                        <div className="rounded-lg border bg-card p-4 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Trip ID</span>
                            <span className="text-sm font-medium">{trip.friendly_trip_id || trip.id.slice(0, 8)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Route</span>
                            <span className="text-sm font-medium">{trip.origin_airport} → {trip.destination_airport}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Travel Class</span>
                            <span className="text-sm font-medium">{trip.travel_class}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total CO₂</span>
                            <span className="text-sm font-semibold">{Number(trip.total_co2).toFixed(1)} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Flight CO₂</span>
                            <span className="text-sm font-medium">{Number(trip.flight_co2).toFixed(1)} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Travelers</span>
                            <span className="text-sm font-medium">{trip.num_travelers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Travel Date</span>
                            <span className="text-sm font-medium">{formatDate(trip.from_date)}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Offset Progress */}
                  {(() => {
                    // Calculate total trees planted across ALL contributions for this trip
                    const tripId = viewSheet.trip_id;
                    const allTripGroups = tripId ? contributionGroups.filter(g => g.trip_id === tripId) : [viewSheet];
                    // Total trees contributed/purchased across all contributions for this trip
                    const treesPlanted = allTripGroups.reduce((s, g) => s + g.total_trees, 0);
                    const treesNeeded = trip ? trip.trees_needed : viewSheet.total_trees;
                    const progressPct = treesNeeded > 0 ? Math.round((treesPlanted / treesNeeded) * 100) : 0;
                    return (
                      <div className="space-y-3">
                        <div className="rounded-lg border bg-emerald-50/50 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Leaf className="h-5 w-5 text-emerald-600" />
                              <span className="font-semibold text-sm">Offset Progress</span>
                            </div>
                            <span className="text-sm font-bold text-emerald-600">{progressPct}%</span>
                          </div>
                          <Progress value={progressPct} className="h-2 bg-emerald-100 [&>div]:bg-emerald-500" />
                          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                            <span className="text-emerald-600 font-medium">{treesPlanted} committed</span>
                            <span>{treesNeeded} needed</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <Separator />

                  {/* All Contributions for this trip */}
                  {(() => {
                    const tripId = viewSheet.trip_id;
                    const allTripGroups = tripId ? contributionGroups.filter(g => g.trip_id === tripId) : [viewSheet];
                    const totalTrees = allTripGroups.reduce((s, g) => s + g.total_trees, 0);
                    const totalAmount = allTripGroups.reduce((s, g) => s + g.total_amount, 0);
                    return (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          All Contributions ({allTripGroups.length})
                        </h3>
                        <div className="rounded-lg border bg-card overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30">
                                <TableHead className="text-xs font-semibold">Date</TableHead>
                                <TableHead className="text-xs font-semibold">Trees</TableHead>
                                <TableHead className="text-xs font-semibold">Method</TableHead>
                                <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {allTripGroups.map((group, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="text-sm">{formatDate(group.payment_date || group.created_at)}</TableCell>
                                  <TableCell className="text-sm font-medium">{group.total_trees}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{group.payment_method || "-"}</TableCell>
                                  <TableCell className="text-sm font-semibold text-right">${group.total_amount.toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="border-t-2">
                                <TableCell className="text-sm font-bold">Total</TableCell>
                                <TableCell className="text-sm font-bold">{totalTrees}</TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-sm font-bold text-right">${totalAmount.toFixed(2)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Status Transition Panel */}
      <StatusTransitionPanel
        open={transitionPanelOpen}
        onClose={() => {
          setTransitionPanelOpen(false);
          setTransitionRequest(null);
        }}
        request={transitionRequest}
        onConfirm={async (req, transitionData, photoUrls) => {
          // 1. Update planting status for all trees
          const { error: updateError } = await supabase
            .from("trees")
            .update({ 
              planting_status: req.toStatus as any,
              ...(req.toStatus === "being_mapped" && !req.isBatch && transitionData.latitude ? {
                latitude: parseFloat(transitionData.latitude),
                longitude: parseFloat(transitionData.longitude),
              } : {}),
            })
            .in("id", req.treeIds);
          if (updateError) throw updateError;

          // 2. Save transition records for each tree
          const records = req.treeIds.map(treeId => ({
            tree_id: treeId,
            contribution_id: req.contributionId || null,
            from_status: req.fromStatus,
            to_status: req.toStatus,
            transition_data: transitionData,
            photos: photoUrls,
            created_by: user?.id || null,
          }));
          const { error: insertError } = await supabase
            .from("tree_status_transitions" as any)
            .insert(records);
          if (insertError) throw insertError;

          // 3. Refresh data
          queryClient.invalidateQueries({ queryKey: ["stakeholderOrderTrees"] });
          setBulkSelections({});
          toast.success(`Updated ${req.treeIds.length} tree(s) to ${STATUS_LABELS[req.toStatus]}`);
        }}
      />

      {/* Status Reversion Confirmation Dialog */}
      <AlertDialog open={!!reversionDialog} onOpenChange={(open) => !open && setReversionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Status Reversion
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to revert {reversionDialog?.treeIds.length === 1 ? "1 tree" : `${reversionDialog?.treeIds.length} trees`} from{" "}
                <span className="font-semibold text-foreground">{STATUS_LABELS[reversionDialog?.fromStatus || ""]}</span> back to{" "}
                <span className="font-semibold text-foreground">{STATUS_LABELS[reversionDialog?.toStatus || ""]}</span>.
              </p>
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm space-y-1">
                <p className="font-medium text-destructive">⚠️ This action will:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  <li>Delete all status transition records beyond the selected stage</li>
                  <li>Remove any associated data captured during forward transitions</li>
                  <li>This may result in <span className="font-medium text-foreground">permanent data loss</span></li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel (recommended)</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReversionConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Proceed with Reversion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Status & Info Sheet - 3 Tabs */}
      <Sheet open={!!statusHistoryTree} onOpenChange={(open) => { if (!open) { setStatusHistoryTree(null); setStatusHistoryGroup(null); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {statusHistoryTree && (() => {
            const currentStatus = statusHistoryTree.planting_status || 'waiting_to_be_assigned';
            const currentOrder = getPlantingStatusOrder(currentStatus);
            const treeCount = statusHistoryGroup?.total_trees || 1;
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
                    Planting Overview ({treeCount} tree{treeCount !== 1 ? 's' : ''})
                  </SheetTitle>
                </SheetHeader>

                <Tabs defaultValue="planting" className="mt-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="planting">Planting</TabsTrigger>
                    <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                    <TabsTrigger value="impact">Impact</TabsTrigger>
                  </TabsList>

                  {/* Planting Tab - existing status history */}
                  <TabsContent value="planting">
                    <div className="divide-y">
                      {/* Waiting to be assigned - non-expandable */}
                      {(() => {
                        const purchaseDate = statusHistoryTree.created_at;
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
                          const transition = treeTransitions?.find(t => t.to_status === status);
                          const transitionData = transition?.transition_data || {};
                          const photos = transition?.photos || [];

                          const skipKeys = new Set<string>(['reverted']);
                          for (const [idKey, labelKey] of Object.entries(idToLabelMap)) {
                            if (transitionData[labelKey] !== undefined) skipKeys.add(idKey);
                          }
                          if (status === 'verified' && transitionData['planter_name'] !== undefined) {
                            skipKeys.add('planter_name');
                          }
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
                                          const label = friendlyLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                                          const displayValue = resolveValue(key, value, transitionData as Record<string, unknown>);
                                          return (
                                            <React.Fragment key={key}>
                                              <span className="text-muted-foreground">{label}:</span>
                                              <span className="font-medium">{displayValue}</span>
                                            </React.Fragment>
                                          );
                                        })}
                                      </div>
                                    )}
                                    {photos.length > 0 && (
                                      <div className="space-y-2">
                                        <span className="text-sm text-muted-foreground">Photos:</span>
                                        <div className="grid grid-cols-3 gap-2">
                                          {photos.map((url: string, i: number) => (
                                            <div key={i} className="relative group cursor-pointer" onClick={() => setLightboxPhoto(url)}>
                                              <img src={url} alt={`Photo ${i + 1}`} className="rounded-md border object-cover h-20 w-full" />
                                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                                                <ZoomIn className="h-5 w-5 text-white" />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {entries.length === 0 && photos.length === 0 && (
                                      <p className="text-sm text-muted-foreground italic">Status recorded with no additional details.</p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic py-1 pl-8">
                                    {isFuture ? 'This status has not been reached yet.' : 'No transition record captured for this status.'}
                                  </p>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </div>
                  </TabsContent>

                  {/* Monitoring Tab */}
                  <TabsContent value="monitoring">
                    <div className="space-y-4 py-2">
                      {monitoringLogs && monitoringLogs.length > 0 ? (
                        <div className="space-y-3">
                          {monitoringLogs.map((log: any) => (
                            <div key={log.id} className="rounded-lg border bg-card p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold">{log.inspection_id}</span>
                                <span className="text-xs text-muted-foreground">{log.inspection_date ? format(new Date(log.inspection_date), "dd MMM yyyy") : '-'}</span>
                              </div>
                              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                                <span className="text-muted-foreground">Inspected By:</span>
                                <span className="font-medium">{log.inspected_by}</span>
                                {log.notes && <>
                                  <span className="text-muted-foreground">Notes:</span>
                                  <span>{log.notes}</span>
                                </>}
                              </div>
                              {log.photos && log.photos.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 pt-1">
                                  {log.photos.map((url: string, i: number) => (
                                    <div key={i} className="relative group cursor-pointer" onClick={() => setLightboxPhoto(url)}>
                                      <img src={url} alt={`Photo ${i + 1}`} className="rounded-md border object-cover h-16 w-full" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                                        <ZoomIn className="h-4 w-4 text-white" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic text-center py-6">No monitoring logs recorded yet.</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Impact Tab */}
                  <TabsContent value="impact">
                    <div className="space-y-4 py-2">
                      {impactMetrics && impactMetrics.length > 0 ? (
                        impactMetrics.map((metric: any) => (
                          <div key={metric.id} className="space-y-4">
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Carbon Metrics</h4>
                              <div className="rounded-lg border bg-card p-3">
                                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                                  <span className="text-muted-foreground">CO₂ Offset (Estimated):</span>
                                  <span className="font-medium">{metric.co2_offset_estimated || '-'} kg</span>
                                  <span className="text-muted-foreground">CO₂ Offset (Actual):</span>
                                  <span className="font-medium">{metric.co2_offset_actual || '-'} kg</span>
                                  <span className="text-muted-foreground">Calculation Method:</span>
                                  <span className="font-medium">{metric.calculation_method || '-'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ecosystem Impact</h4>
                              <div className="rounded-lg border bg-card p-3">
                                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                                  <span className="text-muted-foreground">Biodiversity Index:</span>
                                  <span className="font-medium">{metric.biodiversity_index || '-'}</span>
                                  <span className="text-muted-foreground">Soil Improvement:</span>
                                  <span className="font-medium">{metric.soil_improvement_indicator || '-'}</span>
                                  <span className="text-muted-foreground">Water Retention:</span>
                                  <span className="font-medium">{metric.water_retention_indicator || '-'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Community Impact</h4>
                              <div className="rounded-lg border bg-card p-3">
                                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                                  <span className="text-muted-foreground">Jobs Created:</span>
                                  <span className="font-medium">{metric.jobs_created || 0}</span>
                                  <span className="text-muted-foreground">Local Participants:</span>
                                  <span className="font-medium">{metric.local_participants_count || 0}</span>
                                  <span className="text-muted-foreground">Community Benefits:</span>
                                  <span className="font-medium">{metric.community_benefits || '-'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground italic text-center py-6">No impact data recorded yet.</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Monitoring Logs Sheet */}
      <Sheet open={!!monitoringSheet} onOpenChange={(open) => !open && setMonitoringSheet(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {monitoringSheet && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Periodic Monitoring Logs
                </SheetTitle>
                <p className="text-sm text-muted-foreground">{monitoringSheet.contribution_id}</p>
               </SheetHeader>
               <Tabs defaultValue="new" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="new">New Log</TabsTrigger>
                  <TabsTrigger value="previous">Previous Logs{monitoringLogs && monitoringLogs.length > 0 ? ` (${monitoringLogs.length})` : ''}</TabsTrigger>
                </TabsList>
                <TabsContent value="new">
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label>Inspection ID *</Label>
                      <Input value={monitoringForm.inspection_id} onChange={(e) => setMonitoringForm(f => ({ ...f, inspection_id: e.target.value }))} placeholder="e.g. INS-001" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date *</Label>
                      <Input type="date" value={monitoringForm.inspection_date} onChange={(e) => setMonitoringForm(f => ({ ...f, inspection_date: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Inspected By *</Label>
                      <Input value={monitoringForm.inspected_by} onChange={(e) => setMonitoringForm(f => ({ ...f, inspected_by: e.target.value }))} placeholder="Inspector name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Notes</Label>
                      <Textarea value={monitoringForm.notes} onChange={(e) => setMonitoringForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observation notes..." rows={3} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Photos (comma-separated URLs)</Label>
                      <Input value={monitoringForm.photos} onChange={(e) => setMonitoringForm(f => ({ ...f, photos: e.target.value }))} placeholder="https://..." />
                    </div>
                    <Button
                      className="w-full"
                      disabled={!monitoringForm.inspection_id || !monitoringForm.inspection_date || !monitoringForm.inspected_by}
                      onClick={async () => {
                        const photos = monitoringForm.photos ? monitoringForm.photos.split(',').map(u => u.trim()).filter(Boolean) : [];
                        const { error } = await supabase.from("monitoring_logs" as any).insert({
                          contribution_id: monitoringSheet.contribution_id,
                          inspection_id: monitoringForm.inspection_id,
                          inspection_date: monitoringForm.inspection_date,
                          inspected_by: monitoringForm.inspected_by,
                          notes: monitoringForm.notes || null,
                          photos,
                          created_by: user?.id || null,
                        });
                        if (error) { toast.error(error.message); return; }
                        toast.success("Monitoring log saved");
                        refetchMonitoring();
                        setMonitoringForm({ inspection_id: '', inspection_date: '', inspected_by: '', notes: '', photos: '' });
                      }}
                    >
                      Save Monitoring Log
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="previous">
                  <div className="space-y-3 pt-2">
                    {monitoringLogs && monitoringLogs.length > 0 ? (
                      monitoringLogs.map((log: any) => (
                        <div key={log.id} className="rounded-lg border bg-card p-3 space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold">{log.inspection_id}</span>
                            <span className="text-xs text-muted-foreground">{log.inspection_date ? format(new Date(log.inspection_date), "dd MMM yyyy") : '-'}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">By: {log.inspected_by}</p>
                          {log.notes && <p className="text-sm">{log.notes}</p>}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-6">No monitoring logs recorded yet.</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Impact Generated Sheet */}
      <Sheet open={!!impactSheet} onOpenChange={(open) => !open && setImpactSheet(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {impactSheet && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Impact Generated
                </SheetTitle>
                <p className="text-sm text-muted-foreground">{impactSheet.contribution_id}</p>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                {/* Carbon Metrics */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Carbon Metrics</h4>
                  <div className="space-y-1.5">
                    <Label>CO₂ Offset Estimated (kg)</Label>
                    <Input type="number" value={impactForm.co2_offset_estimated} onChange={(e) => setImpactForm(f => ({ ...f, co2_offset_estimated: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>CO₂ Offset Actual (kg)</Label>
                    <Input type="number" value={impactForm.co2_offset_actual} onChange={(e) => setImpactForm(f => ({ ...f, co2_offset_actual: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Calculation Method</Label>
                    <Input value={impactForm.calculation_method} onChange={(e) => setImpactForm(f => ({ ...f, calculation_method: e.target.value }))} placeholder="e.g. IPCC standard" />
                  </div>
                </div>

                <Separator />

                {/* Ecosystem Impact */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ecosystem Impact</h4>
                  <div className="space-y-1.5">
                    <Label>Biodiversity Index</Label>
                    <Input type="number" step="0.01" value={impactForm.biodiversity_index} onChange={(e) => setImpactForm(f => ({ ...f, biodiversity_index: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Soil Improvement Indicator</Label>
                    <Input value={impactForm.soil_improvement_indicator} onChange={(e) => setImpactForm(f => ({ ...f, soil_improvement_indicator: e.target.value }))} placeholder="e.g. Improved / Stable" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Water Retention Indicator</Label>
                    <Input value={impactForm.water_retention_indicator} onChange={(e) => setImpactForm(f => ({ ...f, water_retention_indicator: e.target.value }))} placeholder="e.g. High / Medium / Low" />
                  </div>
                </div>

                <Separator />

                {/* Community Impact */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Community Impact</h4>
                  <div className="space-y-1.5">
                    <Label>Jobs Created</Label>
                    <Input type="number" value={impactForm.jobs_created} onChange={(e) => setImpactForm(f => ({ ...f, jobs_created: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Local Participants Count</Label>
                    <Input type="number" value={impactForm.local_participants_count} onChange={(e) => setImpactForm(f => ({ ...f, local_participants_count: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Community Benefits</Label>
                    <Textarea value={impactForm.community_benefits} onChange={(e) => setImpactForm(f => ({ ...f, community_benefits: e.target.value }))} placeholder="Describe community benefits..." rows={3} />
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={async () => {
                    const { error } = await supabase.from("impact_metrics" as any).insert({
                      contribution_id: impactSheet.contribution_id,
                      co2_offset_estimated: impactForm.co2_offset_estimated ? parseFloat(impactForm.co2_offset_estimated) : 0,
                      co2_offset_actual: impactForm.co2_offset_actual ? parseFloat(impactForm.co2_offset_actual) : null,
                      calculation_method: impactForm.calculation_method || null,
                      biodiversity_index: impactForm.biodiversity_index ? parseFloat(impactForm.biodiversity_index) : null,
                      soil_improvement_indicator: impactForm.soil_improvement_indicator || null,
                      water_retention_indicator: impactForm.water_retention_indicator || null,
                      jobs_created: impactForm.jobs_created ? parseInt(impactForm.jobs_created) : 0,
                      local_participants_count: impactForm.local_participants_count ? parseInt(impactForm.local_participants_count) : 0,
                      community_benefits: impactForm.community_benefits || null,
                      created_by: user?.id || null,
                    });
                    if (error) { toast.error(error.message); return; }
                    toast.success("Impact data saved");
                    refetchImpact();
                    setImpactForm({ co2_offset_estimated: '', co2_offset_actual: '', calculation_method: '', biodiversity_index: '', soil_improvement_indicator: '', water_retention_indicator: '', jobs_created: '', local_participants_count: '', community_benefits: '' });
                  }}
                >
                  Save Impact Data
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Tree Status & Info Sheet (individual tree level) */}
      <Sheet open={!!treeStatusSheet} onOpenChange={(open) => { if (!open) setTreeStatusSheet(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {treeStatusSheet && (() => {
            const tree = treeStatusSheet.tree;
            const group = treeStatusSheet.group;
            const currentStatus = tree.planting_status || 'waiting_to_be_assigned';
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
                  <p className="text-xs text-muted-foreground">Tree ID: {tree.otot_id}</p>
                </SheetHeader>

                <Tabs defaultValue="planting" className="mt-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="planting">Planting</TabsTrigger>
                    <TabsTrigger value="tracking">Tracking</TabsTrigger>
                    <TabsTrigger value="growth">Growth</TabsTrigger>
                  </TabsList>

                  {/* Planting Tab - same status timeline from batch */}
                  <TabsContent value="planting">
                    <div className="divide-y">
                      {(() => {
                        const purchaseDate = tree.created_at;
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
                          const transition = treeTransitions?.find(t => t.to_status === status);
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

                  {/* Tracking Tab - Geotag data */}
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
                        <p className="text-sm text-muted-foreground italic text-center py-6">No geotag data captured yet. Use the Geotag toggle to capture location.</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Growth Tab - Survival + Growth Metrics */}
                  <TabsContent value="growth">
                    <div className="space-y-5 pt-2">
                      {/* Survival Tracking Table */}
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

                      {/* Growth Metrics Table */}
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

      {/* Geotag Capture Dialog */}
      <Dialog open={!!geotagDialog} onOpenChange={(open) => !open && setGeotagDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Capture Geotag
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Tree: {geotagDialog?.otot_id}</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Geo Tag ID *</Label>
              <Input value={geotagForm.geo_tag_id} onChange={(e) => setGeotagForm(f => ({ ...f, geo_tag_id: e.target.value }))} placeholder="e.g. GT-001" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Latitude *</Label>
                <Input type="number" step="any" value={geotagForm.latitude} onChange={(e) => setGeotagForm(f => ({ ...f, latitude: e.target.value }))} placeholder="-1.2921" />
              </div>
              <div className="space-y-1.5">
                <Label>Longitude *</Label>
                <Input type="number" step="any" value={geotagForm.longitude} onChange={(e) => setGeotagForm(f => ({ ...f, longitude: e.target.value }))} placeholder="36.8219" />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setGeotagForm(f => ({
                        ...f,
                        latitude: pos.coords.latitude.toString(),
                        longitude: pos.coords.longitude.toString(),
                        geo_accuracy: pos.coords.accuracy.toString(),
                      }));
                      toast.success("Location captured");
                    },
                    (err) => toast.error("Could not get location: " + err.message)
                  );
                } else {
                  toast.error("Geolocation not supported");
                }
              }}
            >
              <Crosshair className="h-4 w-4" />
              Capture from Current Location
            </Button>
            <div className="space-y-1.5">
              <Label>Accuracy (m)</Label>
              <Input type="number" step="any" value={geotagForm.geo_accuracy} onChange={(e) => setGeotagForm(f => ({ ...f, geo_accuracy: e.target.value }))} placeholder="e.g. 5" />
            </div>
            <div className="space-y-1.5">
              <Label>Map Snapshot URL</Label>
              <Input value={geotagForm.map_snapshot} onChange={(e) => setGeotagForm(f => ({ ...f, map_snapshot: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGeotagDialog(null)}>Cancel</Button>
            <Button
              disabled={!geotagForm.geo_tag_id || !geotagForm.latitude || !geotagForm.longitude}
              onClick={async () => {
                const { error } = await supabase.from("tree_geotags" as any).insert({
                  tree_id: geotagDialog!.id,
                  geo_tag_id: geotagForm.geo_tag_id,
                  latitude: parseFloat(geotagForm.latitude),
                  longitude: parseFloat(geotagForm.longitude),
                  geo_accuracy: geotagForm.geo_accuracy ? parseFloat(geotagForm.geo_accuracy) : null,
                  map_snapshot: geotagForm.map_snapshot || null,
                  created_by: user?.id || null,
                });
                if (error) { toast.error(error.message); return; }
                toast.success("Geotag saved");
                queryClient.invalidateQueries({ queryKey: ["allGeotags"] });
                refetchGeotag();
                setGeotagDialog(null);
              }}
            >
              Save Geotag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Growth Data Entry Sheet */}
      <Sheet open={!!growthSheet} onOpenChange={(open) => !open && setGrowthSheet(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {growthSheet && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Growth Metrics
                </SheetTitle>
                <p className="text-sm text-muted-foreground">Tree: {growthSheet.otot_id}</p>
              </SheetHeader>

              <Tabs defaultValue="survival" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="survival">Sapling Tracking</TabsTrigger>
                  <TabsTrigger value="growth">Growth in Progress</TabsTrigger>
                </TabsList>

                <TabsContent value="survival">
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label>Survival Status *</Label>
                      <Select value={survivalForm.survival_status} onValueChange={(v) => setSurvivalForm(f => ({ ...f, survival_status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Alive">Alive</SelectItem>
                          <SelectItem value="Dead">Dead</SelectItem>
                          <SelectItem value="Replaced">Replaced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Survival Rate (%)</Label>
                      <Input type="number" min="0" max="100" value={survivalForm.survival_rate} onChange={(e) => setSurvivalForm(f => ({ ...f, survival_rate: e.target.value }))} placeholder="e.g. 85" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Last Checked Date *</Label>
                      <Input type="date" value={survivalForm.last_checked_date} onChange={(e) => setSurvivalForm(f => ({ ...f, last_checked_date: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Notes</Label>
                      <Textarea value={survivalForm.notes} onChange={(e) => setSurvivalForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observations..." rows={3} />
                    </div>
                    <Button
                      className="w-full"
                      disabled={!survivalForm.last_checked_date}
                      onClick={async () => {
                        const { error } = await supabase.from("tree_survival_tracking" as any).insert({
                          tree_id: growthSheet.id,
                          survival_status: survivalForm.survival_status,
                          survival_rate: survivalForm.survival_rate ? parseFloat(survivalForm.survival_rate) : null,
                          last_checked_date: survivalForm.last_checked_date,
                          notes: survivalForm.notes || null,
                          created_by: user?.id || null,
                        });
                        if (error) { toast.error(error.message); return; }
                        toast.success("Survival data saved");
                        refetchSurvival();
                        queryClient.invalidateQueries({ queryKey: ["allSurvivalStatuses"] });
                        setSurvivalForm({ survival_status: 'Alive', survival_rate: '', last_checked_date: '', notes: '' });
                      }}
                    >
                      Save Survival Record
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="growth">
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label>Growth Stage *</Label>
                      <Select value={growthForm.growth_stage} onValueChange={(v) => setGrowthForm(f => ({ ...f, growth_stage: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sapling">Sapling</SelectItem>
                          <SelectItem value="young">Young</SelectItem>
                          <SelectItem value="mature">Mature</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tree Height (cm/m)</Label>
                      <Input value={growthForm.tree_height} onChange={(e) => setGrowthForm(f => ({ ...f, tree_height: e.target.value }))} placeholder="e.g. 150cm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tree Age</Label>
                      <Input value={growthForm.tree_age} onChange={(e) => setGrowthForm(f => ({ ...f, tree_age: e.target.value }))} placeholder="e.g. 6 months" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Photos (comma-separated URLs)</Label>
                      <Input value={growthForm.photos} onChange={(e) => setGrowthForm(f => ({ ...f, photos: e.target.value }))} placeholder="https://..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Last Measured Date *</Label>
                      <Input type="date" value={growthForm.last_measured_date} onChange={(e) => setGrowthForm(f => ({ ...f, last_measured_date: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Notes</Label>
                      <Textarea value={growthForm.notes} onChange={(e) => setGrowthForm(f => ({ ...f, notes: e.target.value }))} placeholder="Growth observations..." rows={3} />
                    </div>
                    <Button
                      className="w-full"
                      disabled={!growthForm.last_measured_date}
                      onClick={async () => {
                        const photos = growthForm.photos ? growthForm.photos.split(',').map(u => u.trim()).filter(Boolean) : [];
                        const { error } = await supabase.from("tree_growth_metrics" as any).insert({
                          tree_id: growthSheet.id,
                          growth_stage: growthForm.growth_stage,
                          tree_height: growthForm.tree_height || null,
                          tree_age: growthForm.tree_age || null,
                          photos,
                          last_measured_date: growthForm.last_measured_date,
                          notes: growthForm.notes || null,
                          created_by: user?.id || null,
                        });
                        if (error) { toast.error(error.message); return; }
                        toast.success("Growth data saved");
                        refetchGrowth();
                        queryClient.invalidateQueries({ queryKey: ["allGrowthStages"] });
                        setGrowthForm({ growth_stage: 'sapling', tree_height: '', tree_age: '', photos: '', last_measured_date: '', notes: '' });
                      }}
                    >
                      Save Growth Record
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>


      {lightboxPhoto && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxPhoto(null)}>
          <div className="relative max-w-3xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxPhoto} alt="Full size" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
            <div className="absolute top-2 right-2 flex gap-2">
              <a
                href={lightboxPhoto}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="h-5 w-5" />
              </a>
              <button
                onClick={() => setLightboxPhoto(null)}
                className="p-2 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
