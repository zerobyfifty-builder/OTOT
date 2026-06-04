import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { RefreshCw, Search, Eye, ArrowUpDown, ArrowUp, ArrowDown, MoreVertical, Info, Download, Pencil } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface ContributionRow {
  id: string;
  contribution_id: string;
  contribution_type: string;
  tourist_name: string | null;
  country: string | null;
  num_trees: number;
  amount_paid: number;
  amount_received: number;
  amount_retained: number;
  amount_transferred: number;
  mktng_fee_allocated: number;
  currency: string;
  payment_date: string | null;
  payment_method: string | null;
  transaction_reference: string | null;
  ktb_receipt_id: string | null;
  ktb_received_date: string | null;
  plantation_partner_id: string | null;
  transfer_date: string | null;
  transfer_reference: string | null;
  transfer_mode: string | null;
  partner_receipt_confirmation: boolean;
  partner_received_date: string | null;
  status: string;
  created_at: string;
  tech_receipt_id: string | null;
  tech_received_date: string | null;
  institution_receipt_id: string | null;
  institution_received_date: string | null;
  tech_fee_received: number;
  tech_fee_percent: number | null;
  ktb_fee_percent: number | null;
}

type SortField = "contribution_id" | "contribution_type" | "tourist_name" | "num_trees" | "amount_paid" | "payment_date" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

const STATUS_SEQUENCE = [
  { value: "contribution_confirmed", label: "Confirmed" },
  { value: "funds_received", label: "Received by KTB" },
  { value: "transferred_for_planting", label: "Transferred for Plantation" },
  { value: "received_for_planting", label: "Received for Plantation" },
];

const getNextStatuses = (currentStatus: string) => {
  const currentIndex = STATUS_SEQUENCE.findIndex(s => s.value === currentStatus);
  if (currentIndex === -1) return STATUS_SEQUENCE.slice(0, 1);
  // Only allow the immediate next status
  if (currentIndex >= STATUS_SEQUENCE.length - 1) return [];
  return [STATUS_SEQUENCE[currentIndex + 1]];
};

// Keep for label lookups
const STATUS_OPTIONS = STATUS_SEQUENCE;

