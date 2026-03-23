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
import { DollarSign, RefreshCw, Search, Eye, Building2, Landmark, ArrowUpDown, ArrowUp, ArrowDown, MoreVertical } from "lucide-react";
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
}

type SheetMode = "view" | "ktb" | "partner";
type SortField = "contribution_id" | "contribution_type" | "tourist_name" | "country" | "num_trees" | "amount_paid" | "payment_date" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 15;

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

  const isPlantationPartner = orgCategory === "stakeholder" && !isKtbUser;

  const updateKtbReceiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contribution_tracking" as any)
        .update({
          ktb_receipt_id: ktbForm.ktb_receipt_id,
          ktb_received_date: ktbForm.ktb_received_date || null,
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
          partner_receipt_confirmation: partnerForm.partner_receipt_confirmation,
          partner_received_date: partnerForm.partner_received_date || null,
          acknowledgement_doc: partnerForm.acknowledgement_doc || null,
          status: partnerForm.partner_receipt_confirmation ? "received_for_planting" : "transferred_for_planting",
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
        ktb_receipt_id: row.ktb_receipt_id || "",
        ktb_received_date: row.ktb_received_date || "",
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
    switch (status) {
      case "contribution_confirmed":
        return <Badge className="bg-blue-500/10 text-blue-700 border-blue-200 hover:bg-blue-500/10 whitespace-nowrap">Confirmed</Badge>;
      case "funds_received":
        return <Badge className="bg-amber-500/10 text-amber-700 border-amber-200 hover:bg-amber-500/10 whitespace-nowrap">Funds Received</Badge>;
      case "transferred_for_planting":
        return <Badge className="bg-violet-500/10 text-violet-700 border-violet-200 hover:bg-violet-500/10 whitespace-nowrap">Transferred</Badge>;
      case "received_for_planting":
        return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-500/10 whitespace-nowrap">Received</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  const totals = {
    total: contributions?.reduce((s, c) => s + Number(c.amount_paid), 0) || 0,
    totalTrees: contributions?.reduce((s, c) => s + Number(c.num_trees), 0) || 0,
    confirmed: contributions?.filter((c) => c.status === "contribution_confirmed").length || 0,
    fundsReceived: contributions?.filter((c) => c.status === "funds_received").length || 0,
    transferred: contributions?.filter((c) => c.status === "transferred_for_planting").length || 0,
    received: contributions?.filter((c) => c.status === "received_for_planting").length || 0,
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
  };

  // Column header helper for cleaner rendering
  const SortableHead = ({ field, label, className = "" }: { field: SortField; label: string; className?: string }) => (
    <TableHead
      className={`cursor-pointer select-none text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-0.5">{label}{getSortIcon(field)}</span>
    </TableHead>
  );

  const StaticHead = ({ label, className = "" }: { label: string; className?: string }) => (
    <TableHead className={`text-xs font-semibold uppercase tracking-wider text-muted-foreground ${className}`}>
      {label}
    </TableHead>
  );

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

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Contributions</p>
            <p className="text-2xl font-bold mt-1">${formatNumber(totals.total)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{contributions?.length || 0} batches · {totals.totalTrees} trees</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Confirmed</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{totals.confirmed}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Funds Received</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{totals.fundsReceived}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Transferred</p>
            <p className="text-2xl font-bold text-violet-600 mt-1">{totals.transferred}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Received for Planting</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{totals.received}</p>
          </CardContent>
        </Card>
      </div>

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
            <SelectItem value="funds_received">Funds Received</SelectItem>
            <SelectItem value="transferred_for_planting">Transferred</SelectItem>
            <SelectItem value="received_for_planting">Received</SelectItem>
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
                      {/* Institutional: Contri Id, Type, Contributor, Country, Trees, Contribution, Received, Dt Recvd, Method, Retained, Transferred, Mode, Status, Action */}
                      <SortableHead field="contribution_id" label="Contri Id" />
                      <SortableHead field="contribution_type" label="Type" />
                      <SortableHead field="tourist_name" label="Contributor" />
                      <SortableHead field="country" label="Country" />
                      <SortableHead field="num_trees" label="Trees" />
                      {isPlantationPartner && <SortableHead field="payment_date" label="Contri Date" />}
                      {!isPlantationPartner && <SortableHead field="amount_paid" label="Contribution" />}
                      {!isPlantationPartner && <StaticHead label="Received" />}
                      {!isPlantationPartner && <StaticHead label="Dt Recvd" />}
                      {!isPlantationPartner && <StaticHead label="Method" />}
                      {!isPlantationPartner && <StaticHead label="Retained" />}
                      <StaticHead label={isPlantationPartner ? "Amt Allocated" : "Transferred"} />
                      {isPlantationPartner && <StaticHead label="Transfer Date" />}
                      <StaticHead label="Mode" />
                      {isPlantationPartner && <StaticHead label="Received Date" />}
                      <SortableHead field="status" label="Status" />
                      <StaticHead label="Action" className="text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((c) => (
                      <TableRow key={c.id} className="group hover:bg-muted/20 transition-colors">
                        <TableCell className="font-mono text-xs font-medium">{c.contribution_id}</TableCell>
                        <TableCell>{getContributionTypeBadge(c.contribution_type)}</TableCell>
                        <TableCell className="font-medium text-sm">{c.tourist_name || "-"}</TableCell>
                        <TableCell className="text-sm">{c.country || "-"}</TableCell>
                        <TableCell className="font-semibold text-sm tabular-nums">{c.num_trees}</TableCell>
                        {isPlantationPartner && <TableCell className="text-sm">{formatDate(c.payment_date || c.created_at)}</TableCell>}
                        {!isPlantationPartner && <TableCell className="font-semibold text-sm tabular-nums">${Number(c.amount_paid).toFixed(2)}</TableCell>}
                        {!isPlantationPartner && <TableCell className="text-emerald-700 font-medium text-sm tabular-nums">${Number(c.amount_received || 0).toFixed(2)}</TableCell>}
                        {!isPlantationPartner && <TableCell className="text-sm">{formatDate(c.ktb_received_date)}</TableCell>}
                        {!isPlantationPartner && <TableCell className="text-sm">{c.payment_method || "-"}</TableCell>}
                        {!isPlantationPartner && <TableCell className="text-amber-700 font-medium text-sm tabular-nums">${Number(c.amount_retained || 0).toFixed(2)}</TableCell>}
                        <TableCell className="text-violet-700 font-medium text-sm tabular-nums">${Number(c.amount_transferred || 0).toFixed(2)}</TableCell>
                        {isPlantationPartner && <TableCell className="text-sm">{formatDate(c.transfer_date)}</TableCell>}
                        <TableCell className="text-sm">{c.transfer_mode || "-"}</TableCell>
                        {isPlantationPartner && <TableCell className="text-sm">{formatDate(c.partner_received_date)}</TableCell>}
                        <TableCell>{getStatusBadge(c.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-60 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!isPlantationPartner && (
                                <DropdownMenuItem onClick={() => openSheet(c, "view")}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Transaction
                                </DropdownMenuItem>
                              )}
                              {isKtbUser && (
                                <DropdownMenuItem onClick={() => openSheet(c, "ktb")}>
                                  <Landmark className="h-4 w-4 mr-2" />
                                  KTB Transaction
                                </DropdownMenuItem>
                              )}
                              {isPlantationPartner && (
                                <DropdownMenuItem onClick={() => openSheet(c, "partner")}>
                                  <Building2 className="h-4 w-4 mr-2" />
                                  Plantation Transaction
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                <SheetTitle className="flex items-center justify-between">
                  <span>{selectedRow.contribution_id}</span>
                  {getStatusBadge(selectedRow.status)}
                </SheetTitle>
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
                  <h3 className="font-semibold text-xs text-muted-foreground mb-3 uppercase tracking-wider">Fund Allocation</h3>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="bg-emerald-50 rounded-lg p-3"><span className="text-muted-foreground text-xs">Received</span><p className="font-semibold text-emerald-700">${Number(selectedRow.amount_received || 0).toFixed(2)}</p></div>
                    <div className="bg-amber-50 rounded-lg p-3"><span className="text-muted-foreground text-xs">Retained</span><p className="font-semibold text-amber-700">${Number(selectedRow.amount_retained || 0).toFixed(2)}</p></div>
                    <div className="bg-violet-50 rounded-lg p-3"><span className="text-muted-foreground text-xs">Transferred</span><p className="font-semibold text-violet-700">${Number(selectedRow.amount_transferred || 0).toFixed(2)}</p></div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-xs text-muted-foreground mb-3 uppercase tracking-wider">KTB Receipt & Transfer</h3>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <div><span className="text-muted-foreground text-xs">Receipt ID</span><p>{selectedRow.ktb_receipt_id || "-"}</p></div>
                    <div><span className="text-muted-foreground text-xs">Received Date</span><p>{formatDate(selectedRow.ktb_received_date)}</p></div>
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
          {selectedRow && sheetMode === "ktb" && (
            <>
              <SheetHeader>
                <SheetTitle>KTB Transaction — {selectedRow.contribution_id}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="p-3 rounded-lg bg-muted/40 text-sm space-y-1">
                  <p><span className="text-muted-foreground">Contributor:</span> {selectedRow.tourist_name}</p>
                  <p><span className="text-muted-foreground">Trees:</span> {selectedRow.num_trees}</p>
                  <p><span className="text-muted-foreground">Amount:</span> ${Number(selectedRow.amount_paid).toFixed(2)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Receipt ID</Label>
                  <Input value={ktbForm.ktb_receipt_id} onChange={(e) => setKtbForm({ ...ktbForm, ktb_receipt_id: e.target.value })} placeholder="e.g., KTB-REC-001" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Received Date</Label>
                  <Input type="date" value={ktbForm.ktb_received_date} onChange={(e) => setKtbForm({ ...ktbForm, ktb_received_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Transfer Date</Label>
                  <Input type="date" value={ktbForm.transfer_date} onChange={(e) => setKtbForm({ ...ktbForm, transfer_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Transfer Ref</Label>
                  <Input value={ktbForm.transfer_reference} onChange={(e) => setKtbForm({ ...ktbForm, transfer_reference: e.target.value })} placeholder="e.g., TRF-2026-001" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Mode of Transfer</Label>
                  <Input value={ktbForm.transfer_mode} onChange={(e) => setKtbForm({ ...ktbForm, transfer_mode: e.target.value })} placeholder="e.g., Bank Transfer, RTGS, EFT" />
                </div>
                <div className="flex gap-2 mt-4">
                  {selectedRow.status === "contribution_confirmed" && (
                    <Button className="flex-1" onClick={() => updateKtbReceiveMutation.mutate(selectedRow.id)} disabled={updateKtbReceiveMutation.isPending}>
                      {updateKtbReceiveMutation.isPending ? "Saving..." : "Mark Funds Received"}
                    </Button>
                  )}
                  {selectedRow.status === "funds_received" && (
                    <Button className="flex-1" onClick={() => updateKtbTransferMutation.mutate(selectedRow.id)} disabled={updateKtbTransferMutation.isPending}>
                      {updateKtbTransferMutation.isPending ? "Saving..." : "Transfer for Planting"}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Partner: Received for Planting */}
          {selectedRow && sheetMode === "partner" && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  <span>Plantation Transaction: {selectedRow.contribution_id}</span>
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
                <div className="space-y-2">
                  <Label className="text-xs">Receipt Confirmation</Label>
                  <Select
                    value={partnerForm.partner_receipt_confirmation ? "yes" : "no"}
                    onValueChange={(v) => setPartnerForm({ ...partnerForm, partner_receipt_confirmation: v === "yes" })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes - Funds Received</SelectItem>
                      <SelectItem value="no">No - Not Yet Received</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Date Received</Label>
                  <Input type="date" value={partnerForm.partner_received_date} onChange={(e) => setPartnerForm({ ...partnerForm, partner_received_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Acknowledgement Document URL</Label>
                  <Input value={partnerForm.acknowledgement_doc} onChange={(e) => setPartnerForm({ ...partnerForm, acknowledgement_doc: e.target.value })} placeholder="https://..." />
                </div>
                <Button className="w-full mt-4" onClick={() => updatePartnerMutation.mutate(selectedRow.id)} disabled={updatePartnerMutation.isPending}>
                  {updatePartnerMutation.isPending ? "Saving..." : "Confirm Received for Planting"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
