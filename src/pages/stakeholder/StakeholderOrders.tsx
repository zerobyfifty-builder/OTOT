import { useMemo, useState, useCallback } from "react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, TreePine, DollarSign, Clock, CheckCircle2, Eye, ChevronDown, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown, Layers, CheckCheck, Leaf, FileText, AlertTriangle } from "lucide-react";
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
  'dead',
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
    partially_planted: 8, planted: 9, dead: 10,
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
      };
    });
  }, [contributions, treesByContribution, trips]);

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
    // "waiting_to_be_assigned" saves immediately (no panel)
    if (status === "waiting_to_be_assigned") {
      bulkUpdateStatus.mutate({ treeIds, status });
      return;
    }
    // Find current trees to get from status
    const currentTrees = trees?.filter(t => treeIds.includes(t.id)) || [];
    const fromStatus = currentTrees[0]?.planting_status || "waiting_to_be_assigned";
    const group = contributionGroups.find(g => g.contribution_id === contribId);
    setTransitionRequest({
      treeIds,
      fromStatus,
      toStatus: status,
      contributionId: contribId,
      treeCount: group?.total_trees || treeIds.length,
      isBatch: true,
    });
    setTransitionPanelOpen(true);
  }, [bulkSelections, bulkUpdateStatus, trees, contributionGroups]);

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
                    <SortableHead field="amount_transferred" label="Allocated for Planting" />
                    <SortableHead field="payment_status" label="Payment Status" />
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Planting By</TableHead>
                    <SortableHead field="planting_status" label="Planting Status" />
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-16">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((group) => {
                    const isExpanded = expandedRows.has(group.contribution_id);
                    const plantedInGroup = group.trees.filter(t => t.planting_status === 'planted' || t.planting_status === 'verified').reduce((s, t) => s + t.num_trees, 0);
                    const progressPct = group.total_trees > 0 ? Math.min(100, (plantedInGroup / group.total_trees) * 100) : 0;

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
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge className={`whitespace-nowrap px-2 py-0.5 text-[10px] font-medium ${getGroupStatusColor(group.planting_status)}`}>
                                {getGroupStatusLabel(group.planting_status)}
                              </Badge>
                              <div className="hidden lg:flex items-center gap-1.5 w-16">
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${progressPct}%` }} />
                                </div>
                                <span className="text-[10px] text-muted-foreground tabular-nums">{plantedInGroup}/{group.total_trees}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); setViewSheet(group); }}
                              title="View details"
                            >
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Tree Details */}
                        {isExpanded && (
                          <TableRow key={`${group.contribution_id}-expanded`} className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={11} className="p-0">
                              <div className="px-4 py-3 space-y-3">
                                {/* Bulk Update */}
                                {canEditPlantingStatus && group.trees.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5">
                                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                      <Layers className="h-4 w-4 text-primary" />
                                      <span>Batch update:</span>
                                    </div>
                                    <Select
                                      value={bulkSelections[group.contribution_id] || ""}
                                      onValueChange={(value) =>
                                        setBulkSelections(prev => ({ ...prev, [group.contribution_id]: value }))
                                      }
                                    >
                                      <SelectTrigger className="w-[180px] h-9 bg-background">
                                        <SelectValue placeholder="Select status…" />
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
                                      disabled={!bulkSelections[group.contribution_id] || bulkUpdateStatus.isPending}
                                      onClick={() => handleBulkApply(group.contribution_id, group.trees.map(t => t.id))}
                                    >
                                      <CheckCheck className="h-3.5 w-3.5" />
                                      Apply ({group.trees.length})
                                    </Button>
                                  </div>
                                )}

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

                                  return displayRows.length > 0 ? (
                                  <div className="rounded-lg border bg-background overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="bg-muted/50">
                                          <TableHead className="w-12 text-xs">No.</TableHead>
                                          <TableHead className="text-xs">Tree ID</TableHead>
                                          <TableHead className="text-xs">Trees</TableHead>
                                          <TableHead className="text-xs">Amount</TableHead>
                                          <TableHead className="text-xs">Purchase Date</TableHead>
                                          <TableHead className="text-xs">Planting Status</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {displayRows.map((row, index) => {
                                          if (row.type === 'tree') {
                                            const tree = row.tree;
                                            return (
                                              <TableRow key={tree.id}>
                                                <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                                <TableCell className="font-mono text-sm">{tree.otot_id}</TableCell>
                                                <TableCell>{tree.num_trees}</TableCell>
                                                <TableCell>${Number(tree.amount_paid).toFixed(2)}</TableCell>
                                                <TableCell>{formatDate(tree.created_at)}</TableCell>
                                                <TableCell>
                                                  {canEditPlantingStatus ? (
                                                    <Select
                                                      value={tree.planting_status || 'waiting_to_be_assigned'}
                                                      onValueChange={(value) => {
                                                        if (value === "waiting_to_be_assigned") {
                                                          updateStatus.mutate({ treeId: tree.id, status: value });
                                                          return;
                                                        }
                                                        const contribId = (tree as any).contribution_id;
                                                        setTransitionRequest({
                                                          treeIds: [tree.id],
                                                          fromStatus: tree.planting_status || "waiting_to_be_assigned",
                                                          toStatus: value,
                                                          contributionId: contribId || undefined,
                                                          treeCount: tree.num_trees,
                                                          isBatch: false,
                                                        });
                                                        setTransitionPanelOpen(true);
                                                      }}
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
                                                  ) : (
                                                    <Badge className={`text-xs whitespace-nowrap px-2 py-0.5 font-medium ${PLANTING_STATUS_COLORS[tree.planting_status || 'waiting_to_be_assigned'] || ''}`}>
                                                      {STATUS_LABELS[tree.planting_status || 'waiting_to_be_assigned']}
                                                    </Badge>
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
                                                <TableCell>-</TableCell>
                                                <TableCell>-</TableCell>
                                                <TableCell>
                                                  <Badge className={`text-xs whitespace-nowrap px-2 py-0.5 font-medium ${PLANTING_STATUS_COLORS['waiting_to_be_assigned']}`}>
                                                    {STATUS_LABELS['waiting_to_be_assigned']}
                                                  </Badge>
                                                </TableCell>
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
    </div>
  );
};