const getStatusBadge = (status: string) => {
  const base = "whitespace-nowrap px-2 py-0.5 text-[10px] font-medium";
  switch (status) {
    case "contribution_confirmed":
      return <Badge className={`${base} bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50`}>Confirmed</Badge>;
    case "funds_received":
      return <Badge className={`${base} bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50`}>Received by KTB</Badge>;
    case "transferred_for_planting":
      return <Badge className={`${base} bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-50`}>Transferred for Plantation</Badge>;
    case "received_for_planting":
      return <Badge className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50`}>Received for Plantation</Badge>;
    default:
      return <Badge variant="outline" className={base}>{status}</Badge>;
  }
};

const getStatusOrder = (status: string) => {
  switch (status) {
    case "contribution_confirmed": return 1;
    case "funds_received": return 2;
    case "transferred_for_planting": return 3;
    case "received_for_planting": return 4;
    default: return 0;
  }
};

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#8b5cf6", "#10b981"];

export default function AdminContributionTracking() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("payment_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedRow, setSelectedRow] = useState<ContributionRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<ContributionRow | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [updating, setUpdating] = useState(false);
  // Contextual fields for status updates
  const [statusFields, setStatusFields] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  const { data: contributions, isLoading, refetch } = useQuery({
    queryKey: ["adminContributionTracking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contribution_tracking" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ContributionRow[];
    },
  });

  const { data: walletSettings } = useQuery({
    queryKey: ["walletSettings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallet_settings")
        .select("setting_key, setting_value");
      return data || [];
    },
  });

  const { data: orgMap } = useQuery({
    queryKey: ["orgNameMap"],
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id, name, category")
        .eq("is_active", true);
      const map: Record<string, { name: string; category: string }> = {};
      (data || []).forEach((o: any) => { map[o.id] = { name: o.name, category: o.category }; });
      return map;
    },
  });

  const techFeePercent = useMemo(() => {
    const s = walletSettings?.find((w: any) => w.setting_key === "tech_partner_fee");
    return s ? Number(s.setting_value) : 30;
  }, [walletSettings]);

  const ktbFeePercent = useMemo(() => {
    const s = walletSettings?.find((w: any) => w.setting_key === "ktb_marketing_fee");
    return s ? Number(s.setting_value) : 40;
  }, [walletSettings]);

  const getRowTechFee = (c: ContributionRow) => c.tech_fee_percent ?? techFeePercent;
  const getRowKtbFee = (c: ContributionRow) => c.ktb_fee_percent ?? ktbFeePercent;
  const getTechFee = (c: ContributionRow) => Number(c.amount_paid) * getRowTechFee(c) / 100;
  const getToBeReceived = (c: ContributionRow) => Number(c.amount_paid) - getTechFee(c);
  const getRetained = (c: ContributionRow) => getToBeReceived(c) * getRowKtbFee(c) / 100;
  const getToBeTransferred = (c: ContributionRow) => getToBeReceived(c) - getRetained(c);

  const plantationPercent = 100 - ktbFeePercent;

  // Status update handler
  const handleStatusUpdate = async () => {
    if (!statusTarget || !newStatus) return;
    setUpdating(true);
    try {
      const updatePayload: Record<string, any> = { status: newStatus, updated_at: new Date().toISOString() };

      // Add contextual fields based on status
      if (newStatus === "funds_received") {
        if (statusFields.ktb_receipt_id) updatePayload.ktb_receipt_id = statusFields.ktb_receipt_id;
        if (statusFields.ktb_received_date) updatePayload.ktb_received_date = statusFields.ktb_received_date;
      } else if (newStatus === "transferred_for_planting") {
        if (statusFields.transfer_reference) updatePayload.transfer_reference = statusFields.transfer_reference;
        if (statusFields.transfer_date) updatePayload.transfer_date = statusFields.transfer_date;
        if (statusFields.transfer_mode) updatePayload.transfer_mode = statusFields.transfer_mode;
      } else if (newStatus === "received_for_planting") {
        updatePayload.partner_receipt_confirmation = true;
        if (statusFields.partner_received_date) updatePayload.partner_received_date = statusFields.partner_received_date;
      }

      const { error } = await supabase
        .from("contribution_tracking" as any)
        .update(updatePayload as any)
        .eq("id", statusTarget.id);
      if (error) throw error;
      toast.success(`Status updated to "${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}"`);
      queryClient.invalidateQueries({ queryKey: ["adminContributionTracking"] });
      setStatusDialogOpen(false);
      setStatusTarget(null);
      setStatusFields({});
      if (selectedRow?.id === statusTarget.id) {
        setSelectedRow({ ...selectedRow, status: newStatus, ...updatePayload });
      }
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const openStatusDialog = (c: ContributionRow) => {
    const nextStatuses = getNextStatuses(c.status);
    if (nextStatuses.length === 0) {
      toast.info("This contribution has reached its final status.");
      return;
    }
    setStatusTarget(c);
    setNewStatus(nextStatuses[0].value);
    setStatusFields({
      ktb_receipt_id: c.ktb_receipt_id || "",
      ktb_received_date: c.ktb_received_date || new Date().toISOString().split("T")[0],
      transfer_reference: c.transfer_reference || "",
      transfer_date: c.transfer_date || new Date().toISOString().split("T")[0],
      transfer_mode: c.transfer_mode || "",
      partner_received_date: c.partner_received_date || new Date().toISOString().split("T")[0],
    });
    setStatusDialogOpen(true);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1 text-admin-accent" /> : <ArrowDown className="h-3 w-3 ml-1 text-admin-accent" />;
  };

  const filtered = useMemo(() => {
    let result = contributions?.filter((c) => {
      const matchSearch = !search ||
        c.contribution_id?.toLowerCase().includes(search.toLowerCase()) ||
        c.tourist_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.transaction_reference?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      const ct = c.contribution_type;
      const matchType = typeFilter === "all" ||
        (typeFilter === "agent" && ct === "travel_agent") ||
        (typeFilter === "tourist" && ct !== "travel_agent");
      return matchSearch && matchStatus && matchType;
    }) || [];
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "contribution_id": cmp = (a.contribution_id || "").localeCompare(b.contribution_id || ""); break;
        case "contribution_type": cmp = (a.contribution_type || "").localeCompare(b.contribution_type || ""); break;
        case "tourist_name": cmp = (a.tourist_name || "").localeCompare(b.tourist_name || ""); break;
        case "num_trees": cmp = a.num_trees - b.num_trees; break;
        case "amount_paid": cmp = Number(a.amount_paid) - Number(b.amount_paid); break;
        case "payment_date": cmp = (a.payment_date || a.created_at || "").localeCompare(b.payment_date || b.created_at || ""); break;
        case "status": cmp = getStatusOrder(a.status) - getStatusOrder(b.status); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [contributions, search, statusFilter, typeFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totals = useMemo(() => {
    const all = contributions || [];
    const gross = all.reduce((s, c) => s + Number(c.amount_paid), 0);
    const totalTechFee = all.reduce((s, c) => s + getTechFee(c), 0);
    const totalToBeReceived = all.reduce((s, c) => s + getToBeReceived(c), 0);
    const totalRetained = all.reduce((s, c) => s + getRetained(c), 0);
    const totalToBeTransferred = all.reduce((s, c) => s + getToBeTransferred(c), 0);
    const byStatus = {
      confirmed: all.filter(c => c.status === "contribution_confirmed").length,
      receivedByKtb: all.filter(c => c.status === "funds_received").length,
      transferred: all.filter(c => c.status === "transferred_for_planting").length,
      receivedForPlanting: all.filter(c => c.status === "received_for_planting").length,
    };
    return { gross, totalTechFee, totalToBeReceived, totalRetained, totalToBeTransferred, count: all.length, trees: all.reduce((s, c) => s + c.num_trees, 0), byStatus };
  }, [contributions, techFeePercent, ktbFeePercent]);

  // Chart data: fund flow over time (monthly)
  const monthlyChartData = useMemo(() => {
    const all = contributions || [];
    const monthMap: Record<string, { month: string; gross: number; techFee: number; ktbRetained: number; plantation: number }> = {};
    all.forEach(c => {
      const d = c.payment_date || c.created_at;
      if (!d) return;
      const monthKey = d.substring(0, 7); // YYYY-MM
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { month: monthKey, gross: 0, techFee: 0, ktbRetained: 0, plantation: 0 };
      }
      monthMap[monthKey].gross += Number(c.amount_paid);
      monthMap[monthKey].techFee += getTechFee(c);
      monthMap[monthKey].ktbRetained += getRetained(c);
      monthMap[monthKey].plantation += getToBeTransferred(c);
    });
    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  }, [contributions, techFeePercent, ktbFeePercent]);

  // Chart data: status distribution pie
  const statusPieData = useMemo(() => [
    { name: "Confirmed", value: totals.byStatus.confirmed },
    { name: "Received by KTB", value: totals.byStatus.receivedByKtb },
    { name: "Transferred", value: totals.byStatus.transferred },
    { name: "Received for Plantation", value: totals.byStatus.receivedForPlanting },
  ].filter(d => d.value > 0), [totals]);

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
  };

  const SortableHead = ({ field, label, className = "" }: { field: SortField; label: string; className?: string }) => (
    <TableHead className={`cursor-pointer select-none text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors ${className}`} onClick={() => handleSort(field)}>
      <span className="flex items-center gap-0.5">{label}{getSortIcon(field)}</span>
    </TableHead>
  );

  const StaticHead = ({ label, className = "", tooltip }: { label: string; className?: string; tooltip?: string }) => (
    <TableHead className={`text-xs font-semibold uppercase tracking-wider text-muted-foreground ${className}`}>
      {tooltip ? (
        <TooltipProvider><Tooltip><TooltipTrigger asChild>
          <span className="flex items-center gap-1 cursor-help">{label}<Info className="h-3 w-3 text-muted-foreground/50" /></span>
        </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">{tooltip}</p></TooltipContent></Tooltip></TooltipProvider>
      ) : label}
    </TableHead>
  );

  const exportCSV = () => {
    const rows = filtered.map(c => [
      c.contribution_id, formatDate(c.payment_date || c.created_at), c.contribution_type, c.tourist_name,
      c.country, c.num_trees, Number(c.amount_paid).toFixed(2), getTechFee(c).toFixed(2),
      getToBeReceived(c).toFixed(2), getRetained(c).toFixed(2), getToBeTransferred(c).toFixed(2), c.status
    ].join(","));
    const csv = ["Contri ID,Date,Type,Contributor,Country,Trees,Gross,Tech Fee,To Be Received,Retained,To Be Transferred,Status", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `contribution-tracking-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); toast.success("Exported successfully");
  };

  const formatChartMonth = (m: string) => {
    try {
      const [y, mo] = m.split("-");
      return format(new Date(Number(y), Number(mo) - 1), "MMM yy");
    } catch { return m; }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-admin-primary">Climate Funding</h1>
          <p className="text-sm text-muted-foreground mt-1">Holistic view of all platform fund movements across owner types</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export</Button>
          <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-admin-primary rounded-l-lg" />
          <CardContent className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-admin-primary mb-3">Gross Contributions</p>
            <p className="text-2xl font-bold tabular-nums">${formatNumber(totals.gross)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{totals.count} contributions · {totals.trees} trees</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-[hsl(212,100%,50%)] rounded-l-lg" />
          <CardContent className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(212,100%,50%)] mb-3">Tech Partner</p>
            <p className="text-2xl font-bold tabular-nums">${formatNumber(totals.totalTechFee)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{techFeePercent}% of gross</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-[hsl(348,70%,30%)] rounded-l-lg" />
          <CardContent className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(348,70%,30%)] mb-3">KTB Retained</p>
            <p className="text-2xl font-bold tabular-nums">${formatNumber(totals.totalRetained)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{ktbFeePercent}% of net</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600 rounded-l-lg" />
          <CardContent className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700 mb-3">For Plantation</p>
            <p className="text-2xl font-bold tabular-nums">${formatNumber(totals.totalToBeTransferred)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{plantationPercent}% of net</p>
          </CardContent>
        </Card>
      </div>

      {/* Status pipeline */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Confirmed", count: totals.byStatus.confirmed, color: "bg-blue-500" },
          { label: "Received by KTB", count: totals.byStatus.receivedByKtb, color: "bg-amber-500" },
          { label: "Transferred for Plantation", count: totals.byStatus.transferred, color: "bg-violet-500" },
          { label: "Received for Plantation", count: totals.byStatus.receivedForPlanting, color: "bg-emerald-500" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 bg-background border rounded-lg p-3">
            <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
            <div>
              <p className="text-lg font-bold tabular-nums">{s.count}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fund flow over time */}
        <Card className="lg:col-span-2 border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Fund Flow Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {monthlyChartData.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tickFormatter={formatChartMonth} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                    formatter={(value: number, name: string) => [`$${formatNumber(value)}`, name]}
                    labelFormatter={formatChartMonth}
                  />
                  <Bar dataKey="techFee" name="Tech Fee" fill="hsl(212, 100%, 50%)" radius={[2, 2, 0, 0]} stackId="a" />
                  <Bar dataKey="ktbRetained" name="KTB Retained" fill="hsl(348, 70%, 30%)" radius={[0, 0, 0, 0]} stackId="a" />
                  <Bar dataKey="plantation" name="Plantation" fill="hsl(152, 60%, 40%)" radius={[2, 2, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status distribution pie */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {statusPieData.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {statusPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by ID, name, or reference..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="contribution_confirmed">Confirmed</SelectItem>
              <SelectItem value="funds_received">Received by KTB</SelectItem>
              <SelectItem value="transferred_for_planting">Transferred for Plantation</SelectItem>
              <SelectItem value="received_for_planting">Received for Plantation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="px-4 pb-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No contributions found.</div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <SortableHead field="contribution_id" label="Contri ID" />
                      <SortableHead field="payment_date" label="Date" />
                      <SortableHead field="contribution_type" label="Type" />
                      <SortableHead field="tourist_name" label="Contributor" />
                      <SortableHead field="num_trees" label="Trees" className="text-center" />
                      <SortableHead field="amount_paid" label="Gross" className="text-right" />
                      <StaticHead label="Tech Fee" className="text-right" tooltip={`${techFeePercent}% platform fee`} />
                      <StaticHead label="KTB Net" className="text-right" tooltip="Gross minus Tech Fee" />
                      <StaticHead label="KTB Retained" className="text-right" tooltip="Retained for Marketing, Administrative and Oversight Expenses" />
                      <StaticHead label="For Plantation" className="text-right" tooltip="Transferred for tree planting, growing and maintenance" />
                      <SortableHead field="status" label="Status" />
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-10">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map(c => (
                      <TableRow key={c.id} className="hover:bg-muted/20">
                        <TableCell className="font-mono text-xs font-medium">{c.contribution_id}</TableCell>
                        <TableCell className="text-xs tabular-nums">{formatDate(c.payment_date || c.created_at)}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium ${c.contribution_type === "travel_agent" ? "text-indigo-600" : "text-teal-600"}`}>
                            {c.contribution_type === "travel_agent" ? "Agent" : "Tourist"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{c.tourist_name || "-"}</TableCell>
                        <TableCell className="text-center text-xs tabular-nums">{c.num_trees}</TableCell>
                        <TableCell className="text-right text-xs font-medium tabular-nums">${formatNumber(Number(c.amount_paid))}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-[hsl(212,100%,50%)]">${formatNumber(getTechFee(c))}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">${formatNumber(getToBeReceived(c))}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-[hsl(348,70%,30%)]">${formatNumber(getRetained(c))}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-emerald-700">${formatNumber(getToBeTransferred(c))}</TableCell>
                        <TableCell>{getStatusBadge(c.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedRow(c); setSheetOpen(true); }}>
                                <Eye className="h-4 w-4 mr-2" />View
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openStatusDialog(c)}>
                                <Pencil className="h-4 w-4 mr-2" />Update Status
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                {totalPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem><PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const p = i + 1;
                        return <PaginationItem key={p}><PaginationLink onClick={() => setCurrentPage(p)} isActive={currentPage === p} className="cursor-pointer">{p}</PaginationLink></PaginationItem>;
                      })}
                      <PaginationItem><PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </>
          )}
        </div>
      </Card>

      {/* View Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedRow && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <span className="font-mono">{selectedRow.contribution_id}</span>
                  {getStatusBadge(selectedRow.status)}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Contribution Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-muted-foreground text-xs">Type</span><p className="text-sm font-medium">{selectedRow.contribution_type === "travel_agent" ? "Travel Agent" : "Tourist"}</p></div>
                    <div className="text-right"><span className="text-muted-foreground text-xs">Contributor</span><p className="text-sm font-medium">{selectedRow.tourist_name || "-"}</p></div>
                    <div><span className="text-muted-foreground text-xs">Country</span><p className="text-sm font-medium">{selectedRow.country || "-"}</p></div>
                    <div className="text-right"><span className="text-muted-foreground text-xs">Trees</span><p className="text-sm font-medium">{selectedRow.num_trees}</p></div>
                    <div><span className="text-muted-foreground text-xs">Payment Date</span><p className="text-sm font-medium">{formatDate(selectedRow.payment_date || selectedRow.created_at)}</p></div>
                    <div className="text-right"><span className="text-muted-foreground text-xs">Method</span><p className="text-sm font-medium">{selectedRow.payment_method || "-"}</p></div>
                    <div className="text-right"><span className="text-muted-foreground text-xs">Reference</span><p className="font-mono text-xs">{selectedRow.transaction_reference || "-"}</p></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fund Allocation</p>
                    <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                      as on {formatDate(selectedRow.payment_date || selectedRow.created_at)}
                    </Badge>
                  </div>
                  {(() => {
                    const rowTechPct = getRowTechFee(selectedRow);
                    const rowKtbPct = getRowKtbFee(selectedRow);
                    const rowPlantPct = 100 - rowKtbPct;
                    const gross = Number(selectedRow.amount_paid);
                    const techFee = gross * rowTechPct / 100;
                    const ktbNet = gross - techFee;
                    const ktbRetained = ktbNet * rowKtbPct / 100;
                    const forPlantation = ktbNet - ktbRetained;
                    return (
                      <div className="space-y-0 text-sm border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                          <span className="text-muted-foreground">Gross Contribution</span>
                          <span className="font-semibold tabular-nums">${formatNumber(gross)}</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-blue-50">
                          <span className="text-blue-700 font-medium">Tech Fee ({rowTechPct}%)</span>
                          <span className="font-semibold text-blue-700 tabular-nums">${formatNumber(techFee)}</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                          <span className="text-muted-foreground">KTB Net (To Be Received)</span>
                          <span className="font-semibold tabular-nums">${formatNumber(ktbNet)}</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-amber-50">
                          <span className="text-amber-700 font-medium">KTB Retained ({rowKtbPct}%)</span>
                          <span className="font-semibold text-amber-700 tabular-nums">${formatNumber(ktbRetained)}</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 bg-emerald-50">
                          <span className="text-emerald-800 font-medium">For Plantation ({rowPlantPct}%)</span>
                          <span className="font-semibold text-emerald-800 tabular-nums">${formatNumber(forPlantation)}</span>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="mt-3 flex justify-end">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openStatusDialog(selectedRow)}>
                      <Pencil className="h-3 w-3 mr-1" />Update Status
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Receipt Tracking</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Tech Receipt</span><p className="font-mono">{selectedRow.tech_receipt_id || "-"}</p></div>
                    <div className="text-right"><span className="text-muted-foreground">Tech Received</span><p>{formatDate(selectedRow.tech_received_date)}</p></div>
                    <div><span className="text-muted-foreground">KTB Receipt</span><p className="font-mono">{selectedRow.institution_receipt_id || selectedRow.ktb_receipt_id || "-"}</p></div>
                    <div className="text-right"><span className="text-muted-foreground">KTB Received</span><p>{formatDate(selectedRow.institution_received_date || selectedRow.ktb_received_date)}</p></div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Transfer Details</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Plantation Partner</span><p>{selectedRow.plantation_partner_id && orgMap?.[selectedRow.plantation_partner_id]?.name || "-"}</p></div>
                    <div className="text-right"><span className="text-muted-foreground">Transfer Date</span><p>{formatDate(selectedRow.transfer_date)}</p></div>
                    <div><span className="text-muted-foreground">Transfer Ref</span><p className="font-mono">{selectedRow.transfer_reference || "-"}</p></div>
                    <div className="text-right"><span className="text-muted-foreground">Transfer Mode</span><p>{selectedRow.transfer_mode || "-"}</p></div>
                    <div><span className="text-muted-foreground">Partner Confirmed</span><p>{selectedRow.partner_receipt_confirmation ? "Yes" : "No"}</p></div>
                    <div className="text-right"><span className="text-muted-foreground">Partner Received</span><p>{formatDate(selectedRow.partner_received_date)}</p></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Contribution Status</DialogTitle>
            <DialogDescription>
              {statusTarget && (
                <span>Change status for <strong className="font-mono">{statusTarget.contribution_id}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Current Status</p>
                {statusTarget && getStatusBadge(statusTarget.status)}
              </div>
              <span className="text-muted-foreground mt-4">→</span>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">Next Status</p>
                {statusTarget && (() => {
                  const allowed = getNextStatuses(statusTarget.status);
                  return (
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {allowed.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                })()}
              </div>
            </div>

            {/* Contextual fields based on selected status */}
            {newStatus === "funds_received" && (
              <div className="space-y-3 border-t pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receipt Details</p>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Receipt ID</label>
                  <Input
                    placeholder="e.g. REC-001"
                    value={statusFields.ktb_receipt_id || ""}
                    onChange={e => setStatusFields(f => ({ ...f, ktb_receipt_id: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Received Date</label>
                  <Input
                    type="date"
                    value={statusFields.ktb_received_date || ""}
                    onChange={e => setStatusFields(f => ({ ...f, ktb_received_date: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {newStatus === "transferred_for_planting" && (
              <div className="space-y-3 border-t pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transfer Details</p>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Transfer Reference</label>
                  <Input
                    placeholder="e.g. TRF-001"
                    value={statusFields.transfer_reference || ""}
                    onChange={e => setStatusFields(f => ({ ...f, transfer_reference: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Transfer Date</label>
                  <Input
                    type="date"
                    value={statusFields.transfer_date || ""}
                    onChange={e => setStatusFields(f => ({ ...f, transfer_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Transfer Mode</label>
                  <Select value={statusFields.transfer_mode || ""} onValueChange={v => setStatusFields(f => ({ ...f, transfer_mode: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {newStatus === "received_for_planting" && (
              <div className="space-y-3 border-t pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plantation Receipt</p>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Received Date</label>
                  <Input
                    type="date"
                    value={statusFields.partner_received_date || ""}
                    onChange={e => setStatusFields(f => ({ ...f, partner_received_date: e.target.value }))}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Partner receipt confirmation will be set to <strong>Yes</strong> automatically.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleStatusUpdate} disabled={updating || newStatus === statusTarget?.status}>
              {updating ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
