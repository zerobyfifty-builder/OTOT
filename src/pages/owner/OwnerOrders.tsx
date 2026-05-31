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
import { RefreshCw, TreePine, DollarSign, Clock, CheckCircle2, Eye, ChevronDown, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown, Layers, CheckCheck, Leaf, FileText, AlertTriangle, MoreVertical, ChevronLeft, Circle, Download, X as XIcon, ZoomIn, ClipboardList, BarChart3, MapPin, Crosshair, TrendingUp, Activity, Info, Maximize2, Copy, ExternalLink, User, ImageIcon } from "lucide-react";
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
import { ImpactLogSliders } from "@/components/trees/ImpactLogSliders";
import { Cloud, Globe, Users, Bell, Award, Send, FileDown, History, Calendar } from "lucide-react";
import { generateTreeCertificate } from "@/utils/certificateGenerator";
import { generateEngagementReport } from "@/utils/engagementReportGenerator";
import { PdfPreviewDialog, type PdfPreviewFile } from "@/components/ui/PdfPreviewDialog";
import { CertificatePreviewDialog } from "@/components/certificates/CertificatePreviewDialog";
import { SendUpdateDialog } from "@/components/engagement/SendUpdateDialog";
import { useEngagementActivities, useLogEngagementActivity, type EngagementActivity } from "@/hooks/useEngagementActivities";

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
  'being_mapped',
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
  being_mapped: 'Location Mapped',
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

