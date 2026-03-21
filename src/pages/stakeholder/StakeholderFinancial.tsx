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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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
type SortField = "contribution_id" | "tourist_name" | "country" | "num_trees" | "amount_paid" | "payment_date" | "status";
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

  // KTB form state
  const [ktbForm, setKtbForm] = useState({
    ktb_receipt_id: "",
    ktb_received_date: "",
    plantation_partner_id: "",
    transfer_date: "",
    transfer_reference: "",
    transfer_mode: "",
  });

  // Partner form state
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

  const orgId = userOrg?.organization_id as string | undefined;
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

  // KTB-style institutional users can be modeled either as institutional orgs
  // or as stakeholder orgs with the "Institutional Partner" partner type.
  const isKtbUser =
    orgCategory === "institutional" ||
    userRole === "institutional_partner" ||
    partnerTypeName === "Institutional Partner";

  const isPlantationPartner = orgCategory === "stakeholder" && !isKtbUser;

  // KTB: Mark as Funds Received (saves receipt fields)
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

  // KTB: Mark as Transferred for Planting
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

  // Partner: Received for Planting
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
        return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 whitespace-nowrap">Contribution Confirmed</Badge>;
      case "funds_received":
        return <Badge variant="secondary" className="text-orange-700 bg-orange-100 whitespace-nowrap">Funds Received</Badge>;
      case "transferred_for_planting":
        return <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50 whitespace-nowrap">Transferred for Planting</Badge>;
      case "received_for_planting":
        return <Badge className="bg-green-600 text-white whitespace-nowrap">Received for Planting</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  // Sorting
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
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Filter + Sort + Paginate
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

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Financial - Contribution Tracking</h1>
          <p className="text-muted-foreground mt-1">End-to-end contribution lifecycle from tourist payment to partner confirmation</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Contributions</p>
          <p className="text-2xl font-bold">${formatNumber(totals.total)}</p>
          <p className="text-xs text-muted-foreground mt-1">{contributions?.length || 0} batches · {totals.totalTrees} trees</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Confirmed</p>
          <p className="text-2xl font-bold text-blue-600">{totals.confirmed}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Funds Received</p>
          <p className="text-2xl font-bold text-orange-600">{totals.fundsReceived}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Transferred</p>
          <p className="text-2xl font-bold text-purple-600">{totals.transferred}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Received for Planting</p>
          <p className="text-2xl font-bold text-green-600">{totals.received}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by ID, tourist name, or reference..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="contribution_confirmed">Contribution Confirmed</SelectItem>
            <SelectItem value="funds_received">Funds Received</SelectItem>
            <SelectItem value="transferred_for_planting">Transferred for Planting</SelectItem>
            <SelectItem value="received_for_planting">Received for Planting</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : !filtered.length ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No contributions found.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("contribution_id")}>
                      <span className="flex items-center">ID {getSortIcon("contribution_id")}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("tourist_name")}>
                      <span className="flex items-center">Tourist {getSortIcon("tourist_name")}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("country")}>
                      <span className="flex items-center">Country {getSortIcon("country")}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("num_trees")}>
                      <span className="flex items-center">Trees {getSortIcon("num_trees")}</span>
                    </TableHead>
                    {!isPlantationPartner && (
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("amount_paid")}>
                        <span className="flex items-center">Contribution {getSortIcon("amount_paid")}</span>
                      </TableHead>
                    )}
                    {!isPlantationPartner && (
                      <TableHead>
                        <span className="flex items-center whitespace-nowrap">Amt Received</span>
                      </TableHead>
                    )}
                    {!isPlantationPartner && (
                      <TableHead>
                        <span className="flex items-center whitespace-nowrap">Amt Retained</span>
                      </TableHead>
                    )}
                    <TableHead>
                      <span className="flex items-center whitespace-nowrap">Amt Transferred</span>
                    </TableHead>
                    {isPlantationPartner && (
                      <TableHead>
                        <span className="flex items-center whitespace-nowrap">Transfer Date</span>
                      </TableHead>
                    )}
                    {!isPlantationPartner && (
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("payment_date")}>
                        <span className="flex items-center">Payment Date {getSortIcon("payment_date")}</span>
                      </TableHead>
                    )}
                    {!isPlantationPartner && <TableHead>Method</TableHead>}
                    <TableHead>Mode</TableHead>
                    {isPlantationPartner && (
                      <TableHead>
                        <span className="flex items-center">Received Date</span>
                      </TableHead>
                    )}
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>
                      <span className="flex items-center">Status {getSortIcon("status")}</span>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.contribution_id}</TableCell>
                      <TableCell>{c.tourist_name || "-"}</TableCell>
                      <TableCell>{c.country || "-"}</TableCell>
                      <TableCell className="font-medium">{c.num_trees}</TableCell>
                      {!isPlantationPartner && <TableCell className="font-medium">${Number(c.amount_paid).toFixed(2)}</TableCell>}
                      {!isPlantationPartner && <TableCell className="text-emerald-700 font-medium">${Number(c.amount_received || 0).toFixed(2)}</TableCell>}
                      {!isPlantationPartner && <TableCell className="text-orange-700 font-medium">${Number(c.amount_retained || 0).toFixed(2)}</TableCell>}
                      <TableCell className="text-blue-700 font-medium">${Number(c.amount_transferred || 0).toFixed(2)}</TableCell>
                      {isPlantationPartner ? (
                        <TableCell>{formatDate(c.partner_received_date)}</TableCell>
                      ) : (
                        <TableCell>{formatDate(c.payment_date)}</TableCell>
                      )}
                      {!isPlantationPartner && <TableCell>{c.payment_method || "-"}</TableCell>}
                      <TableCell>{c.transfer_mode || "-"}</TableCell>
                      <TableCell>{getStatusBadge(c.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openSheet(c, "view")}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Transaction
                            </DropdownMenuItem>
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

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
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
                <SheetTitle>Contribution {selectedRow.contribution_id}</SheetTitle>
                <SheetDescription>Full contribution lifecycle details</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Contribution Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">ID:</span><p className="font-mono">{selectedRow.contribution_id}</p></div>
                    <div><span className="text-muted-foreground">Tourist:</span><p>{selectedRow.tourist_name || "-"}</p></div>
                    <div><span className="text-muted-foreground">Country:</span><p>{selectedRow.country || "-"}</p></div>
                    <div><span className="text-muted-foreground">Trip ID:</span><p className="font-mono text-xs">{selectedRow.trip_id?.slice(0, 8) || "-"}</p></div>
                    <div><span className="text-muted-foreground">Trees:</span><p className="font-semibold">{selectedRow.num_trees}</p></div>
                    <div><span className="text-muted-foreground">Amount:</span><p className="font-semibold">${Number(selectedRow.amount_paid).toFixed(2)}</p></div>
                    <div><span className="text-muted-foreground">Currency:</span><p>{selectedRow.currency}</p></div>
                    <div><span className="text-muted-foreground">Payment Date:</span><p>{formatDate(selectedRow.payment_date)}</p></div>
                    <div><span className="text-muted-foreground">Method:</span><p>{selectedRow.payment_method || "-"}</p></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Reference:</span><p>{selectedRow.transaction_reference || "-"}</p></div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">KTB Receipt & Transfer</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Receipt ID:</span><p>{selectedRow.ktb_receipt_id || "-"}</p></div>
                    <div><span className="text-muted-foreground">Received Date:</span><p>{formatDate(selectedRow.ktb_received_date)}</p></div>
                    <div><span className="text-muted-foreground">Transfer Date:</span><p>{formatDate(selectedRow.transfer_date)}</p></div>
                    <div><span className="text-muted-foreground">Transfer Ref:</span><p>{selectedRow.transfer_reference || "-"}</p></div>
                    <div><span className="text-muted-foreground">Mode of Transfer:</span><p>{selectedRow.transfer_mode || "-"}</p></div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Partner Confirmation</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Confirmed:</span><p>{selectedRow.partner_receipt_confirmation ? "Yes" : "No"}</p></div>
                    <div><span className="text-muted-foreground">Received Date:</span><p>{formatDate(selectedRow.partner_received_date)}</p></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Acknowledgement Doc:</span><p>{selectedRow.acknowledgement_doc ? <a href={selectedRow.acknowledgement_doc} target="_blank" rel="noreferrer" className="text-primary underline">View Document</a> : "-"}</p></div>
                  </div>
                </div>
                <div>{getStatusBadge(selectedRow.status)}</div>
              </div>
            </>
          )}

          {/* KTB Transaction */}
          {selectedRow && sheetMode === "ktb" && (
            <>
              <SheetHeader>
                <SheetTitle>KTB Transaction</SheetTitle>
                <SheetDescription>View and update KTB transaction details for {selectedRow.contribution_id}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p><strong>Tourist:</strong> {selectedRow.tourist_name}</p>
                  <p><strong>Trees:</strong> {selectedRow.num_trees}</p>
                  <p><strong>Amount:</strong> ${Number(selectedRow.amount_paid).toFixed(2)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Receipt ID</Label>
                  <Input value={ktbForm.ktb_receipt_id} onChange={(e) => setKtbForm({ ...ktbForm, ktb_receipt_id: e.target.value })} placeholder="e.g., KTB-REC-001" />
                </div>
                <div className="space-y-2">
                  <Label>Received Date</Label>
                  <Input type="date" value={ktbForm.ktb_received_date} onChange={(e) => setKtbForm({ ...ktbForm, ktb_received_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Transfer Date</Label>
                  <Input type="date" value={ktbForm.transfer_date} onChange={(e) => setKtbForm({ ...ktbForm, transfer_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Transfer Ref</Label>
                  <Input value={ktbForm.transfer_reference} onChange={(e) => setKtbForm({ ...ktbForm, transfer_reference: e.target.value })} placeholder="e.g., TRF-2026-001" />
                </div>
                <div className="space-y-2">
                  <Label>Mode of Transfer</Label>
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
                <SheetTitle>Confirm Funds Received for Planting</SheetTitle>
                <SheetDescription>Confirm receipt of funds from KTB for {selectedRow.contribution_id}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p><strong>Tourist:</strong> {selectedRow.tourist_name}</p>
                  <p><strong>Trees:</strong> {selectedRow.num_trees}</p>
                  <p><strong>Amount:</strong> ${Number(selectedRow.amount_paid).toFixed(2)}</p>
                  <p><strong>KTB Transfer Ref:</strong> {selectedRow.transfer_reference || "-"}</p>
                  <p><strong>Transfer Date:</strong> {formatDate(selectedRow.transfer_date)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Receipt Confirmation</Label>
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
                  <Label>Date Received</Label>
                  <Input type="date" value={partnerForm.partner_received_date} onChange={(e) => setPartnerForm({ ...partnerForm, partner_received_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Acknowledgement Document URL</Label>
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
