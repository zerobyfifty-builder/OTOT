import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { DollarSign, RefreshCw, Search, Eye, Building2, Landmark, ArrowUpDown, ArrowUp, ArrowDown, MoreVertical, Pencil, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface ContributionRow {
  id: string;
  contribution_id: string;
  contribution_type: string;
  tree_id: string | null;
  tourist_name: string | null;
  country: string | null;
  trip_id: string | null;
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
  acknowledgement_doc: string | null;
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

type SheetMode = "view" | "ktb" | "partner";
type SortField = "contribution_id" | "contribution_type" | "tourist_name" | "country" | "num_trees" | "amount_paid" | "payment_date" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 15;

const STATUS_SEQUENCE = [
  { value: "contribution_confirmed", label: "Confirmed" },
  { value: "funds_received", label: "Received by KTB" },
  { value: "transferred_for_planting", label: "Transferred for Plantation" },
  { value: "received_for_planting", label: "Received for Plantation" },
];

const getNextStatuses = (currentStatus: string) => {
  const currentIndex = STATUS_SEQUENCE.findIndex(s => s.value === currentStatus);
  if (currentIndex === -1) return STATUS_SEQUENCE.slice(0, 1);
  if (currentIndex >= STATUS_SEQUENCE.length - 1) return [];
  return [STATUS_SEQUENCE[currentIndex + 1]];
};

export const StakeholderFinancial = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRow, setSelectedRow] = useState<ContributionRow | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>("view");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("payment_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [ktbForm, setKtbForm] = useState({
    ktb_receipt_id: "",
    ktb_received_date: "",
    plantation_partner_id: "",
    transfer_date: "",
    transfer_reference: "",
    transfer_mode: "",
  });

  const [partnerForm, setPartnerForm] = useState({
    partner_receipt_confirmation: false,
    partner_received_date: "",
    acknowledgement_doc: "",
  });

  const { data: userRole } = useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_role", { input_user_id: user!.id });
      return data as string;
    },
    enabled: !!user?.id,
  });

  const { data: userOrg } = useQuery({
    queryKey: ["stakeholderOrg", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("organization_id, organizations:organization_id(id, name, category, partner_types:partner_type_id(name))")
        .eq("user_id", user!.id)
        .single();
      return data as any;
    },
    enabled: !!user?.id,
  });

  const orgCategory = (userOrg?.organizations as any)?.category as string | undefined;
  const partnerTypeName = (userOrg?.organizations as any)?.partner_types?.name as string | undefined;

  const { data: contributions, isLoading, refetch } = useQuery({
    queryKey: ["contributionTracking"],
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

  const { data: partners } = useQuery({
    queryKey: ["plantationPartners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("category", "stakeholder")
        .eq("is_active", true);
      return data || [];
    },
  });

  const isKtbUser =
    orgCategory === "institutional" ||
    userRole === "institutional_partner" ||
    partnerTypeName === "Institutional Partner";

  const isTechPartner = partnerTypeName === "Tech Partner" || partnerTypeName === "Technology Partner";

  const isPlantationPartner = orgCategory === "stakeholder" && !isKtbUser && !isTechPartner;

  // Fetch wallet settings for fee calculations
  const { data: walletSettings } = useQuery({
    queryKey: ["walletSettings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallet_settings")
        .select("setting_key, setting_value");
      return data || [];
    },
    enabled: isTechPartner || isKtbUser,
  });

  const techFeePercent = useMemo(() => {
    const setting = walletSettings?.find((s: any) => s.setting_key === "tech_partner_fee");
    return setting ? Number(setting.setting_value) : 30;
  }, [walletSettings]);

  const ktbFeePercent = useMemo(() => {
    const setting = walletSettings?.find((s: any) => s.setting_key === "ktb_marketing_fee");
    return setting ? Number(setting.setting_value) : 40;
  }, [walletSettings]);

  const updateKtbReceiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contribution_tracking" as any)
        .update({
          ktb_receipt_id: ktbForm.ktb_receipt_id,
          ktb_received_date: ktbForm.ktb_received_date || null,
          institution_receipt_id: ktbForm.ktb_receipt_id,
          institution_received_date: ktbForm.ktb_received_date || null,
          transfer_date: ktbForm.transfer_date || null,
          transfer_reference: ktbForm.transfer_reference || null,
          transfer_mode: ktbForm.transfer_mode || null,
          status: "funds_received",
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Funds received — status updated");
      queryClient.invalidateQueries({ queryKey: ["contributionTracking"] });
      setSheetOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateKtbTransferMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contribution_tracking" as any)
        .update({
          plantation_partner_id: ktbForm.plantation_partner_id || null,
          transfer_date: ktbForm.transfer_date || null,
          transfer_reference: ktbForm.transfer_reference,
          transfer_mode: ktbForm.transfer_mode || null,
          status: "transferred_for_planting",
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Funds transferred for planting — status updated");
      queryClient.invalidateQueries({ queryKey: ["contributionTracking"] });
      setSheetOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePartnerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contribution_tracking" as any)
        .update({
          partner_receipt_confirmation: true,
          partner_received_date: partnerForm.partner_received_date || null,
          acknowledgement_doc: partnerForm.acknowledgement_doc || null,
          status: "received_for_planting",
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Partner confirmation saved");
      queryClient.invalidateQueries({ queryKey: ["contributionTracking"] });
      setSheetOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openSheet = (row: ContributionRow, mode: SheetMode) => {
    setSelectedRow(row);
    setSheetMode(mode);
    if (mode === "ktb") {
      setKtbForm({
        ktb_receipt_id: row.institution_receipt_id || row.ktb_receipt_id || "",
        ktb_received_date: row.institution_received_date || row.ktb_received_date || (row.payment_date ? row.payment_date.split('T')[0] : "") || "",
        plantation_partner_id: row.plantation_partner_id || "",
        transfer_date: row.transfer_date || "",
        transfer_reference: row.transfer_reference || "",
        transfer_mode: row.transfer_mode || "",
      });
    } else if (mode === "partner") {
      setPartnerForm({
        partner_receipt_confirmation: row.partner_receipt_confirmation || false,
        partner_received_date: row.partner_received_date || "",
        acknowledgement_doc: row.acknowledgement_doc || "",
      });
    }
    setSheetOpen(true);
  };

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

  const getContributionTypeBadge = (type: string | null) => {
    if (type === "travel_agent") {
      return <span className="text-xs font-medium text-indigo-600">Agent</span>;
    }
    return <span className="text-xs font-medium text-teal-600">Tourist</span>;
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
    let result = contributions?.filter((c) => {
      const matchSearch =
        !search ||
        c.contribution_id?.toLowerCase().includes(search.toLowerCase()) ||
        c.tourist_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.transaction_reference?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchStatus;
    }) || [];

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "contribution_id":
          cmp = (a.contribution_id || "").localeCompare(b.contribution_id || "");
          break;
        case "contribution_type":
          cmp = (a.contribution_type || "tourist").localeCompare(b.contribution_type || "tourist");
          break;
        case "tourist_name":
          cmp = (a.tourist_name || "").localeCompare(b.tourist_name || "");
          break;
        case "country":
          cmp = (a.country || "").localeCompare(b.country || "");
          break;
        case "num_trees":
          cmp = Number(a.num_trees) - Number(b.num_trees);
          break;
        case "amount_paid":
          cmp = Number(a.amount_paid) - Number(b.amount_paid);
          break;
        case "payment_date":
          cmp = (a.payment_date || a.created_at || "").localeCompare(b.payment_date || b.created_at || "");
          break;
        case "status":
          cmp = getStatusOrder(a.status) - getStatusOrder(b.status);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [contributions, search, statusFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totals = useMemo(() => {
    const all = contributions || [];
    const totalAllocated = all.reduce((s, c) => s + Number(c.amount_transferred || 0), 0);
    const totalTrees = all.reduce((s, c) => s + Number(c.num_trees), 0);
    const fundsReceivedRows = all.filter((c) => c.status === "funds_received" || c.status === "transferred_for_planting" || c.status === "received_for_planting");
    const fundsReceivedTotal = fundsReceivedRows.reduce((s, c) => s + Number(c.amount_transferred || 0), 0);
    const transferredRows = all.filter((c) => c.status === "transferred_for_planting" || c.status === "received_for_planting");
    const transferredTotal = transferredRows.reduce((s, c) => s + Number(c.amount_transferred || 0), 0);
    const balance = totalAllocated - fundsReceivedTotal - transferredTotal;
    // Tech partner totals
    const totalTechFee = all.reduce((s, c) => s + (Number(c.amount_paid) * techFeePercent / 100), 0);
    const totalTechReceived = all.reduce((s, c) => s + Number(c.tech_fee_received || (Number(c.amount_paid) * techFeePercent / 100)), 0);
    const totalContribution = all.reduce((s, c) => s + Number(c.amount_paid), 0);
    const techUnderProcessing = totalTechFee - totalTechReceived;
    // KTB / Institutional totals - using wallet settings
    // TO BE RECEIVED = contribution - (contribution × tech fee %)
    const totalToBeReceived = all.reduce((s, c) => s + (Number(c.amount_paid) - (Number(c.amount_paid) * techFeePercent / 100)), 0);
    // AMNT RECEIVED replicates TO BE RECEIVED
    const totalAmntReceived = totalToBeReceived;
    const ktbUnderProcessing = totalToBeReceived - totalAmntReceived;
    // RETAINED total
    const totalRetained = all.reduce((s, c) => s + (((Number(c.amount_paid) - (Number(c.amount_paid) * techFeePercent / 100)) * ktbFeePercent / 100)), 0);
    // TO BE TRANSFERRED = AMNT RECEIVED - RETAINED
    const totalToBeTransferred = totalAmntReceived - totalRetained;
    // TRANSFERRED replicates TO BE TRANSFERRED
    const totalTransferredForPlantation = totalToBeTransferred;
    return {
      totalAllocated,
      totalTrees,
      totalBatches: all.length,
      fundsReceivedCount: fundsReceivedRows.length,
      fundsReceivedTotal,
      transferredCount: transferredRows.length,
      transferredTotal,
      balance,
      totalTechFee,
      totalTechReceived,
      techUnderProcessing,
      totalContribution,
      totalToBeReceived,
      totalAmntReceived,
      ktbUnderProcessing,
      totalRetained,
      totalToBeTransferred,
      totalTransferredForPlantation,
    };
  }, [contributions, techFeePercent, ktbFeePercent]);

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
  };

  const SortableHead = ({ field, label, className = "" }: { field: SortField; label: string; className?: string }) => (
    <TableHead
      className={`cursor-pointer select-none text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-0.5">{label}{getSortIcon(field)}</span>
    </TableHead>
  );

  const StaticHead = ({ label, className = "", tooltip }: { label: string; className?: string; tooltip?: string }) => (
    <TableHead className={`text-xs font-semibold uppercase tracking-wider text-muted-foreground ${className}`}>
      {tooltip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1 cursor-help">{label}<Info className="h-3 w-3 text-muted-foreground/80" /></span>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs max-w-[200px]">{tooltip}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : label}
    </TableHead>
  );

  // Helper: TO BE RECEIVED = contribution minus tech fee
  const getToBeReceived = (c: ContributionRow) => Number(c.amount_paid) - (Number(c.amount_paid) * techFeePercent / 100);
  // Helper: AMNT RECEIVED replicates TO BE RECEIVED
  const getAmntReceived = (c: ContributionRow) => getToBeReceived(c);
  // Helper: RETAINED FOR MKTNG & ADMIN = AMNT RECEIVED × KTB marketing fee %
  const getRetained = (c: ContributionRow) => getAmntReceived(c) * ktbFeePercent / 100;
  // Helper: TO BE TRANSFERRED = AMNT RECEIVED - RETAINED
  const getToBeTransferred = (c: ContributionRow) => getAmntReceived(c) - getRetained(c);
  // Helper: TRANSFERRED replicates TO BE TRANSFERRED (future: from bank API)
  const getTransferred = (c: ContributionRow) => getToBeTransferred(c);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Financial - Contribution Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">End-to-end contribution lifecycle from payment to partner confirmation</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary - Tech Partner */}
      {isTechPartner ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-background to-muted/30">
            <CardContent className="p-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Contributions</p>
              <p className="text-2xl font-bold mt-1">${formatNumber(totals.totalContribution)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{totals.totalBatches} batches · {totals.totalTrees} trees</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Tech Fee Allocated</p>
              <p className="text-2xl font-bold text-primary mt-1">${formatNumber(totals.totalTechFee)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{totals.totalBatches} contributions</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Received</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">${formatNumber(totals.totalTechReceived)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{totals.totalBatches} contributions</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Under Processing</p>
              <p className={`text-2xl font-bold mt-1 ${totals.techUnderProcessing >= 0 ? 'text-amber-600' : 'text-red-600'}`}>${formatNumber(totals.techUnderProcessing)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{totals.totalBatches} contributions</p>
            </CardContent>
          </Card>
        </div>
      ) : isKtbUser ? (
        /* Summary - KTB / Institutional — Two grouped cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mktng & Admin Card */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-lg" />
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Mktng &amp; Admin</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">To Be Received</p>
                  <p className="text-xl font-bold mt-1 tabular-nums">${formatNumber(totals.totalToBeReceived)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Amnt Received</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1 tabular-nums">${formatNumber(totals.totalAmntReceived)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Under Processing</p>
                  <p className={`text-xl font-bold mt-1 tabular-nums ${totals.ktbUnderProcessing >= 0 ? 'text-amber-600' : 'text-red-600'}`}>${formatNumber(totals.ktbUnderProcessing)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Plantation Card */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-violet-500 rounded-l-lg" />
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 mb-4">Plantation</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Allocated</p>
                  <p className="text-xl font-bold mt-1 tabular-nums">${formatNumber(totals.totalToBeTransferred)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Amnt Transferred</p>
                  <p className="text-xl font-bold text-violet-600 mt-1 tabular-nums">${formatNumber(totals.totalTransferredForPlantation)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Balance to Process</p>
                  <p className={`text-xl font-bold mt-1 tabular-nums ${(totals.totalToBeTransferred - totals.totalTransferredForPlantation) >= 0 ? 'text-amber-600' : 'text-red-600'}`}>${formatNumber(totals.totalToBeTransferred - totals.totalTransferredForPlantation)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Summary - Plantation */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-background to-muted/30">
            <CardContent className="p-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Allocated</p>
              <p className="text-2xl font-bold mt-1">${formatNumber(totals.totalAllocated)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{totals.totalBatches} batches · {totals.totalTrees} trees</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Transferred</p>
              <p className="text-2xl font-bold text-violet-600 mt-1">${formatNumber(totals.transferredTotal)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{totals.transferredCount} contributions</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Funds Received</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">${formatNumber(totals.fundsReceivedTotal)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{totals.fundsReceivedCount} contributions</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Balance</p>
              <p className={`text-2xl font-bold mt-1 ${totals.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${formatNumber(totals.balance)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{totals.totalBatches - totals.transferredCount - totals.fundsReceivedCount} contributions</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by ID, name, or reference..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
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
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : !filtered.length ? (
            <div className="text-center py-16">
              <DollarSign className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">No contributions found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b">
                      <SortableHead field="contribution_id" label="Contri Id" />
                      {(isTechPartner || isKtbUser) && <SortableHead field="payment_date" label="Contri Date" />}
                      <SortableHead field="contribution_type" label="Type" />
                      <SortableHead field="tourist_name" label="Contributor" />
                      <SortableHead field="country" label="Country" />
                      <SortableHead field="num_trees" label="Trees" />
                      {isTechPartner && <SortableHead field="amount_paid" label="Contribution" />}
                      {isTechPartner && <StaticHead label="Tech Fee Allocated" />}
                      {isTechPartner && <StaticHead label="Amnt Received" />}
                      {isTechPartner && <StaticHead label="Dt Received" />}
                      {isTechPartner && <StaticHead label="Method" />}
                      {isPlantationPartner && <SortableHead field="payment_date" label="Contri Date" />}
                      {isKtbUser && <SortableHead field="amount_paid" label="Contribution" />}
                      {isKtbUser && <StaticHead label="To Be Received" />}
                      {isKtbUser && <StaticHead label="Amnt Received" />}
                      {isKtbUser && <StaticHead label="Dt Recvd" />}
                      {isKtbUser && <StaticHead label="Method" />}
                      {isKtbUser && <StaticHead label="Amnt Retained" tooltip="Retained for Marketing, Administrative and Oversight Expenses" />}
                      {isKtbUser && <StaticHead label="To Be Transferred" tooltip="Transferred for Tree planting, growing and maintenance" />}
                      {(isKtbUser || isPlantationPartner) && <StaticHead label={isPlantationPartner ? "Amt Allocated" : "Amnt Transferred"} />}
                      {isPlantationPartner && <StaticHead label="Transfer Date" />}
                      {(isKtbUser || isPlantationPartner) && <StaticHead label="Mode" />}
                      {isPlantationPartner && <StaticHead label="Received Date" />}
                      <SortableHead field="status" label="Status" />
                      <StaticHead label="Action" className="text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((c) => (
                      <TableRow key={c.id} className="group hover:bg-muted/20 transition-colors">
                        <TableCell className="font-mono text-xs font-medium">{c.contribution_id}</TableCell>
                        {(isTechPartner || isKtbUser) && <TableCell className="text-sm">{formatDate(c.payment_date || c.created_at)}</TableCell>}
                        <TableCell>{getContributionTypeBadge(c.contribution_type)}</TableCell>
                        <TableCell className="font-medium text-sm">{c.tourist_name || "-"}</TableCell>
                        <TableCell className="text-sm">{c.country || "-"}</TableCell>
                        <TableCell className="font-semibold text-sm tabular-nums">{c.num_trees}</TableCell>
                        {isTechPartner && <TableCell className="font-semibold text-sm tabular-nums">${Number(c.amount_paid).toFixed(2)}</TableCell>}
                        {isTechPartner && <TableCell className="text-primary font-medium text-sm tabular-nums">${(Number(c.amount_paid) * techFeePercent / 100).toFixed(2)}</TableCell>}
                        {isTechPartner && <TableCell className="text-emerald-700 font-medium text-sm tabular-nums">${Number(c.tech_fee_received || (Number(c.amount_paid) * techFeePercent / 100)).toFixed(2)}</TableCell>}
                        {isTechPartner && <TableCell className="text-sm">{formatDate(c.payment_date || c.created_at)}</TableCell>}
                        {isTechPartner && <TableCell className="text-sm">{c.payment_method || "-"}</TableCell>}
                        {isPlantationPartner && <TableCell className="text-sm">{formatDate(c.payment_date || c.created_at)}</TableCell>}
                        {isKtbUser && <TableCell className="font-semibold text-sm tabular-nums">${Number(c.amount_paid).toFixed(2)}</TableCell>}
                        {isKtbUser && <TableCell className="text-primary font-medium text-sm tabular-nums">${getToBeReceived(c).toFixed(2)}</TableCell>}
                        {isKtbUser && <TableCell className="text-emerald-700 font-medium text-sm tabular-nums">${getAmntReceived(c).toFixed(2)}</TableCell>}
                        {isKtbUser && <TableCell className="text-sm">{formatDate(c.institution_received_date || c.ktb_received_date || c.payment_date || c.created_at)}</TableCell>}
                        {isKtbUser && <TableCell className="text-sm">{c.payment_method || "-"}</TableCell>}
                        {isKtbUser && <TableCell className="text-amber-700 font-medium text-sm tabular-nums">${getRetained(c).toFixed(2)}</TableCell>}
                        {isKtbUser && <TableCell className="text-blue-700 font-medium text-sm tabular-nums">${getToBeTransferred(c).toFixed(2)}</TableCell>}
                        {(isKtbUser || isPlantationPartner) && <TableCell className="text-violet-700 font-medium text-sm tabular-nums">${isKtbUser ? getTransferred(c).toFixed(2) : Number(c.amount_transferred || 0).toFixed(2)}</TableCell>}
                        {isPlantationPartner && <TableCell className="text-sm">{formatDate(c.transfer_date)}</TableCell>}
                        {(isKtbUser || isPlantationPartner) && <TableCell className="text-sm">{c.transfer_mode || "-"}</TableCell>}
                        {isPlantationPartner && <TableCell className="text-sm">{formatDate(c.partner_received_date)}</TableCell>}
                        <TableCell>{getStatusBadge(c.status)}</TableCell>
                        <TableCell className="text-right">
                          {isPlantationPartner ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-block">
                                    <Button
                                      size="sm"
                                      className={`h-7 px-3 text-xs font-semibold gap-1.5 rounded-full transition-all ${
                                        c.status === "transferred_for_planting"
                                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                          : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                                      }`}
                                      disabled={c.status !== "transferred_for_planting"}
                                      onClick={() => c.status === "transferred_for_planting" && openSheet(c, "partner")}
                                    >
                                      <DollarSign className="h-3.5 w-3.5" />
                                      Receive
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    {c.status === "transferred_for_planting"
                                      ? "Click to confirm receipt"
                                      : "Funds must be transferred before confirming receipt"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : isTechPartner ? (
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-60 group-hover:opacity-100 transition-opacity" onClick={() => openSheet(c, "view")}>
                                <Eye className="h-4 w-4" />
                              </Button>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {isKtbUser && (
                                  <DropdownMenuItem onClick={() => openSheet(c, "view")}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </DropdownMenuItem>
                                )}
                                {isKtbUser && (
                                  <DropdownMenuItem onClick={() => openSheet(c, "ktb")}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Transaction
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
                <p className="text-xs text-muted-foreground">
                  {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            isActive={currentPage === page}
                            onClick={() => setCurrentPage(page)}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
           {selectedRow && sheetMode === "view" && (
            <>
               <SheetHeader>
                <SheetTitle className="flex items-center gap-3">{selectedRow.contribution_id} {getStatusBadge(selectedRow.status)}</SheetTitle>
               </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="font-semibold text-xs text-muted-foreground mb-3 uppercase tracking-wider">Contribution Details</h3>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <div><span className="text-muted-foreground text-xs">Contri ID</span><p className="font-mono font-medium">{selectedRow.contribution_id}</p></div>
                    <div><span className="text-muted-foreground text-xs">Type</span><p>{getContributionTypeBadge(selectedRow.contribution_type)}</p></div>
                    <div><span className="text-muted-foreground text-xs">Contributor</span><p className="font-medium">{selectedRow.tourist_name || "-"}</p></div>
                    <div><span className="text-muted-foreground text-xs">Country</span><p>{selectedRow.country || "-"}</p></div>
                    <div><span className="text-muted-foreground text-xs">Trip ID</span><p className="font-mono text-xs">{selectedRow.trip_id?.slice(0, 8) || "-"}</p></div>
                    <div><span className="text-muted-foreground text-xs">Trees</span><p className="font-semibold">{selectedRow.num_trees}</p></div>
                    <div><span className="text-muted-foreground text-xs">Amount</span><p className="font-semibold">${Number(selectedRow.amount_paid).toFixed(2)}</p></div>
                    <div><span className="text-muted-foreground text-xs">Currency</span><p>{selectedRow.currency}</p></div>
                    <div><span className="text-muted-foreground text-xs">Payment Date</span><p>{formatDate(selectedRow.payment_date)}</p></div>
                    <div><span className="text-muted-foreground text-xs">Method</span><p>{selectedRow.payment_method || "-"}</p></div>
                    <div className="col-span-2"><span className="text-muted-foreground text-xs">Reference</span><p>{selectedRow.transaction_reference || "-"}</p></div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Fund Allocation</h3>
                    <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                      as on {formatDate(selectedRow.payment_date || selectedRow.created_at)}
                    </Badge>
                  </div>
                  {(() => {
                    const gross = Number(selectedRow.amount_paid || 0);
                    const rowTechPct = selectedRow.tech_fee_percent ?? techFeePercent;
                    const rowKtbPct = selectedRow.ktb_fee_percent ?? ktbFeePercent;
                    const rowPlantPct = 100 - rowKtbPct;
                    const techFee = gross * (rowTechPct / 100);
                    const ktbNet = gross - techFee;
                    const ktbRetained = ktbNet * (rowKtbPct / 100);
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
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-xs text-muted-foreground mb-3 uppercase tracking-wider">Tech Partner Receipt</h3>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <div><span className="text-muted-foreground text-xs">Receipt ID/Ref</span><p>{selectedRow.tech_receipt_id || selectedRow.transaction_reference || "-"}</p></div>
                    <div><span className="text-muted-foreground text-xs">Received Date</span><p>{formatDate(selectedRow.tech_received_date || selectedRow.payment_date || selectedRow.created_at)}</p></div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-xs text-muted-foreground mb-3 uppercase tracking-wider">KTB Receipt & Transfer</h3>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <div><span className="text-muted-foreground text-xs">Receipt ID/Ref</span><p>{selectedRow.institution_receipt_id || selectedRow.ktb_receipt_id || "-"}</p></div>
                    <div><span className="text-muted-foreground text-xs">Received Date</span><p>{formatDate(selectedRow.institution_received_date || selectedRow.ktb_received_date || selectedRow.payment_date || selectedRow.created_at)}</p></div>
                    <div><span className="text-muted-foreground text-xs">Transfer Date</span><p>{formatDate(selectedRow.transfer_date)}</p></div>
                    <div><span className="text-muted-foreground text-xs">Transfer Ref</span><p>{selectedRow.transfer_reference || "-"}</p></div>
                    <div><span className="text-muted-foreground text-xs">Mode</span><p>{selectedRow.transfer_mode || "-"}</p></div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-xs text-muted-foreground mb-3 uppercase tracking-wider">Partner Confirmation</h3>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <div><span className="text-muted-foreground text-xs">Confirmed</span><p>{selectedRow.partner_receipt_confirmation ? "Yes" : "No"}</p></div>
                    <div><span className="text-muted-foreground text-xs">Received Date</span><p>{formatDate(selectedRow.partner_received_date)}</p></div>
                    <div className="col-span-2"><span className="text-muted-foreground text-xs">Acknowledgement Doc</span><p>{selectedRow.acknowledgement_doc ? <a href={selectedRow.acknowledgement_doc} target="_blank" rel="noreferrer" className="text-primary underline text-xs">View Document</a> : "-"}</p></div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* KTB Transaction */}
          {selectedRow && sheetMode === "ktb" && (() => {
            const ktbNextStatuses = getNextStatuses(selectedRow.status);
            const ktbNextStatus = ktbNextStatuses.length > 0 ? ktbNextStatuses[0] : null;
            const ktbAllowed = ktbNextStatus && (ktbNextStatus.value === "funds_received" || ktbNextStatus.value === "transferred_for_planting");
            return (
            <>
               <SheetHeader>
                 <SheetTitle className="flex items-center gap-2">
                   <Pencil className="h-4 w-4" />
                   <span>Transaction: {selectedRow.contribution_id}</span>
                   {getStatusBadge(selectedRow.status)}
                 </SheetTitle>
               </SheetHeader>
               <div className="mt-6 space-y-4">
                 <div className="p-3 rounded-lg bg-muted/40 text-sm space-y-2">
                   <div className="flex justify-between"><span className="text-muted-foreground">Contributor:</span> <span className="font-medium">{selectedRow.tourist_name || "-"}</span></div>
                   <div className="flex justify-between"><span className="text-muted-foreground">Trees:</span> <span className="font-medium">{selectedRow.num_trees}</span></div>
                   <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span> <span className="font-medium">${formatNumber(selectedRow.amount_paid)}</span></div>
                   <div className="flex justify-between"><span className="text-muted-foreground">Date:</span> <span className="font-medium">{formatDate(selectedRow.payment_date)}</span></div>
                   <div className="flex justify-between"><span className="text-muted-foreground">Method:</span> <span className="font-medium">{selectedRow.payment_method || "-"}</span></div>
                 </div>

                {ktbAllowed ? (
                  <div className="border rounded-lg p-4 space-y-4">
                    <p className="text-sm font-semibold">Update Status</p>
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Current Status</p>
                        {getStatusBadge(selectedRow.status)}
                      </div>
                      <span className="text-muted-foreground mt-4">→</span>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Next Status</p>
                        <div className="border rounded-md px-3 py-2 text-sm bg-muted/20">{ktbNextStatus.label}</div>
                      </div>
                    </div>

                    {ktbNextStatus.value === "funds_received" && (
                      <div className="space-y-3 border-t pt-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receipt Details</p>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Receipt ID</label>
                          <Input value={ktbForm.ktb_receipt_id} onChange={(e) => setKtbForm({ ...ktbForm, ktb_receipt_id: e.target.value })} placeholder="e.g. KTB-REC-001" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Received Date</label>
                          <Input type="date" value={ktbForm.ktb_received_date} onChange={(e) => setKtbForm({ ...ktbForm, ktb_received_date: e.target.value })} />
                        </div>
                      </div>
                    )}

                    {ktbNextStatus.value === "transferred_for_planting" && (
                      <div className="space-y-3 border-t pt-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transfer Details</p>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Transfer Reference</label>
                          <Input value={ktbForm.transfer_reference} onChange={(e) => setKtbForm({ ...ktbForm, transfer_reference: e.target.value })} placeholder="e.g. TRF-001" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Transfer Date</label>
                          <Input type="date" value={ktbForm.transfer_date} onChange={(e) => setKtbForm({ ...ktbForm, transfer_date: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Transfer Mode</label>
                          <Select value={ktbForm.transfer_mode} onValueChange={(v) => setKtbForm({ ...ktbForm, transfer_mode: v })}>
                            <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                              <SelectItem value="RTGS">RTGS</SelectItem>
                              <SelectItem value="EFT">EFT</SelectItem>
                              <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                              <SelectItem value="Cheque">Cheque</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
                      {ktbNextStatus.value === "funds_received" && (
                        <Button className="flex-1" onClick={() => updateKtbReceiveMutation.mutate(selectedRow.id)} disabled={updateKtbReceiveMutation.isPending}>
                          {updateKtbReceiveMutation.isPending ? "Updating..." : "Update Status"}
                        </Button>
                      )}
                      {ktbNextStatus.value === "transferred_for_planting" && (
                        <Button className="flex-1" onClick={() => updateKtbTransferMutation.mutate(selectedRow.id)} disabled={updateKtbTransferMutation.isPending}>
                          {updateKtbTransferMutation.isPending ? "Updating..." : "Update Status"}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 text-center text-sm text-muted-foreground">
                    This contribution has reached its final status for KTB actions.
                  </div>
                )}
              </div>
            </>
            );
          })()}

          {/* Partner: Received for Planting */}
          {selectedRow && sheetMode === "partner" && (() => {
            const partnerCanAdvance = selectedRow.status === "transferred_for_planting";
            return (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                   <Pencil className="h-4 w-4" />
                   <span>Receive Funds: {selectedRow.contribution_id}</span>
                   {getStatusBadge(selectedRow.status)}
                 </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="p-3 rounded-lg bg-muted/40 text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">Trees:</span> <span className="font-medium">{selectedRow.num_trees}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span> <span className="font-medium">${Number(selectedRow.amount_transferred || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Transfer Date:</span> <span className="font-medium">{formatDate(selectedRow.transfer_date)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Mode:</span> <span className="font-medium">{selectedRow.transfer_mode || "-"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Transfer Ref:</span> <span className="font-medium">{selectedRow.transfer_reference || "-"}</span></div>
                </div>

                {/* Status update section - admin style */}
                {partnerCanAdvance ? (
                  <div className="border rounded-lg p-4 space-y-4">
                    <p className="text-sm font-semibold">Update Status</p>
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Current Status</p>
                        {getStatusBadge(selectedRow.status)}
                      </div>
                      <span className="text-muted-foreground mt-4">→</span>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Next Status</p>
                        <div className="border rounded-md px-3 py-2 text-sm bg-muted/20">Received for Plantation</div>
                      </div>
                    </div>

                    <div className="space-y-3 border-t pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plantation Receipt</p>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Date Received</label>
                        <Input type="date" value={partnerForm.partner_received_date} onChange={(e) => setPartnerForm({ ...partnerForm, partner_received_date: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Acknowledgement Document URL</label>
                        <Input value={partnerForm.acknowledgement_doc} onChange={(e) => setPartnerForm({ ...partnerForm, acknowledgement_doc: e.target.value })} placeholder="https://..." />
                      </div>
                      <p className="text-xs text-muted-foreground">Receipt confirmation will be set to <strong>Yes</strong> automatically.</p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
                      <Button className="flex-1" onClick={() => updatePartnerMutation.mutate(selectedRow.id)} disabled={updatePartnerMutation.isPending}>
                        {updatePartnerMutation.isPending ? "Updating..." : "Update Status"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 text-center text-sm text-muted-foreground">
                    {selectedRow.status === "received_for_planting" 
                      ? "This contribution has been confirmed as received."
                      : "Funds must be transferred before confirming receipt."}
                  </div>
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