export const OwnerOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { hasEdit, subFeatures, hasUserOverride } = useModulePermissions("tree_orders");
  // Per-action gating for the row action menu. When a per-user override exists,
  // each action is strictly opt-in (missing key = hidden). Without an override,
  // org-level access grants every action by default.
  const can = (key: string) =>
    hasUserOverride ? subFeatures[key] === true : subFeatures[key] !== false;
  const canPlantingStatus = can("tree_orders.action.planting_status");
  const canPerTreeStatus = can("tree_orders.action.per_tree_status");
  const canTreeOperations = can("tree_orders.action.tree_operations");
  const canPlantingOverview = can("tree_orders.action.planting_overview");
  const canMonitoringLogs = can("tree_orders.action.monitoring_logs");
  const canEcosystem = can("tree_orders.action.ecosystem_impact");
  const canCommunity = can("tree_orders.action.community_impact");
  const canCarbon = can("tree_orders.action.carbon_metrics");
  const canEngagement = can("tree_orders.action.engagement");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
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
  const [monitoringTab, setMonitoringTab] = useState<string>("previous");
  const [metricsTab, setMetricsTab] = useState<string>("new");
  const [impactSheet, setImpactSheet] = useState<ContributionGroup | null>(null);
  const [impactSliderType, setImpactSliderType] = useState<"carbon" | "ecosystem" | "community" | null>(null);
  const [impactSliderContribId, setImpactSliderContribId] = useState<string | null>(null);
  const [engagementSheet, setEngagementSheet] = useState<ContributionGroup | null>(null);
  const [engagementTab, setEngagementTab] = useState<string>("engagement");
  const [engagementCertPreview, setEngagementCertPreview] = useState<PdfPreviewFile | null>(null);
  const [engagementReportPreview, setEngagementReportPreview] = useState<PdfPreviewFile | null>(null);
  const [engagementCertGenerating, setEngagementCertGenerating] = useState(false);
  const [engagementReportGenerating, setEngagementReportGenerating] = useState(false);
  const [engagementSendOpen, setEngagementSendOpen] = useState(false);
  const { data: engagementActivities = [] } = useEngagementActivities(engagementSheet?.contribution_id ?? null);
  const logEngagement = useLogEngagementActivity();
  const [monitoringForm, setMonitoringForm] = useState<{ inspection_date: string; inspected_by: string; survival_rate_pct: string; trees_alive: string; trees_dead: string; trees_replaced: string; overall_health_notes: string; photos: string[] }>({ inspection_date: '', inspected_by: '', survival_rate_pct: '', trees_alive: '', trees_dead: '', trees_replaced: '', overall_health_notes: '', photos: [] });
  const [monitoringUploading, setMonitoringUploading] = useState(false);
  const [impactForm, setImpactForm] = useState({ co2_offset_estimated: '', co2_offset_actual: '', calculation_method: '', biodiversity_index: '', soil_improvement_indicator: '', water_retention_indicator: '', jobs_created: '', local_participants_count: '', community_benefits: '' });
  
  // Tree-level status & info
  const [treeStatusSheet, setTreeStatusSheet] = useState<{ tree: Tree; group: ContributionGroup } | null>(null);
  const [geotagDialog, setGeotagDialog] = useState<Tree | null>(null);
  const [geotagForm, setGeotagForm] = useState({ geo_tag_id: '', latitude: '', longitude: '', geo_accuracy: '', map_snapshot: '' });
  const [metricsSheet, setMetricsSheet] = useState<Tree | null>(null);
  const [metricsForm, setMetricsForm] = useState({
    checked_date: '',
    survival_status: 'Alive',
    survival_rate: '',
    growth_stage: 'sapling',
    tree_age: '',
    age_unit: 'months',
    tree_height: '',
    height_unit: 'cm',
    notes: '',
  });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [treePhotoIdx, setTreePhotoIdx] = useState(0);
  
  const { data: orgId } = useQuery({
    queryKey: ["ownerOrgId", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("organization_id").eq("user_id", user!.id).single();
      return data?.organization_id;
    },
    enabled: !!user?.id,
  });

  const { data: contributions, isLoading, refetch } = useQuery({
    queryKey: ["ownerOrderContributions"],
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
    queryKey: ["ownerOrderTrees"],
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
    queryKey: ["ownerOrderTrips", contributions],
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
    queryKey: ["ownerDisbursementTotal", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_disbursements")
        .select("amount, status")
        .eq("owner_org_id", orgId!);
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

  // Resolve assigned planter id from transitions, then fetch full carer record
  const assignedPlanterId = useMemo(() => {
    for (const t of (treeTransitions || []) as any[]) {
      const td = t.transition_data || {};
      if (td.assigned_to) return td.assigned_to as string;
      if (td.tree_carer_id) return td.tree_carer_id as string;
    }
    return null;
  }, [treeTransitions]);

  const { data: assignedCarer } = useQuery({
    queryKey: ["treeAssignedCarer", assignedPlanterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_carers")
        .select("id, name, photo_url, marital_status, number_of_kids, experience_years, date_registered, gender")
        .eq("id", assignedPlanterId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!assignedPlanterId,
  });

  // Query latest transition dates for all trees (for Status Dt column)
  const { data: allTransitionDates } = useQuery({
    queryKey: ["allTreeTransitionDates"],
    queryFn: async () => {
      // Fetch all transitions ordered desc (no .in filter to avoid URL length limits)
      const { data, error } = await supabase
        .from("tree_status_transitions" as any)
        .select("tree_id, to_status, created_at")
        .order("created_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      // Build map: tree_id -> latest transition date (most recent transition wins)
      const dateMap: Record<string, string> = {};
      for (const row of (data || []) as any[]) {
        if (!dateMap[row.tree_id]) {
          dateMap[row.tree_id] = row.created_at;
        }
      }
      return dateMap;
    },
  });

  // Map of tree_id -> species_name (captured at Saplings Ready stage)
  const { data: allTreeSpecies } = useQuery({
    queryKey: ["allTreeSpeciesFromSaplingsReady"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_status_transitions" as any)
        .select("tree_id, to_status, transition_data, created_at")
        .eq("to_status", "saplings_ready")
        .order("created_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of (data || []) as any[]) {
        if (!map[row.tree_id]) {
          const sp = row.transition_data?.species_name;
          if (sp) map[row.tree_id] = sp;
        }
      }
      return map;
    },
  });

  // Merge transition dates with fallback to tree updated_at/created_at
  const allTransitionDatesWithFallback = useMemo(() => {
    const dateMap: Record<string, string> = { ...(allTransitionDates || {}) };
    if (trees) {
      for (const tree of trees) {
        if (!dateMap[tree.id]) {
          dateMap[tree.id] = tree.updated_at || tree.created_at;
        }
      }
    }
    return dateMap;
  }, [allTransitionDates, trees]);

  // Query monitoring logs for batch status & monitoring sheet
  const batchContribId = statusHistoryGroup?.contribution_id || monitoringSheet?.contribution_id;
  const { data: monitoringLogs, refetch: refetchMonitoring } = useQuery({
    queryKey: ["monitoringLogs", batchContribId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_monitoring_logs" as any)
        .select("*")
        .eq("contribution_id", batchContribId!)
        .order("inspection_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!batchContribId,
  });

  // Active planters for inspector dropdown
  const { data: activePlanters } = useQuery({
    queryKey: ["activePlantersForMonitoring"],
    queryFn: async () => {
      const { data } = await supabase.from("tree_carers").select("id, name").eq("status", "Active").order("name");
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });
  const planterNameMap = useMemo(() => {
    const m = new Map<string, string>();
    (activePlanters || []).forEach(p => m.set(p.id, p.name));
    return m;
  }, [activePlanters]);

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

  // Impact log tables (Carbon / Ecosystem / Community) for the Impact tab
  const { data: carbonLogs } = useQuery({
    queryKey: ["carbon_metrics_logs", impactContribId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carbon_metrics_logs" as any)
        .select("*")
        .eq("contribution_id", impactContribId!)
        .order("log_date", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!impactContribId,
  });
  const { data: ecosystemLogs } = useQuery({
    queryKey: ["ecosystem_impact_logs", impactContribId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecosystem_impact_logs" as any)
        .select("*")
        .eq("contribution_id", impactContribId!)
        .order("log_date", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!impactContribId,
  });
  const { data: communityLogs } = useQuery({
    queryKey: ["community_impact_logs", impactContribId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_impact_logs" as any)
        .select("*")
        .eq("contribution_id", impactContribId!)
        .order("log_date", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!impactContribId,
  });

  // Tree-level queries for Tree Status & Info
  const treeStatusTreeId = treeStatusSheet?.tree.id || geotagDialog?.id || metricsSheet?.id || statusHistoryTree?.id;
  
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

  const survivalTreeId = treeStatusSheet?.tree.id || metricsSheet?.id;
  const { data: treeSurvival, refetch: refetchSurvival } = useQuery({
    queryKey: ["treeSurvival", survivalTreeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_survival_tracking" as any)
        .select("*")
        .eq("tree_id", survivalTreeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!survivalTreeId,
  });

  const growthTreeId = treeStatusSheet?.tree.id || metricsSheet?.id;
  const { data: treeGrowth, refetch: refetchGrowth } = useQuery({
    queryKey: ["treeGrowth", growthTreeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_growth_metrics" as any)
        .select("*")
        .eq("tree_id", growthTreeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!growthTreeId,
  });

  // Fetch ALL geotags / survival / growth records (no .in() filter to avoid URL length limits with 600+ tree IDs)
  const { data: allGeotags } = useQuery({
    queryKey: ["allGeotags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_geotags" as any)
        .select("tree_id, latitude, longitude");
      if (error) throw error;
      const acc: Record<string, { latitude: number; longitude: number }> = {};
      (data || []).forEach((g: any) => {
        acc[g.tree_id] = { latitude: g.latitude, longitude: g.longitude };
      });
      return acc;
    },
  });

  const { data: allSurvivalStatuses } = useQuery({
    queryKey: ["allSurvivalStatuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_survival_tracking" as any)
        .select("tree_id, survival_status, last_checked_date")
        .order("last_checked_date", { ascending: false });
      if (error) throw error;
      const acc: Record<string, { survival_status: string; last_checked_date: string }> = {};
      (data || []).forEach((r: any) => {
        if (!acc[r.tree_id]) {
          acc[r.tree_id] = { survival_status: r.survival_status, last_checked_date: r.last_checked_date };
        }
      });
      return acc;
    },
  });

  const { data: allGrowthStages } = useQuery({
    queryKey: ["allGrowthStages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tree_growth_metrics" as any)
        .select("tree_id, growth_stage, last_measured_date, tree_age, tree_age_months")
        .order("last_measured_date", { ascending: false });
      if (error) throw error;
      const acc: Record<string, { growth_stage: string; last_measured_date: string; tree_age: string | null; tree_age_months: number | null }> = {};
      (data || []).forEach((r: any) => {
        if (!acc[r.tree_id]) {
          acc[r.tree_id] = { growth_stage: r.growth_stage, last_measured_date: r.last_measured_date, tree_age: r.tree_age, tree_age_months: r.tree_age_months };
        }
      });
      return acc;
    },
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
      queryClient.invalidateQueries({ queryKey: ["ownerOrderTrees"] });
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
      queryClient.invalidateQueries({ queryKey: ["ownerOrderTrees"] });
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
        .map(t => allTransitionDatesWithFallback?.[t.id])
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
  }, [contributions, treesByContribution, trips, allTransitionDatesWithFallback]);

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
      const ct = (g.contribution_type || "").toLowerCase();
      const matchType = typeFilter === "all" ||
        (typeFilter === "agent" && ct === "travel_agent") ||
        (typeFilter === "tourist" && ct !== "travel_agent");
      return matchSearch && matchStatus && matchType;
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
  }, [contributionGroups, search, statusFilter, typeFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleRow = (contribId: string) => {
    if (!canPerTreeStatus) return;
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

  // Check if current owner is plantation type (not institutional)
  const { data: isPlantationType } = useQuery({
    queryKey: ["isPlantationOwner", orgId],
    queryFn: async () => {
      if (!orgId) return false;
      const { data: org } = await supabase
        .from("organizations")
        .select("category, partner_type_id")
        .eq("id", orgId)
        .single();
      if (!org) return false;
      // Institutional partners have category 'government' or partner type containing 'government'/'ktb'
      if (org.category === 'government') return false;
      if (org.partner_type_id) {
        const { data: pt } = await supabase
          .from("partner_types")
          .select("name")
          .eq("id", org.partner_type_id)
          .single();
        if (pt?.name?.toLowerCase().includes('government') || pt?.name?.toLowerCase().includes('ktb')) return false;
      }
      return true;
    },
    enabled: !!orgId,
  });

  const canEditPlantingStatus = hasEdit && !!isPlantationType && canPlantingStatus;

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

      queryClient.invalidateQueries({ queryKey: ["ownerOrderTrees"] });
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tree Orders</h1>
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
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Contri type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="tourist">Tourist</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
          </SelectContent>
        </Select>
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
                      <React.Fragment key={group.contribution_id}>
                        <TableRow
                          className={canPerTreeStatus ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
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
                                    <SelectTrigger className="w-[150px] h-7 text-xs border-2 border-primary/50 bg-primary/5 hover:border-primary font-medium text-left">
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
                                {canTreeOperations && (
                                <DropdownMenuItem onClick={() => navigate(`/owner/orders/${group.contribution_id}/operations`)}>
                                  <Eye className="h-3.5 w-3.5 mr-2" />
                                  Tree Operations
                                </DropdownMenuItem>
                                )}
                                {canPlantingOverview && (
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
                                )}
                                {isPlantationType && canMonitoringLogs && (
                                <DropdownMenuItem onClick={() => {
                                  setMonitoringSheet(group);
                                  setMonitoringForm({ inspection_date: '', inspected_by: '', survival_rate_pct: '', trees_alive: '', trees_dead: '', trees_replaced: '', overall_health_notes: '', photos: [] });
                                }}>
                                  <ClipboardList className="h-3.5 w-3.5 mr-2" />
                                  Monitoring Logs
                                </DropdownMenuItem>
                                )}
                                {isPlantationType && (
                                  <>
                                    {canEcosystem && (
                                    <DropdownMenuItem onClick={() => {
                                      setImpactSliderContribId(group.contribution_id);
                                      setImpactSliderType("ecosystem");
                                    }}>
                                      <Globe className="h-3.5 w-3.5 mr-2" />
                                      Ecosystem Impact
                                    </DropdownMenuItem>
                                    )}
                                    {canCommunity && (
                                    <DropdownMenuItem onClick={() => {
                                      setImpactSliderContribId(group.contribution_id);
                                      setImpactSliderType("community");
                                    }}>
                                      <Users className="h-3.5 w-3.5 mr-2" />
                                      Community Impact
                                    </DropdownMenuItem>
                                    )}
                                    {canCarbon && (
                                    <DropdownMenuItem onClick={() => {
                                      setImpactSliderContribId(group.contribution_id);
                                      setImpactSliderType("carbon");
                                    }}>
                                      <Cloud className="h-3.5 w-3.5 mr-2" />
                                      Carbon Metrics
                                    </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                                {canEngagement && (
                                <DropdownMenuItem onClick={() => {
                                  setEngagementSheet(group);
                                  setEngagementTab("engagement");
                                }}>
                                  <Bell className="h-3.5 w-3.5 mr-2" />
                                  Engagement
                                </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Tree Details */}
                        {isExpanded && (
                          <TableRow key={`${group.contribution_id}-expanded`} className="bg-muted/60 hover:bg-muted/60">
                            <TableCell colSpan={12} className="p-0">
                              <div className="py-3 space-y-3">
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
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                         <TableRow className="hover:bg-transparent border-b border-border/40">
                                          <TableHead className="w-12 text-xs">No.</TableHead>
                                          <TableHead className="text-xs">Tree ID</TableHead>
                                          <TableHead className="text-xs">Species</TableHead>
                                          <TableHead className="text-xs">Planting Status</TableHead>
                                          <TableHead className="text-xs">Status Date</TableHead>
                                          <TableHead className="text-xs">Growth Stage</TableHead>
                                          <TableHead className="text-xs">Age</TableHead>
                                          <TableHead className="text-xs">Survival Status</TableHead>
                                          <TableHead className="text-xs">Last Checked</TableHead>
                                           <TableHead className="text-xs">Track</TableHead>
                                           <TableHead className="text-xs w-12"></TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {displayRows.map((row, index) => {
                                          if (row.type === 'tree') {
                                            const tree = row.tree;
                                            const geotagData = allGeotags?.[tree.id];
                                            const hasGeotag = !!geotagData;
                                            const survivalData = allSurvivalStatuses?.[tree.id];
                                            const growthData = allGrowthStages?.[tree.id];
                                            return (
                                              <TableRow key={tree.id}>
                                                <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                                 <TableCell className="font-mono text-sm">{tree.otot_id}</TableCell>
                                                 <TableCell className="text-xs">
                                                   {allTreeSpecies?.[tree.id] ? (
                                                     <span className="text-foreground">{allTreeSpecies[tree.id]}</span>
                                                   ) : (
                                                     <span className="text-muted-foreground">—</span>
                                                   )}
                                                 </TableCell>
                                                 <TableCell>
                                                  <Badge className={`text-xs whitespace-nowrap px-2 py-0.5 font-medium ${PLANTING_STATUS_COLORS[tree.planting_status || 'waiting_to_be_assigned'] || ''}`}>
                                                    {STATUS_LABELS[tree.planting_status || 'waiting_to_be_assigned']}
                                                  </Badge>
                                                </TableCell>
                                                <TableCell>
                                                  {allTransitionDates?.[tree.id] ? (
                                                    <span className="text-xs text-muted-foreground">{formatDate(allTransitionDates[tree.id])}</span>
                                                  ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                  )}
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
                                                  {growthData?.tree_age ? (
                                                    <span className="text-xs text-muted-foreground">{growthData.tree_age}</span>
                                                  ) : growthData?.tree_age_months ? (
                                                    <span className="text-xs text-muted-foreground">{growthData.tree_age_months} months</span>
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
                                                  {hasGeotag && geotagData ? (
                                                    <a
                                                      href={`https://www.google.com/maps?q=${geotagData.latitude},${geotagData.longitude}`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      title={`${geotagData.latitude}, ${geotagData.longitude}`}
                                                    >
                                                      <Button
                                                        type="button"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs gap-1 bg-green-500 hover:bg-green-600 text-white"
                                                      >
                                                        <MapPin className="h-3.5 w-3.5" />
                                                        Geotag
                                                      </Button>
                                                    </a>
                                                  ) : tree.planting_status === 'planted' ? (
                                                    <Button
                                                      type="button"
                                                      size="sm"
                                                      variant="secondary"
                                                      className="h-7 px-2 text-xs gap-1 bg-muted text-muted-foreground hover:bg-muted/80"
                                                      onClick={() => {
                                                        setGeotagDialog(tree);
                                                        setGeotagForm({ geo_tag_id: '', latitude: '', longitude: '', geo_accuracy: '', map_snapshot: '' });
                                                      }}
                                                    >
                                                      <MapPin className="h-3.5 w-3.5" />
                                                      Geotag
                                                    </Button>
                                                  ) : (
                                                    <TooltipProvider>
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="secondary"
                                                            disabled
                                                            className="h-7 px-2 text-xs gap-1 opacity-50"
                                                          >
                                                            <MapPin className="h-3.5 w-3.5" />
                                                            Geotag
                                                          </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>Tree not yet planted</p></TooltipContent>
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                  )}
                                                </TableCell>
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
                                                            setMetricsSheet(tree);
                                                            setMetricsForm({
                                                              checked_date: new Date().toISOString().split('T')[0],
                                                              survival_status: 'Alive',
                                                              survival_rate: '',
                                                              growth_stage: 'sapling',
                                                              tree_age: '',
                                                              age_unit: 'months',
                                                              tree_height: '',
                                                              height_unit: 'cm',
                                                              notes: '',
                                                            });
                                                          }}>
                                                            <Activity className="h-3.5 w-3.5 mr-2" />
                                                            Survival & Growth Metrics
                                                          </DropdownMenuItem>
                                                        ) : (
                                                          <TooltipProvider>
                                                            <Tooltip>
                                                              <TooltipTrigger asChild>
                                                                <div>
                                                                  <DropdownMenuItem disabled className="opacity-50">
                                                                    <Activity className="h-3.5 w-3.5 mr-2" />
                                                                    Survival & Growth Metrics
                                                                  </DropdownMenuItem>
                                                                </div>
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
                                                 <TableCell><span className="text-xs text-muted-foreground">—</span></TableCell>
                                                 <TableCell>
                                                  <Badge className={`text-xs whitespace-nowrap px-2 py-0.5 font-medium ${PLANTING_STATUS_COLORS['waiting_to_be_assigned']}`}>
                                                    {STATUS_LABELS['waiting_to_be_assigned']}
                                                  </Badge>
                                                </TableCell>
                                                <TableCell><span className="text-xs text-muted-foreground">—</span></TableCell>
                                                <TableCell><span className="text-xs text-muted-foreground">—</span></TableCell>
                                                <TableCell><span className="text-xs text-muted-foreground">—</span></TableCell>
                                                <TableCell><span className="text-xs text-muted-foreground">—</span></TableCell>
                                                <TableCell><span className="text-xs text-muted-foreground">—</span></TableCell>
                                                 <TableCell><MapPin className="h-4 w-4 text-muted-foreground/40" /></TableCell>
                                                 <TableCell>-</TableCell>
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
                      </React.Fragment>
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
                          <span className="text-muted-foreground text-xs">Planting Amnt</span>
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
          queryClient.invalidateQueries({ queryKey: ["ownerOrderTrees"] });
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

            // Batch-level geotag: derived from latest "being_mapped" status transition (group-level),
            // kept SEPARATE from per-tree geotags stored in tree_geotags.
            const beingMappedTransition = (treeTransitions || []).find((t: any) => t.to_status === 'being_mapped');
            const btd: any = beingMappedTransition?.transition_data || {};
            const batchGeotag = beingMappedTransition && btd.latitude != null && btd.longitude != null ? {
              geo_tag_id: btd.geo_tag_id || null,
              latitude: typeof btd.latitude === 'string' ? parseFloat(btd.latitude) : btd.latitude,
              longitude: typeof btd.longitude === 'string' ? parseFloat(btd.longitude) : btd.longitude,
              geo_accuracy: btd.gps_accuracy ?? btd.geo_accuracy ?? null,
              map_snapshot: btd.map_snapshot || null,
              created_at: beingMappedTransition.created_at,
            } : null;

            const friendlyLabels: Record<string, string> = {
              target_beat_label: 'Location (Target Beat)', assigned_to_name: 'Planter', assigned_date: 'Assigned Date',
              nursery_name: 'Nursery / CBO', species_name: 'Species', tree_carer_name: 'Tree Carer',
              soil_type: 'Soil Type', rainfall_mm: 'Rainfall (mm)', site_prep_date: 'Site Preparation Date', site_notes: 'Site Notes',
              sapling_ready_date: 'Sapling Ready Date', sapling_source: 'Sapling Source', sapling_age: 'Sapling Age',
              scheduled_date: 'Scheduled Date', planting_team_size: 'Team Size',
              planting_date: 'Planting Date', planting_method: 'Planting Method', planting_notes: 'Planting Notes',
              latitude: 'Latitude', longitude: 'Longitude', mapping_date: 'Mapping Date', mapping_method: 'Mapping Method', mapping_notes: 'Mapping Notes', gps_accuracy: 'GPS Accuracy',
              verification_date: 'Verification Date', verified_by: 'Verified By', verification_method: 'Verification Method', verification_notes: 'Verification Notes', health_status: 'Health Status',
              planted_confirmed_date: 'Confirmed Date', date_confirmed_dead: 'Date Confirmed Dead', cause_of_death: 'Cause of Death',
              replacement_planned: 'Replacement Planned', replacement_target_date: 'Replacement Target Date',
              re_planted_date: 'Re-planted Date', re_planting_method: 'Re-planting Method',
              notes: 'Notes', reason: 'Reason', batch_notice: 'Notice', planter_name: 'Planter',
              changed_by: 'Entered By',
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
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="planting">Planting</TabsTrigger>
                    <TabsTrigger value="location">Location</TabsTrigger>
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

                      <Accordion type="multiple" className="w-full divide-y [&>*]:border-0">
                        {allLifecycleStatuses.filter(s => s !== 'waiting_to_be_assigned').map((status) => {
                          const statusOrder = getPlantingStatusOrder(status);
                          const isCompleted = statusOrder < currentOrder;
                          const isCurrent = statusOrder === currentOrder;
                          const isFuture = statusOrder > currentOrder;
                          const transition = treeTransitions?.find(t => t.to_status === status);
                          const transitionData = transition?.transition_data || {};
                          const photos = transition?.photos || [];

                          const skipKeys = new Set<string>(['reverted', 'sapling_age_value', 'sapling_age_unit']);
                          for (const [idKey, labelKey] of Object.entries(idToLabelMap)) {
                            if (transitionData[labelKey] !== undefined) skipKeys.add(idKey);
                          }
                          if (status === 'verified' && transitionData['planter_name'] !== undefined) {
                            skipKeys.add('planter_name');
                          }
                          const entrySortOrder: Record<string, number> = { target_beat_label: 0, assigned_to_name: 1, changed_by: 999 };
                          const entries = Object.entries(transitionData)
                            .filter(([key, value]) => !skipKeys.has(key) && value !== null && value !== undefined && value !== '')
                            .sort((a, b) => (entrySortOrder[a[0]] ?? 50) - (entrySortOrder[b[0]] ?? 50));

                          return (
                            <AccordionItem key={status} value={status} className={`border-0 ${isFuture ? 'opacity-50' : ''}`}>
                              <AccordionTrigger
                                className={`hover:no-underline py-3 ${!transition ? '[&>svg]:hidden cursor-default' : ''}`}
                                disabled={!transition}
                                onClick={!transition ? (e) => e.preventDefault() : undefined}
                              >
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

                  {/* Location Tab - Group/Batch Geotag (separate from per-tree geotags) */}
                  <TabsContent value="location">
                    <div className="space-y-4 pt-2">
                      {batchGeotag ? (
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> Group Geotag & Map
                          </h4>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                navigator.clipboard.writeText(`${batchGeotag.latitude}, ${batchGeotag.longitude}`);
                                toast.success("Coordinates copied");
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1.5" /> Copy coords
                            </Button>
                            <a
                              href={`https://www.google.com/maps?q=${batchGeotag.latitude},${batchGeotag.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs h-7 px-2.5 rounded-md border bg-background hover:bg-accent"
                            >
                              <ExternalLink className="h-3 w-3 mr-1.5" /> Open in Google Maps
                            </a>
                          </div>

                          <div className="rounded-md border bg-muted/30 overflow-hidden" style={{ height: 280 }}>
                            {!mapLoaded ? (
                              <div className="flex flex-col items-center justify-center h-full gap-2">
                                <Button
                                  type="button"
                                  variant="default"
                                  size="sm"
                                  onClick={() => { setMapLoaded(true); setMapKey(k => k + 1); }}
                                >
                                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Load Map
                                </Button>
                                <p className="text-xs text-muted-foreground">Click to fetch location preview</p>
                              </div>
                            ) : (
                              <div className="relative h-full">
                                <iframe
                                  key={mapKey}
                                  title="Group location map"
                                  src={`https://www.google.com/maps?q=${batchGeotag.latitude},${batchGeotag.longitude}&z=16&output=embed&t=${mapKey}`}
                                  className="w-full h-full border-0"
                                  loading="lazy"
                                />
                                <div className="absolute top-2 right-2 flex gap-1">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="h-7 w-7 shadow-md"
                                    onClick={() => setMapKey(k => k + 1)}
                                    title="Refresh map"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="h-7 w-7 shadow-md"
                                    onClick={() => setMapExpanded(true)}
                                    title="Expand"
                                  >
                                    <Maximize2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>

                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="geotag-info" className="border rounded-lg px-3">
                              <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                                <span className="flex items-center gap-2">
                                  <Info className="h-4 w-4" /> Group Geotag Information
                                </span>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-2 pt-1">
                                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                                    <span className="text-muted-foreground">Geo Tag ID:</span>
                                    <span className="font-medium">{batchGeotag.geo_tag_id || '-'}</span>
                                    <span className="text-muted-foreground">Latitude:</span>
                                    <span className="font-medium">{batchGeotag.latitude}</span>
                                    <span className="text-muted-foreground">Longitude:</span>
                                    <span className="font-medium">{batchGeotag.longitude}</span>
                                    <span className="text-muted-foreground">Accuracy:</span>
                                    <span className="font-medium">{batchGeotag.geo_accuracy ? `${batchGeotag.geo_accuracy} m` : '-'}</span>
                                    <span className="text-muted-foreground">Trees in batch:</span>
                                    <span className="font-medium">{treeCount}</span>
                                    <span className="text-muted-foreground">Captured:</span>
                                    <span className="font-medium">{batchGeotag.created_at ? format(new Date(batchGeotag.created_at), "dd MMM yyyy, hh:mm a") : '-'}</span>
                                  </div>
                                  {batchGeotag.map_snapshot && (
                                    <div className="mt-3">
                                      <img src={batchGeotag.map_snapshot} alt="Map snapshot" className="w-full h-32 object-cover rounded-md border cursor-pointer" onClick={() => setLightboxPhoto(batchGeotag.map_snapshot!)} />
                                    </div>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed bg-muted/20 py-10 px-4 text-center">
                          <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No group geotag captured yet.</p>
                          <p className="text-xs text-muted-foreground mt-1">Move the batch to "Location Mapped" status to capture group GPS coordinates.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Monitoring Tab */}
                  <TabsContent value="monitoring">
                    <div className="pt-2">
                      {monitoringLogs && monitoringLogs.length > 0 ? (
                        <Accordion type="multiple" className="space-y-2">
                          {monitoringLogs.map((log: any) => (
                            <AccordionItem
                              key={log.id}
                              value={log.id}
                              className="rounded-lg border bg-card px-3 data-[state=open]:bg-muted/30"
                            >
                              <AccordionTrigger className="py-3 hover:no-underline">
                                <div className="flex flex-1 items-center gap-3 pr-2 text-left">
                                  <span className="text-sm font-semibold whitespace-nowrap">
                                    {log.inspection_date ? format(new Date(log.inspection_date), "MMM dd, yyyy") : '-'}
                                  </span>
                                  <Badge variant="outline" className="font-normal whitespace-nowrap">
                                    Survival: {log.survival_rate_pct ?? 0}%
                                  </Badge>
                                  <span className="text-sm text-muted-foreground truncate">
                                    Alive: {log.trees_alive ?? 0} | Dead: {log.trees_dead ?? 0} | Replaced: {log.trees_replaced ?? 0}
                                  </span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pb-3">
                                <div className="space-y-2 border-t pt-3">
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Inspection ID: </span>
                                      <span className="font-mono">INS-{String(log.id).slice(0, 8).toUpperCase()}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Inspected By: </span>
                                      <span>{log.inspected_by ? (planterNameMap.get(log.inspected_by) || '—') : '—'}</span>
                                    </div>
                                  </div>
                                  {log.overall_health_notes && (
                                    <div className="text-sm">
                                      <span className="text-muted-foreground">Notes: </span>
                                      {log.overall_health_notes}
                                    </div>
                                  )}
                                  {Array.isArray(log.photos) && log.photos.length > 0 && (
                                    <div className="flex gap-2 flex-wrap pt-1">
                                      {log.photos.map((url: string, i: number) => (
                                        <button key={i} onClick={() => setLightboxPhoto(url)} className="h-14 w-14 rounded-md overflow-hidden border hover:ring-2 ring-primary">
                                          <img src={url} alt="" className="h-full w-full object-cover" />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ) : (
                        <p className="text-sm text-muted-foreground italic text-center py-6">No monitoring logs recorded yet.</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Impact Tab - sub-tabs for Carbon / Ecosystem / Community */}
                  <TabsContent value="impact">
                    <Tabs defaultValue="ecosystem" className="mt-2">
                      <TabsList className="grid w-full grid-cols-3 bg-transparent p-0 h-auto gap-2 rounded-none">
                        <TabsTrigger value="ecosystem" className="text-xs rounded-md border border-border bg-muted/40 text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/30 data-[state=active]:shadow-sm">Ecosystem ({ecosystemLogs?.length || 0})</TabsTrigger>
                        <TabsTrigger value="community" className="text-xs rounded-md border border-border bg-muted/40 text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/30 data-[state=active]:shadow-sm">Community ({communityLogs?.length || 0})</TabsTrigger>
                        <TabsTrigger value="carbon" className="text-xs rounded-md border border-border bg-muted/40 text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/30 data-[state=active]:shadow-sm">Carbon ({carbonLogs?.length || 0})</TabsTrigger>
                      </TabsList>

                      {/* Carbon Metrics Logs */}
                      <TabsContent value="carbon">
                        <div className="pt-2">
                          {carbonLogs && carbonLogs.length > 0 ? (
                            <Accordion type="multiple" className="space-y-2">
                              {carbonLogs.map((log: any) => (
                                <AccordionItem key={log.id} value={log.id} className="rounded-lg border bg-card px-3 data-[state=open]:bg-muted/30">
                                  <AccordionTrigger className="py-3 hover:no-underline">
                                    <div className="flex items-center justify-between w-full pr-2 gap-2">
                                      <div className="flex flex-col items-start text-left">
                                        <span className="text-sm font-semibold">{format(new Date(log.log_date), "MMM dd, yyyy")}</span>
                                        <span className="text-xs text-muted-foreground">{planterNameMap.get(log.recorded_by) || log.recorded_by}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                        {log.co2_offset_estimated_kg != null && (
                                          <Badge variant="outline" className="text-[10px]">Est {Number(log.co2_offset_estimated_kg).toLocaleString()} kg</Badge>
                                        )}
                                        {log.co2_offset_actual_kg != null && (
                                          <Badge variant="outline" className="text-[10px]">Act {Number(log.co2_offset_actual_kg).toLocaleString()} kg</Badge>
                                        )}
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="pb-3">
                                    <div className="space-y-2 text-sm">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div><span className="text-muted-foreground text-xs">Estimated:</span> <span className="font-medium">{log.co2_offset_estimated_kg ?? "—"} kg</span></div>
                                        <div><span className="text-muted-foreground text-xs">Actual:</span> <span className="font-medium">{log.co2_offset_actual_kg ?? "—"} kg</span></div>
                                      </div>
                                      {log.calculation_method && <div><span className="text-muted-foreground text-xs">Method:</span> <span className="font-medium">{log.calculation_method}</span></div>}
                                      {log.notes && <div className="text-muted-foreground italic">"{log.notes}"</div>}
                                      {Array.isArray(log.photos) && log.photos.length > 0 && (
                                        <div className="flex gap-2 flex-wrap pt-2">
                                          {log.photos.map((p: string, i: number) => (
                                            <button key={i} type="button" onClick={() => setLightboxPhoto(p)} className="h-14 w-14 rounded-md overflow-hidden border hover:ring-2 ring-primary">
                                              <img src={p} alt="" className="h-full w-full object-cover" />
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          ) : (
                            <p className="text-sm text-muted-foreground italic text-center py-6">No carbon metrics logs recorded yet.</p>
                          )}
                        </div>
                      </TabsContent>

                      {/* Ecosystem Impact Logs */}
                      <TabsContent value="ecosystem">
                        <div className="pt-2">
                          {ecosystemLogs && ecosystemLogs.length > 0 ? (
                            <Accordion type="multiple" className="space-y-2">
                              {ecosystemLogs.map((log: any) => (
                                <AccordionItem key={log.id} value={log.id} className="rounded-lg border bg-card px-3 data-[state=open]:bg-muted/30">
                                  <AccordionTrigger className="py-3 hover:no-underline">
                                    <div className="flex items-center justify-between w-full pr-2 gap-2">
                                      <div className="flex flex-col items-start text-left">
                                        <span className="text-sm font-semibold">{format(new Date(log.log_date), "MMM dd, yyyy")}</span>
                                        <span className="text-xs text-muted-foreground">{planterNameMap.get(log.recorded_by) || log.recorded_by}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                        {log.biodiversity_index != null && (
                                          <Badge variant="outline" className="text-[10px]">Bio {log.biodiversity_index}</Badge>
                                        )}
                                        {log.soil_improvement && (
                                          <Badge variant="outline" className="text-[10px]">Soil: {log.soil_improvement}</Badge>
                                        )}
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="pb-3">
                                    <div className="space-y-2 text-sm">
                                      <div className="grid grid-cols-3 gap-2">
                                        <div><span className="text-muted-foreground text-xs">Biodiversity:</span> <span className="font-medium">{log.biodiversity_index ?? "—"}</span></div>
                                        <div><span className="text-muted-foreground text-xs">Soil:</span> <span className="font-medium">{log.soil_improvement || "—"}</span></div>
                                        <div><span className="text-muted-foreground text-xs">Water:</span> <span className="font-medium">{log.water_retention || "—"}</span></div>
                                      </div>
                                      {log.ecosystem_notes && <div className="text-muted-foreground italic">"{log.ecosystem_notes}"</div>}
                                      {Array.isArray(log.photos) && log.photos.length > 0 && (
                                        <div className="flex gap-2 flex-wrap pt-2">
                                          {log.photos.map((p: string, i: number) => (
                                            <button key={i} type="button" onClick={() => setLightboxPhoto(p)} className="h-14 w-14 rounded-md overflow-hidden border hover:ring-2 ring-primary">
                                              <img src={p} alt="" className="h-full w-full object-cover" />
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          ) : (
                            <p className="text-sm text-muted-foreground italic text-center py-6">No ecosystem impact logs recorded yet.</p>
                          )}
                        </div>
                      </TabsContent>

                      {/* Community Impact Logs */}
                      <TabsContent value="community">
                        <div className="pt-2">
                          {communityLogs && communityLogs.length > 0 ? (
                            <Accordion type="multiple" className="space-y-2">
                              {communityLogs.map((log: any) => (
                                <AccordionItem key={log.id} value={log.id} className="rounded-lg border bg-card px-3 data-[state=open]:bg-muted/30">
                                  <AccordionTrigger className="py-3 hover:no-underline">
                                    <div className="flex items-center justify-between w-full pr-2 gap-2">
                                      <div className="flex flex-col items-start text-left">
                                        <span className="text-sm font-semibold">{format(new Date(log.log_date), "MMM dd, yyyy")}</span>
                                        <span className="text-xs text-muted-foreground">{planterNameMap.get(log.recorded_by) || log.recorded_by}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                        <Badge variant="outline" className="text-[10px]">Jobs {log.jobs_created || 0}</Badge>
                                        <Badge variant="outline" className="text-[10px]">Avg/mo KES {Number(log.avg_monthly_income_kes || 0).toLocaleString()}</Badge>
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="pb-3">
                                    <div className="space-y-2 text-sm">
                                      <div className="grid grid-cols-3 gap-2">
                                        <div><span className="text-muted-foreground text-xs">Families:</span> <span className="font-medium">{log.families_supported || 0}</span></div>
                                        <div><span className="text-muted-foreground text-xs">Jobs:</span> <span className="font-medium">{log.jobs_created || 0}</span></div>
                                        <div><span className="text-muted-foreground text-xs">Avg Monthly Income:</span> <span className="font-medium">KES {Number(log.avg_monthly_income_kes || 0).toLocaleString()}</span></div>
                                        <div><span className="text-muted-foreground text-xs">Women:</span> <span className="font-medium">{log.women_employed || 0}</span></div>
                                        <div><span className="text-muted-foreground text-xs">Youth:</span> <span className="font-medium">{log.youth_employed || 0}</span></div>
                                        <div><span className="text-muted-foreground text-xs">Frequency:</span> <span className="font-medium">{log.update_frequency || "—"}</span></div>
                                      </div>
                                      <div><span className="text-muted-foreground text-xs">Nursery Income:</span> <span className="font-medium">KES {Number(log.nursery_income_kes || 0).toLocaleString()}</span></div>
                                      {(log.reporting_period || log.reporting_period_end) && (
                                        <div><span className="text-muted-foreground text-xs">Reporting Period:</span> <span className="font-medium">{log.reporting_period ? format(new Date(log.reporting_period), "MMM dd, yyyy") : "—"} → {log.reporting_period_end ? format(new Date(log.reporting_period_end), "MMM dd, yyyy") : "—"}</span></div>
                                      )}
                                      {log.community_benefits && <div className="text-muted-foreground italic">"{log.community_benefits}"</div>}
                                      {Array.isArray(log.photos) && log.photos.length > 0 && (
                                        <div className="flex gap-2 flex-wrap pt-2">
                                          {log.photos.map((p: string, i: number) => (
                                            <button key={i} type="button" onClick={() => setLightboxPhoto(p)} className="h-14 w-14 rounded-md overflow-hidden border hover:ring-2 ring-primary">
                                              <img src={p} alt="" className="h-full w-full object-cover" />
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          ) : (
                            <p className="text-sm text-muted-foreground italic text-center py-6">No community impact logs recorded yet.</p>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </TabsContent>
                </Tabs>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Monitoring Logs Sheet */}
      <Sheet open={!!monitoringSheet} onOpenChange={(open) => !open && setMonitoringSheet(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {monitoringSheet && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Periodic Monitoring Logs
                </SheetTitle>
                <p className="text-sm text-muted-foreground">{monitoringSheet.contribution_id}</p>
               </SheetHeader>
               <Tabs value={monitoringTab} onValueChange={setMonitoringTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="previous">Previous Logs{monitoringLogs && monitoringLogs.length > 0 ? ` (${monitoringLogs.length})` : ''}</TabsTrigger>
                  <TabsTrigger value="new">Add New Log</TabsTrigger>
                </TabsList>
                <TabsContent value="new">
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Inspection ID</Label>
                        <Input value="Auto-generated on save" disabled className="bg-muted/40 text-muted-foreground" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Inspected By *</Label>
                        <Select value={monitoringForm.inspected_by} onValueChange={(v) => setMonitoringForm(f => ({ ...f, inspected_by: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select inspector" /></SelectTrigger>
                          <SelectContent>
                            {(activePlanters || []).map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Inspection Date *</Label>
                        <Input type="date" value={monitoringForm.inspection_date} onChange={(e) => setMonitoringForm(f => ({ ...f, inspection_date: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Survival Rate % *</Label>
                        <Input type="number" min="0" max="100" value={monitoringForm.survival_rate_pct} onChange={(e) => setMonitoringForm(f => ({ ...f, survival_rate_pct: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Trees Planted</Label>
                        <Input value={monitoringSheet.total_trees} disabled className="bg-muted/40 text-muted-foreground" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Trees Alive *</Label>
                        <Input
                          type="number"
                          min="0"
                          max={monitoringSheet.total_trees}
                          value={monitoringForm.trees_alive}
                          onChange={(e) => {
                            const v = e.target.value === '' ? '' : String(Math.min(Number(e.target.value), monitoringSheet.total_trees));
                            setMonitoringForm(f => ({ ...f, trees_alive: v }));
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Trees Dead *</Label>
                        <Input
                          type="number"
                          min="0"
                          max={monitoringSheet.total_trees}
                          value={monitoringForm.trees_dead}
                          onChange={(e) => {
                            const v = e.target.value === '' ? '' : String(Math.min(Number(e.target.value), monitoringSheet.total_trees));
                            setMonitoringForm(f => ({ ...f, trees_dead: v }));
                          }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Trees Replaced</Label>
                        <Input
                          type="number"
                          min="0"
                          max={monitoringSheet.total_trees}
                          value={monitoringForm.trees_replaced}
                          onChange={(e) => {
                            const v = e.target.value === '' ? '' : String(Math.min(Number(e.target.value), monitoringSheet.total_trees));
                            setMonitoringForm(f => ({ ...f, trees_replaced: v }));
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>General Health Notes</Label>
                      <Textarea value={monitoringForm.overall_health_notes} onChange={(e) => setMonitoringForm(f => ({ ...f, overall_health_notes: e.target.value }))} placeholder="Observation notes..." rows={3} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Photos</Label>
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={monitoringUploading}
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length === 0) return;
                            setMonitoringUploading(true);
                            try {
                              const uploaded: string[] = [];
                              for (const file of files) {
                                const ext = file.name.split('.').pop() || 'jpg';
                                const path = `monitoring/${monitoringSheet.contribution_id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
                                const { error: upErr } = await supabase.storage.from('planting-photos').upload(path, file, { upsert: false, contentType: file.type });
                                if (upErr) { toast.error(upErr.message); continue; }
                                const { data: pub } = supabase.storage.from('planting-photos').getPublicUrl(path);
                                if (pub?.publicUrl) uploaded.push(pub.publicUrl);
                              }
                              if (uploaded.length) {
                                setMonitoringForm(f => ({ ...f, photos: [...f.photos, ...uploaded] }));
                                toast.success(`${uploaded.length} photo(s) uploaded`);
                              }
                            } finally {
                              setMonitoringUploading(false);
                              e.target.value = '';
                            }
                          }}
                        />
                        <Input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          id="monitoring-camera-capture"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setMonitoringUploading(true);
                            try {
                              const ext = file.name.split('.').pop() || 'jpg';
                              const path = `monitoring/${monitoringSheet.contribution_id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
                              const { error: upErr } = await supabase.storage.from('planting-photos').upload(path, file, { upsert: false, contentType: file.type });
                              if (upErr) { toast.error(upErr.message); return; }
                              const { data: pub } = supabase.storage.from('planting-photos').getPublicUrl(path);
                              if (pub?.publicUrl) {
                                setMonitoringForm(f => ({ ...f, photos: [...f.photos, pub.publicUrl] }));
                                toast.success('Photo captured');
                              }
                            } finally {
                              setMonitoringUploading(false);
                              e.target.value = '';
                            }
                          }}
                        />
                        <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('monitoring-camera-capture')?.click()} disabled={monitoringUploading}>
                          Capture
                        </Button>
                      </div>
                      {monitoringUploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
                      {monitoringForm.photos.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 pt-2">
                          {monitoringForm.photos.map((url, i) => (
                            <div key={i} className="relative group">
                              <button type="button" onClick={() => setLightboxPhoto(url)} className="block w-full h-20 rounded-md overflow-hidden border hover:ring-2 ring-primary">
                                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setMonitoringForm(f => ({ ...f, photos: f.photos.filter((_, idx) => idx !== i) }))}
                                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Remove photo"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      className="w-full"
                      disabled={
                        monitoringUploading ||
                        !(
                          monitoringForm.inspection_date ||
                          monitoringForm.inspected_by ||
                          monitoringForm.survival_rate_pct ||
                          monitoringForm.trees_alive ||
                          monitoringForm.trees_dead ||
                          monitoringForm.trees_replaced ||
                          monitoringForm.overall_health_notes ||
                          monitoringForm.photos.length > 0
                        )
                      }
                      onClick={async () => {
                        const { error } = await supabase.from("tree_monitoring_logs" as any).insert({
                          contribution_id: monitoringSheet.contribution_id,
                          inspection_date: monitoringForm.inspection_date || new Date().toISOString().slice(0, 10),
                          inspected_by: monitoringForm.inspected_by || null,
                          survival_rate_pct: monitoringForm.survival_rate_pct ? parseFloat(monitoringForm.survival_rate_pct) : 0,
                          trees_alive: monitoringForm.trees_alive ? parseInt(monitoringForm.trees_alive) : 0,
                          trees_dead: monitoringForm.trees_dead ? parseInt(monitoringForm.trees_dead) : 0,
                          trees_replaced: monitoringForm.trees_replaced ? parseInt(monitoringForm.trees_replaced) : 0,
                          overall_health_notes: monitoringForm.overall_health_notes || null,
                          photos: monitoringForm.photos,
                        });
                        if (error) { toast.error(error.message); return; }
                        toast.success("Monitoring log saved");
                        refetchMonitoring();
                        setMonitoringForm({ inspection_date: '', inspected_by: '', survival_rate_pct: '', trees_alive: '', trees_dead: '', trees_replaced: '', overall_health_notes: '', photos: [] });
                        setMonitoringTab("previous");
                      }}
                    >
                      Save Monitoring Log
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="previous">
                  <div className="pt-2">
                    {monitoringLogs && monitoringLogs.length > 0 ? (
                      <Accordion type="multiple" className="space-y-2">
                        {monitoringLogs.map((log: any) => (
                          <AccordionItem
                            key={log.id}
                            value={log.id}
                            className="rounded-lg border bg-card px-3 data-[state=open]:bg-muted/30"
                          >
                            <AccordionTrigger className="py-3 hover:no-underline">
                              <div className="flex flex-1 items-center gap-3 pr-2 text-left">
                                <span className="text-sm font-semibold whitespace-nowrap">
                                  {log.inspection_date ? format(new Date(log.inspection_date), "MMM dd, yyyy") : '-'}
                                </span>
                                <Badge variant="outline" className="font-normal whitespace-nowrap">
                                  Survival: {log.survival_rate_pct ?? 0}%
                                </Badge>
                                <span className="text-sm text-muted-foreground truncate">
                                  Alive: {log.trees_alive ?? 0} | Dead: {log.trees_dead ?? 0} | Replaced: {log.trees_replaced ?? 0}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-3">
                              <div className="space-y-2 border-t pt-3">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Inspection ID: </span>
                                    <span className="font-mono">INS-{String(log.id).slice(0, 8).toUpperCase()}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Inspected By: </span>
                                    <span>{log.inspected_by ? (planterNameMap.get(log.inspected_by) || '—') : '—'}</span>
                                  </div>
                                </div>
                                {log.overall_health_notes && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Notes: </span>
                                    {log.overall_health_notes}
                                  </div>
                                )}
                                {Array.isArray(log.photos) && log.photos.length > 0 && (
                                  <div className="flex gap-2 flex-wrap pt-1">
                                    {log.photos.map((url: string, i: number) => (
                                      <button key={i} onClick={() => setLightboxPhoto(url)} className="h-14 w-14 rounded-md overflow-hidden border hover:ring-2 ring-primary">
                                        <img src={url} alt="" className="h-full w-full object-cover" />
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
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
              sapling_ready_date: 'Sapling Ready Date', sapling_source: 'Sapling Source', sapling_age: 'Sapling Age',
              scheduled_date: 'Scheduled Date', planting_team_size: 'Team Size',
              planting_date: 'Planting Date', planting_method: 'Planting Method', planting_notes: 'Planting Notes',
              latitude: 'Latitude', longitude: 'Longitude', mapping_date: 'Mapping Date', mapping_method: 'Mapping Method', mapping_notes: 'Mapping Notes', gps_accuracy: 'GPS Accuracy',
              verification_date: 'Verification Date', verified_by: 'Verified By', verification_method: 'Verification Method', verification_notes: 'Verification Notes', health_status: 'Health Status',
              planted_confirmed_date: 'Confirmed Date', date_confirmed_dead: 'Date Confirmed Dead', cause_of_death: 'Cause of Death',
              replacement_planned: 'Replacement Planned', replacement_target_date: 'Replacement Target Date',
              re_planted_date: 'Re-planted Date', re_planting_method: 'Re-planting Method',
              notes: 'Notes', reason: 'Reason', batch_notice: 'Notice', planter_name: 'Planter',
              changed_by: 'Entered By',
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
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="planting" className="text-xs">Status</TabsTrigger>
                    <TabsTrigger value="tree" className="text-xs">Tree</TabsTrigger>
                    <TabsTrigger value="tracking" className="text-xs">Location</TabsTrigger>
                    <TabsTrigger value="carer" className="text-xs">Carer</TabsTrigger>
                    <TabsTrigger value="growth" className="text-xs">Metrics</TabsTrigger>
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
                      <Accordion type="multiple" className="w-full divide-y [&>*]:border-0">
                        {allLifecycleStatuses.filter(s => s !== 'waiting_to_be_assigned').map((status) => {
                          const statusOrder = getPlantingStatusOrder(status);
                          const isCompleted = statusOrder < currentOrder;
                          const isCurrent = statusOrder === currentOrder;
                          const isFuture = statusOrder > currentOrder;
                          const transition = treeTransitions?.find(t => t.to_status === status);
                          const transitionData = transition?.transition_data || {};
                          const photos = transition?.photos || [];
                          const skipKeys = new Set<string>(['reverted', 'sapling_age_value', 'sapling_age_unit']);
                          for (const [idKey, labelKey] of Object.entries(idToLabelMap)) {
                            if (transitionData[labelKey] !== undefined) skipKeys.add(idKey);
                          }
                          if (status === 'verified' && transitionData['planter_name'] !== undefined) skipKeys.add('planter_name');
                          const entrySortOrder: Record<string, number> = { target_beat_label: 0, assigned_to_name: 1, changed_by: 999 };
                          const entries = Object.entries(transitionData)
                            .filter(([key, value]) => !skipKeys.has(key) && value !== null && value !== undefined && value !== '')
                            .sort((a, b) => (entrySortOrder[a[0]] ?? 50) - (entrySortOrder[b[0]] ?? 50));
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

                  {/* Tree Tab - Photo carousel */}
                  <TabsContent value="tree">
                    {(() => {
                      const photos: Array<{ url: string; uploaded_at?: string; uploaded_by?: string; label?: string }> = [];
                      (treeTransitions || []).forEach((t: any) => {
                        (t.photos || []).forEach((url: string) => {
                          photos.push({
                            url,
                            uploaded_at: t.created_at,
                            uploaded_by: t.transition_data?.assigned_to_name || t.transition_data?.planter_name || t.transition_data?.tree_carer_name || 'Field team',
                            label: STATUS_LABELS[t.to_status] || t.to_status,
                          });
                        });
                      });
                      const total = photos.length;
                      const safeIdx = total > 0 ? Math.min(treePhotoIdx, total - 1) : 0;
                      const current = photos[safeIdx];
                      return (
                        <div className="space-y-4 pt-2">
                          <h4 className="text-sm font-semibold text-center text-foreground">Your tree</h4>
                          {total === 0 ? (
                            <div className="rounded-lg border bg-muted/30 aspect-square flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <ImageIcon className="h-10 w-10 opacity-40" />
                              <p className="text-sm italic">No tree photos uploaded yet.</p>
                            </div>
                          ) : (
                            <>
                              <div className="relative rounded-lg overflow-hidden bg-muted/30 aspect-square">
                                <img
                                  src={current.url}
                                  alt={`Tree photo ${safeIdx + 1}`}
                                  className="w-full h-full object-cover cursor-pointer"
                                  onClick={() => setLightboxPhoto(current.url)}
                                />
                                <div className="absolute top-3 right-3">
                                  <Badge className="bg-primary text-primary-foreground border-0 uppercase text-[10px] tracking-wider px-2.5 py-1">
                                    Your Tree
                                  </Badge>
                                </div>
                                {total > 1 && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setTreePhotoIdx((i) => (i - 1 + total) % total)}
                                      className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/90 hover:bg-background shadow-md flex items-center justify-center transition-colors"
                                      aria-label="Previous photo"
                                    >
                                      <ChevronLeft className="h-4 w-4 text-foreground" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setTreePhotoIdx((i) => (i + 1) % total)}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/90 hover:bg-background shadow-md flex items-center justify-center transition-colors"
                                      aria-label="Next photo"
                                    >
                                      <ChevronRight className="h-4 w-4 text-foreground" />
                                    </button>
                                  </>
                                )}
                              </div>
                              {total > 1 && (
                                <div className="flex justify-center gap-1.5">
                                  {photos.map((_, i) => (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={() => setTreePhotoIdx(i)}
                                      className={`h-1.5 rounded-full transition-all ${i === safeIdx ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`}
                                      aria-label={`Go to photo ${i + 1}`}
                                    />
                                  ))}
                                </div>
                              )}
                              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm pt-1">
                                {current.label && (
                                  <>
                                    <span className="text-muted-foreground">Stage:</span>
                                    <span className="font-medium">{current.label}</span>
                                  </>
                                )}
                                <span className="text-muted-foreground">Uploaded:</span>
                                <span className="font-medium">{current.uploaded_at ? format(new Date(current.uploaded_at), "dd MMM yyyy, hh:mm a") : '—'}</span>
                                <span className="text-muted-foreground">Uploaded by:</span>
                                <span className="font-medium">{current.uploaded_by || '—'}</span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </TabsContent>

                  {/* Tracking Tab - Geotag data */}
                  <TabsContent value="tracking">
                    <div className="space-y-4 pt-2">
                      {/* Geotag & Map (always expanded, at top) */}
                      {treeGeotag && treeGeotag.latitude != null && treeGeotag.longitude != null ? (
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> Geotag & Map
                          </h4>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                navigator.clipboard.writeText(`${treeGeotag.latitude}, ${treeGeotag.longitude}`);
                                toast.success("Coordinates copied");
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1.5" /> Copy coords
                            </Button>
                            <a
                              href={`https://www.google.com/maps?q=${treeGeotag.latitude},${treeGeotag.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs h-7 px-2.5 rounded-md border bg-background hover:bg-accent"
                            >
                              <ExternalLink className="h-3 w-3 mr-1.5" /> Open in Google Maps
                            </a>
                          </div>

                          <div className="rounded-md border bg-muted/30 overflow-hidden" style={{ height: 280 }}>
                            {!mapLoaded ? (
                              <div className="flex flex-col items-center justify-center h-full gap-2">
                                <Button
                                  type="button"
                                  variant="default"
                                  size="sm"
                                  onClick={() => { setMapLoaded(true); setMapKey(k => k + 1); }}
                                >
                                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Load Map
                                </Button>
                                <p className="text-xs text-muted-foreground">Click to fetch location preview</p>
                              </div>
                            ) : (
                              <div className="relative h-full">
                                <iframe
                                  key={mapKey}
                                  title="Tree location map"
                                  src={`https://www.google.com/maps?q=${treeGeotag.latitude},${treeGeotag.longitude}&z=16&output=embed&t=${mapKey}`}
                                  className="w-full h-full border-0"
                                  loading="lazy"
                                />
                                <div className="absolute top-2 right-2 flex gap-1">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="h-7 w-7 shadow-md"
                                    onClick={() => setMapKey(k => k + 1)}
                                    title="Refresh map"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="h-7 w-7 shadow-md"
                                    onClick={() => setMapExpanded(true)}
                                    title="Expand"
                                  >
                                    <Maximize2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}

                      {/* Geotag Information Accordion (below map) */}
                      {treeGeotag ? (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="geotag-info" className="border rounded-lg px-3">
                            <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                              <span className="flex items-center gap-2">
                                <Info className="h-4 w-4" /> Geotag Information
                              </span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pt-1">
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
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      ) : (
                        <p className="text-sm text-muted-foreground italic text-center py-6">No geotag data captured yet. Use the Geotag toggle to capture location.</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Carer Tab - Tree carer profile */}
                  <TabsContent value="carer">
                    {(() => {
                      // Look for carer info in transitions
                      let carerName: string | null = null;
                      let carerPhoto: string | null = null;
                      let uploadedAt: string | null = null;
                      let uploadedBy: string | null = null;
                      let carerBio: string | null = null;
                      (treeTransitions || []).forEach((t: any) => {
                        const td = t.transition_data || {};
                        if (!carerName) carerName = td.tree_carer_name || td.assigned_to_name || td.planter_name || null;
                        if (!carerPhoto && (td.tree_carer_photo || td.carer_photo)) {
                          carerPhoto = td.tree_carer_photo || td.carer_photo;
                          uploadedAt = t.created_at;
                          uploadedBy = td.assigned_to_name || 'Field team';
                        }
                        if (!carerBio && td.tree_carer_bio) carerBio = td.tree_carer_bio;
                      });

                      // Prefer registry data when available
                      const displayName = (assignedCarer as any)?.name || carerName;
                      const displayPhoto = (assignedCarer as any)?.photo_url || carerPhoto;
                      const maritalStatus = (assignedCarer as any)?.marital_status || null;
                      const numberOfKids = (assignedCarer as any)?.number_of_kids;
                      const experienceYears = (assignedCarer as any)?.experience_years;
                      const dateRegistered = (assignedCarer as any)?.date_registered || null;

                      return (
                        <div className="space-y-4 pt-2">
                          <h4 className="text-sm font-semibold text-center text-foreground">Your tree carer</h4>
                          {!displayPhoto && !displayName ? (
                            <div className="rounded-lg border bg-muted/30 aspect-square flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <User className="h-10 w-10 opacity-40" />
                              <p className="text-sm italic">No carer assigned yet.</p>
                            </div>
                          ) : (
                            <>
                              <div className="relative rounded-lg overflow-hidden bg-muted/30 aspect-square">
                                {displayPhoto ? (
                                  <img
                                    src={displayPhoto}
                                    alt={displayName || 'Tree carer'}
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={() => setLightboxPhoto(displayPhoto!)}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <User className="h-20 w-20 text-muted-foreground/40" />
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <h3 className="text-lg font-bold text-foreground">{displayName || 'Tree Carer'}</h3>
                                {carerBio && (
                                  <p className="text-sm text-muted-foreground leading-relaxed">{carerBio}</p>
                                )}
                              </div>
                              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm border-t pt-3">
                                <span className="text-muted-foreground">Marital Status:</span>
                                <span className="font-medium">{maritalStatus || '—'}</span>
                                <span className="text-muted-foreground">Children:</span>
                                <span className="font-medium">{numberOfKids != null ? numberOfKids : '—'}</span>
                                <span className="text-muted-foreground">Experience:</span>
                                <span className="font-medium">{experienceYears != null ? `${experienceYears} ${experienceYears === 1 ? 'year' : 'years'}` : '—'}</span>
                                <span className="text-muted-foreground">Uploaded:</span>
                                <span className="font-medium">{dateRegistered ? format(new Date(dateRegistered), "dd MMM yyyy") : (uploadedAt ? format(new Date(uploadedAt), "dd MMM yyyy, hh:mm a") : '—')}</span>
                                <span className="text-muted-foreground">Uploaded by:</span>
                                <span className="font-medium">{uploadedBy || 'Field team'}</span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </TabsContent>

                  {/* Survival & Growth Tab - merged logs table */}
                  <TabsContent value="growth">
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> Survival & Growth Metrics
                      </h4>
                      {(() => {
                        const byDate = new Map<string, any>();
                        (treeSurvival || []).forEach((s: any) => {
                          const d = s.last_checked_date;
                          if (!d) return;
                          if (!byDate.has(d)) byDate.set(d, { key: d, date: d });
                          const entry = byDate.get(d);
                          entry.survival_status = s.survival_status;
                          entry.survival_rate = s.survival_rate;
                          entry.notes = entry.notes || s.notes;
                        });
                        (treeGrowth || []).forEach((g: any) => {
                          const d = g.last_measured_date;
                          if (!d) return;
                          if (!byDate.has(d)) byDate.set(d, { key: d, date: d });
                          const entry = byDate.get(d);
                          entry.growth_stage = g.growth_stage;
                          entry.tree_age = g.tree_age;
                          entry.tree_height = g.tree_height;
                          entry.notes = entry.notes || g.notes;
                        });
                        const logs = Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
                        if (logs.length === 0) {
                          return <p className="text-sm text-muted-foreground italic text-center py-6">No metrics logged yet.</p>;
                        }
                        return (
                          <div className="rounded-md border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead className="text-[11px] px-2 w-[18%]">Date</TableHead>
                                  <TableHead className="text-[11px] px-2 w-[14%]">Status</TableHead>
                                  <TableHead className="text-[11px] px-2 w-[16%]">Stage</TableHead>
                                  <TableHead className="text-[11px] px-2 text-right w-[16%]">Survival %</TableHead>
                                  <TableHead className="text-[11px] px-2 text-right w-[18%]">Age</TableHead>
                                  <TableHead className="text-[11px] px-2 text-right w-[18%]">Height</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {logs.map((log) => (
                                  <React.Fragment key={log.key}>
                                    <TableRow className={log.notes ? "border-b-0" : ""}>
                                      <TableCell className="text-xs whitespace-nowrap px-2 py-1.5">{format(new Date(log.date), "dd MMM yyyy")}</TableCell>
                                      <TableCell className="px-2 py-1.5">
                                        {log.survival_status ? (
                                          <Badge variant="outline" className={`text-[11px] px-1.5 py-0 ${log.survival_status === 'Alive' ? 'border-green-300 text-green-700 bg-green-50' : log.survival_status === 'Dead' ? 'border-red-300 text-red-700 bg-red-50' : 'border-amber-300 text-amber-700 bg-amber-50'}`}>
                                            {log.survival_status}
                                          </Badge>
                                        ) : <span className="text-xs text-muted-foreground">—</span>}
                                      </TableCell>
                                      <TableCell className="px-2 py-1.5">
                                        {log.growth_stage ? (
                                          <Badge variant="outline" className="text-[11px] px-1.5 py-0 border-emerald-300 text-emerald-800 bg-emerald-100 capitalize">
                                            {log.growth_stage}
                                          </Badge>
                                        ) : <span className="text-xs text-muted-foreground">—</span>}
                                      </TableCell>
                                      <TableCell className="text-xs text-right tabular-nums px-2 py-1.5">
                                        {log.survival_rate != null ? `${log.survival_rate}%` : '—'}
                                      </TableCell>
                                      <TableCell className="text-xs text-right whitespace-nowrap px-2 py-1.5">{log.tree_age ? (/[a-zA-Z]/.test(log.tree_age) ? log.tree_age : `${log.tree_age} months`) : '—'}</TableCell>
                                      <TableCell className="text-xs text-right whitespace-nowrap px-2 py-1.5">{log.tree_height ? (/[a-zA-Z]/.test(log.tree_height) ? log.tree_height : `${log.tree_height} cm`) : '—'}</TableCell>
                                    </TableRow>
                                    {log.notes && (
                                      <TableRow>
                                        <TableCell colSpan={6} className="text-xs px-2 pt-0 pb-1.5 text-muted-foreground italic">
                                          {log.notes}
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </React.Fragment>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        );
                      })()}
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
                queryClient.invalidateQueries({ queryKey: ["treeGeotag"] });
                refetchGeotag();
                setGeotagDialog(null);
              }}
            >
              Save Geotag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Survival & Growth Metrics Sheet */}
      <Sheet open={!!metricsSheet} onOpenChange={(open) => !open && setMetricsSheet(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {metricsSheet && (() => {
            // Merge survival + growth records by date for combined log table
            const combinedLogs: Array<{
              key: string;
              date: string;
              survival_status?: string;
              survival_rate?: number | null;
              growth_stage?: string;
              tree_age?: string | null;
              tree_height?: string | null;
              notes?: string | null;
            }> = [];
            const byDate = new Map<string, any>();
            (treeSurvival || []).forEach((s: any) => {
              const d = s.last_checked_date;
              if (!d) return;
              if (!byDate.has(d)) byDate.set(d, { key: d, date: d });
              const entry = byDate.get(d);
              entry.survival_status = s.survival_status;
              entry.survival_rate = s.survival_rate;
              entry.notes = entry.notes || s.notes;
            });
            (treeGrowth || []).forEach((g: any) => {
              const d = g.last_measured_date;
              if (!d) return;
              if (!byDate.has(d)) byDate.set(d, { key: d, date: d });
              const entry = byDate.get(d);
              entry.growth_stage = g.growth_stage;
              entry.tree_age = g.tree_age;
              entry.tree_height = g.tree_height;
              entry.notes = entry.notes || g.notes;
            });
            const logs = Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
            const totalLogs = logs.length;

            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Survival & Growth Metrics
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground">Tree: {metricsSheet.otot_id}</p>
                </SheetHeader>

                <Tabs value={metricsTab} onValueChange={setMetricsTab} className="mt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="new">New Log</TabsTrigger>
                    <TabsTrigger value="previous">Previous Logs ({totalLogs})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="new">
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <Label>Checked Date *</Label>
                        <Input
                          type="date"
                          max={new Date().toISOString().split('T')[0]}
                          value={metricsForm.checked_date}
                          onChange={(e) => setMetricsForm(f => ({ ...f, checked_date: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Survival Status *</Label>
                        <Select value={metricsForm.survival_status} onValueChange={(v) => setMetricsForm(f => ({ ...f, survival_status: v }))}>
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
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={metricsForm.survival_rate}
                          onChange={(e) => setMetricsForm(f => ({ ...f, survival_rate: e.target.value }))}
                          placeholder="e.g. 85"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Growth Stage *</Label>
                        <Select value={metricsForm.growth_stage} onValueChange={(v) => setMetricsForm(f => ({ ...f, growth_stage: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sapling">Sapling</SelectItem>
                            <SelectItem value="young">Young</SelectItem>
                            <SelectItem value="mature">Mature</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Tree Age</Label>
                        <div className="grid grid-cols-[1fr_110px] gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={metricsForm.tree_age}
                            onChange={(e) => setMetricsForm(f => ({ ...f, tree_age: e.target.value }))}
                            placeholder="e.g. 18"
                          />
                          <Select value={metricsForm.age_unit} onValueChange={(v) => setMetricsForm(f => ({ ...f, age_unit: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="months">Months</SelectItem>
                              <SelectItem value="years">Years</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Tree Height</Label>
                        <div className="grid grid-cols-[1fr_110px] gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            value={metricsForm.tree_height}
                            onChange={(e) => setMetricsForm(f => ({ ...f, tree_height: e.target.value }))}
                            placeholder="e.g. 150"
                          />
                          <Select value={metricsForm.height_unit} onValueChange={(v) => setMetricsForm(f => ({ ...f, height_unit: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cm">cm</SelectItem>
                              <SelectItem value="m">m</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Notes</Label>
                        <Textarea
                          value={metricsForm.notes}
                          onChange={(e) => setMetricsForm(f => ({ ...f, notes: e.target.value }))}
                          placeholder="Observations..."
                          rows={3}
                        />
                      </div>
                      <Button
                        className="w-full"
                        disabled={!metricsForm.checked_date}
                        onClick={async () => {
                          const heightNum = metricsForm.tree_height ? parseFloat(metricsForm.tree_height) : null;
                          const ageNum = metricsForm.tree_age ? parseFloat(metricsForm.tree_age) : null;
                          const heightCm = heightNum != null ? (metricsForm.height_unit === 'm' ? heightNum * 100 : heightNum) : null;
                          const ageMonths = ageNum != null ? Math.round(metricsForm.age_unit === 'years' ? ageNum * 12 : ageNum) : null;
                          const heightDisplay = heightNum != null ? `${heightNum} ${metricsForm.height_unit}` : null;
                          const ageDisplay = ageNum != null ? `${ageNum} ${metricsForm.age_unit}` : null;

                          const [survivalRes, growthRes] = await Promise.all([
                            supabase.from("tree_survival_tracking" as any).insert({
                              tree_id: metricsSheet.id,
                              survival_status: metricsForm.survival_status,
                              survival_rate: metricsForm.survival_rate ? parseFloat(metricsForm.survival_rate) : null,
                              last_checked_date: metricsForm.checked_date,
                              notes: metricsForm.notes || null,
                              created_by: user?.id || null,
                            }),
                            supabase.from("tree_growth_metrics" as any).insert({
                              tree_id: metricsSheet.id,
                              growth_stage: metricsForm.growth_stage,
                              tree_height: heightDisplay,
                              tree_age: ageDisplay,
                              tree_height_cm: heightCm,
                              tree_age_months: ageMonths,
                              photos: [],
                              last_measured_date: metricsForm.checked_date,
                              notes: metricsForm.notes || null,
                              created_by: user?.id || null,
                            }),
                          ]);
                          if (survivalRes.error) { toast.error(survivalRes.error.message); return; }
                          if (growthRes.error) { toast.error(growthRes.error.message); return; }
                          toast.success("Survival & growth metrics saved");
                          refetchSurvival();
                          refetchGrowth();
                          queryClient.invalidateQueries({ queryKey: ["allSurvivalStatuses"] });
                          queryClient.invalidateQueries({ queryKey: ["allGrowthStages"] });
                          setMetricsForm({
                            checked_date: '',
                            survival_status: 'Alive',
                            survival_rate: '',
                            growth_stage: 'sapling',
                            tree_age: '',
                            age_unit: 'months',
                            tree_height: '',
                            height_unit: 'cm',
                            notes: '',
                          });
                          setMetricsTab("previous");
                        }}
                      >
                        Save Metrics
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="previous">
                    <div className="pt-2">
                      {logs.length > 0 ? (
                        <div className="rounded-md border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-[11px] px-2 w-[18%]">Date</TableHead>
                                <TableHead className="text-[11px] px-2 w-[14%]">Status</TableHead>
                                <TableHead className="text-[11px] px-2 w-[16%]">Stage</TableHead>
                                <TableHead className="text-[11px] px-2 text-right w-[16%]">Survival %</TableHead>
                                <TableHead className="text-[11px] px-2 text-right w-[18%]">Age</TableHead>
                                <TableHead className="text-[11px] px-2 text-right w-[18%]">Height</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {logs.map((log) => (
                                <React.Fragment key={log.key}>
                                  <TableRow className={log.notes ? "border-b-0" : ""}>
                                    <TableCell className="text-xs whitespace-nowrap px-2 py-1.5">{format(new Date(log.date), "dd MMM yyyy")}</TableCell>
                                    <TableCell className="px-2 py-1.5">
                                      {log.survival_status ? (
                                        <Badge variant="outline" className={`text-[11px] px-1.5 py-0 ${log.survival_status === 'Alive' ? 'border-green-300 text-green-700 bg-green-50' : log.survival_status === 'Dead' ? 'border-red-300 text-red-700 bg-red-50' : 'border-amber-300 text-amber-700 bg-amber-50'}`}>
                                          {log.survival_status}
                                        </Badge>
                                      ) : <span className="text-xs text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell className="px-2 py-1.5">
                                      {log.growth_stage ? (
                                        <Badge variant="outline" className="text-[11px] px-1.5 py-0 border-emerald-300 text-emerald-800 bg-emerald-100 capitalize">
                                          {log.growth_stage}
                                        </Badge>
                                      ) : <span className="text-xs text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell className="text-xs text-right tabular-nums px-2 py-1.5">
                                      {log.survival_rate != null ? `${log.survival_rate}%` : '—'}
                                    </TableCell>
                                    <TableCell className="text-xs text-right whitespace-nowrap px-2 py-1.5">{log.tree_age ? (/[a-zA-Z]/.test(log.tree_age) ? log.tree_age : `${log.tree_age} months`) : '—'}</TableCell>
                                    <TableCell className="text-xs text-right whitespace-nowrap px-2 py-1.5">{log.tree_height ? (/[a-zA-Z]/.test(log.tree_height) ? log.tree_height : `${log.tree_height} cm`) : '—'}</TableCell>
                                  </TableRow>
                                  {log.notes && (
                                    <TableRow>
                                      <TableCell colSpan={6} className="text-xs px-2 pt-0 pb-1.5 text-muted-foreground italic">
                                        {log.notes}
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic text-center py-6">No metrics logged yet.</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>


      {/* Expanded Map Dialog */}
      <Dialog open={mapExpanded} onOpenChange={setMapExpanded}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Tree Location
            </DialogTitle>
          </DialogHeader>
          {treeGeotag?.latitude != null && treeGeotag?.longitude != null && (
            <div className="rounded-md border overflow-hidden" style={{ height: "70vh" }}>
              <iframe
                title="Tree location map expanded"
                src={`https://www.google.com/maps?q=${treeGeotag.latitude},${treeGeotag.longitude}&z=17&output=embed&t=${mapKey}`}
                className="w-full h-full border-0"
                loading="lazy"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ImpactLogSliders
        open={impactSliderType}
        onClose={() => { setImpactSliderType(null); setImpactSliderContribId(null); }}
        contributionId={impactSliderContribId || ""}
        onPhotoClick={(url) => setLightboxPhoto(url)}
      />

      {/* Engagement Sheet */}
      <Sheet open={!!engagementSheet} onOpenChange={(open) => { if (!open) setEngagementSheet(null); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {engagementSheet && (() => {
            const group = engagementSheet;
            const customerIdFormatted = group.contribution_id.replace("CTR-", "CT2026-");
            const tripFriendlyId = group.trip?.friendly_trip_id || (group.trip_id ? group.trip_id.slice(0, 8) : "—");
            const contributorType = group.contribution_type === "travel_agent" ? "Agent" : "Tourist";
            const plantedTree = group.trees.find(t => t.planting_status === 'planted' || t.planting_status === 'verified');
            const plantingDate = (plantedTree as any)?.planting_date ? new Date((plantedTree as any).planting_date) : (plantedTree?.created_at ? new Date(plantedTree.created_at) : null);
            const anniversaryDate = plantingDate ? new Date(plantingDate.getFullYear() + 1, plantingDate.getMonth(), plantingDate.getDate()) : null;
            const statusLabel = getGroupStatusLabel(group.planting_status);
            const statusColor = getGroupStatusColor(group.planting_status);

            const recordLog = async (
              activity_type: "certificate_viewed" | "update_sent" | "report_downloaded",
              description: string,
              metadata: Record<string, unknown> = {},
            ) => {
              try {
                await logEngagement.mutateAsync({
                  contribution_id: group.contribution_id,
                  activity_type,
                  description,
                  metadata,
                  actor_user_id: user?.id ?? null,
                  actor_email: user?.email ?? null,
                });
              } catch (err) {
                console.error("Failed to record engagement log:", err);
              }
            };

            const handleViewCertificate = async () => {
              if (engagementCertGenerating) return;
              setEngagementCertGenerating(true);
              try {
                const co2PerTree = group.trip && group.trip.trees_needed > 0
                  ? group.trip.total_co2 / group.trip.trees_needed
                  : 0;
                const co2Offset = Number((co2PerTree * group.total_trees).toFixed(1));
                const firstTree: any = group.trees[0];
                const ototId = firstTree?.otot_id || firstTree?.tree_id || group.contribution_id;
                const blob = await generateTreeCertificate({
                  userName: group.tourist_name || "Environmental Supporter",
                  userId: (group.trees[0] as any)?.user_id || user?.id || group.contribution_id,
                  numTrees: group.total_trees,
                  co2Offset,
                  ototId,
                  location: "Mau Forest Complex, Kenya",
                });
                const fileName = `tree-certificate-${group.contribution_id}.pdf`;
                setEngagementCertPreview({ blob, name: fileName });
                await recordLog(
                  "certificate_viewed",
                  `Certificate viewed for ${group.contribution_id} (${group.total_trees} tree(s))`,
                  { num_trees: group.total_trees },
                );
              } catch (err) {
                console.error("Certificate generation error:", err);
                toast.error("Failed to generate certificate");
              } finally {
                setEngagementCertGenerating(false);
              }
            };

            const handleSendUpdate = () => {
              setEngagementSendOpen(true);
            };

            const handleDownloadReport = async () => {
              if (engagementReportGenerating) return;
              setEngagementReportGenerating(true);
              try {
                // Fetch status timeline for trees in this group
                const treeIds = group.trees.map(t => t.id);
                const { data: transitions } = await supabase
                  .from("tree_status_transitions" as any)
                  .select("to_status, created_at, transition_data")
                  .in("tree_id", treeIds)
                  .order("created_at", { ascending: true });
                const seen = new Set<string>();
                const timeline = ((transitions as any[]) || [])
                  .filter(t => {
                    if (seen.has(t.to_status)) return false;
                    seen.add(t.to_status);
                    return true;
                  })
                  .map(t => ({
                    status: t.to_status,
                    label: STATUS_LABELS[t.to_status] || t.to_status,
                    date: t.created_at,
                    actor: (t.transition_data as any)?.recorded_by || null,
                  }));

                // Photos count
                const photosCount = group.trees.reduce((acc, t: any) => {
                  const photos = (t.transition_data?.photos || t.geotag_photos || []) as any[];
                  return acc + (Array.isArray(photos) ? photos.length : 0);
                }, 0);

                // Group geotag (first tree with lat/lng)
                const tWithGeo: any = group.trees.find((t: any) => t.latitude && t.longitude);
                const geotag = tWithGeo
                  ? { latitude: Number(tWithGeo.latitude), longitude: Number(tWithGeo.longitude) }
                  : null;

                const blob = await generateEngagementReport({
                  contribution_id: group.contribution_id,
                  customer_id: customerIdFormatted,
                  contributor_name: group.tourist_name || "—",
                  contributor_type: contributorType,
                  contributor_email: (group.trees[0] as any)?.contact_email || null,
                  trip_id: tripFriendlyId,
                  total_trees: group.total_trees,
                  total_amount: group.total_amount,
                  currency: group.currency,
                  payment_date: group.payment_date,
                  planting_status_label: statusLabel,
                  anniversary_date: anniversaryDate ? anniversaryDate.toISOString() : null,
                  photos_count: photosCount,
                  geotag,
                  status_timeline: timeline,
                  activity_log: engagementActivities.map(a => ({
                    type: a.activity_type,
                    description: a.description,
                    timestamp: a.created_at,
                    actor: a.actor_email || "System",
                  })),
                  generated_by: user?.email || "System",
                });
                const fileName = `engagement-report-${group.contribution_id}.pdf`;
                setEngagementReportPreview({ blob, name: fileName });
                await recordLog(
                  "report_downloaded",
                  `Engagement report generated for ${group.contribution_id}`,
                  { trees: group.total_trees, photos: photosCount },
                );
              } catch (err) {
                console.error("Report generation error:", err);
                toast.error("Failed to generate report");
              } finally {
                setEngagementReportGenerating(false);
              }
            };

            const logTypeMeta: Record<string, { label: string; icon: any; color: string }> = {
              certificate_viewed: { label: "Certificate Viewed", icon: Award, color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
              update_sent: { label: "Update Sent", icon: Send, color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
              report_downloaded: { label: "Report Downloaded", icon: FileDown, color: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
            };

            return (
              <>
                <SheetHeader>
                  <SheetTitle className="sr-only">Engagement</SheetTitle>
                </SheetHeader>

                {/* Tree Order Info Header */}
                <div className="border-b pb-4 mb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold tracking-tight">{group.contribution_id}</h2>
                    <Badge variant="outline" className={statusColor}>{statusLabel}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                    <span>Customer ID: <span className="font-medium text-foreground">{customerIdFormatted}</span></span>
                    <span>Trip: <span className="font-medium text-foreground">{tripFriendlyId}</span></span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Contributor: <span className="font-medium text-foreground">{group.tourist_name || "—"}</span> <span className="text-muted-foreground">({contributorType})</span>
                  </div>

                  <div className="flex items-center gap-4 mt-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Trees ordered</div>
                      <div className="text-lg font-bold">{group.total_trees}</div>
                    </div>
                    <Separator orientation="vertical" className="h-10" />
                    <div>
                      <div className="text-xs text-muted-foreground">Amount paid</div>
                      <div className="text-lg font-bold">${Number(group.total_amount).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <Tabs value={engagementTab} onValueChange={setEngagementTab} className="mt-2">
                  <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 h-auto gap-2 rounded-none">
                    <TabsTrigger value="engagement" className="text-xs rounded-md border border-border bg-muted/40 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/30">
                      <Bell className="h-3.5 w-3.5 mr-1.5" /> Engagement
                    </TabsTrigger>
                    <TabsTrigger value="log" className="text-xs rounded-md border border-border bg-muted/40 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/30">
                      <History className="h-3.5 w-3.5 mr-1.5" /> Log ({engagementActivities.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="engagement" className="mt-4 space-y-4">
                    <Card>
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-md bg-primary/10">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground">Anniversary Date</div>
                            <div className="text-sm font-medium">{anniversaryDate ? format(anniversaryDate, "dd MMM yyyy") : "—"}</div>
                          </div>
                          {anniversaryDate && (
                            <Badge variant="outline" className="text-[10px]">
                              {Math.ceil((anniversaryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                            </Badge>
                          )}
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 gap-2">
                          <Button variant="outline" size="sm" className="justify-start" onClick={handleViewCertificate} disabled={engagementCertGenerating}>
                            <Award className="h-4 w-4 mr-2" /> {engagementCertGenerating ? "Generating…" : "View Certificate"}
                          </Button>
                          <Button variant="outline" size="sm" className="justify-start" onClick={handleSendUpdate}>
                            <Send className="h-4 w-4 mr-2" /> Send Update to Contributor
                          </Button>
                          <Button variant="outline" size="sm" className="justify-start" onClick={handleDownloadReport} disabled={engagementReportGenerating}>
                            <FileDown className="h-4 w-4 mr-2" /> {engagementReportGenerating ? "Generating…" : "Download Report"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="log" className="mt-4">
                    {engagementActivities.length === 0 ? (
                      <div className="text-center py-12 text-sm text-muted-foreground">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        No activity logged yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {engagementActivities.map((log: EngagementActivity) => {
                          const meta = logTypeMeta[log.activity_type] || { label: log.activity_type, icon: Info, color: "bg-muted text-muted-foreground border-border" };
                          const Icon = meta.icon;
                          return (
                            <div key={log.id} className="flex items-start gap-3 p-3 rounded-md border border-border bg-card">
                              <div className={`p-1.5 rounded-md ${meta.color}`}>
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className={`text-[10px] ${meta.color}`}>{meta.label}</Badge>
                                  <span className="text-[11px] text-muted-foreground">{format(new Date(log.created_at), "dd MMM yyyy, hh:mm a")}</span>
                                </div>
                                <p className="text-sm mt-1">{log.description}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">by {log.actor_email || "System"}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      <CertificatePreviewDialog
        previewCert={engagementCertPreview}
        onClose={() => setEngagementCertPreview(null)}
        onDownload={(file) => {
          const url = URL.createObjectURL(file.blob);
          const a = document.createElement("a");
          a.href = url; a.download = file.name;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }}
      />

      <PdfPreviewDialog
        file={engagementReportPreview}
        onClose={() => setEngagementReportPreview(null)}
        title={engagementReportPreview?.name || "Engagement Report"}
        description="Tree order engagement report — preview, open in a new tab, or download."
      />

      {engagementSheet && (
        <SendUpdateDialog
          open={engagementSendOpen}
          onOpenChange={setEngagementSendOpen}
          contributionId={engagementSheet.contribution_id}
          contributorName={engagementSheet.tourist_name || ""}
          contributorEmail={(engagementSheet.trees[0] as any)?.contact_email || null}
          totalTrees={engagementSheet.total_trees}
          plantingStatusLabel={getGroupStatusLabel(engagementSheet.planting_status)}
          anniversaryDate={(() => {
            const planted = engagementSheet.trees.find(t => t.planting_status === 'planted' || t.planting_status === 'verified');
            const pd = (planted as any)?.planting_date ? new Date((planted as any).planting_date) : (planted?.created_at ? new Date(planted.created_at) : null);
            return pd ? format(new Date(pd.getFullYear() + 1, pd.getMonth(), pd.getDate()), "dd MMM yyyy") : null;
          })()}
          photosCount={engagementSheet.trees.reduce((acc, t: any) => {
            const photos = (t.transition_data?.photos || t.geotag_photos || []) as any[];
            return acc + (Array.isArray(photos) ? photos.length : 0);
          }, 0)}
          onSent={async (subject, recipientEmail) => {
            try {
              await logEngagement.mutateAsync({
                contribution_id: engagementSheet.contribution_id,
                activity_type: "update_sent",
                description: `Update email "${subject}" sent to ${recipientEmail}`,
                metadata: { subject, recipient_email: recipientEmail },
                actor_user_id: user?.id ?? null,
                actor_email: user?.email ?? null,
              });
            } catch (err) { console.error("Failed to log update_sent:", err); }
          }}
        />
      )}


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
