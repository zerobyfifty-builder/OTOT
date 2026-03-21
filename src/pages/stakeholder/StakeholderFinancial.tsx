import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, RefreshCw, Search, Eye, Building2, Landmark } from "lucide-react";
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
  amount_paid: number;
  currency: string;
  payment_date: string | null;
  payment_method: string | null;
  transaction_reference: string | null;
  ktb_receipt_id: string | null;
  ktb_received_date: string | null;
  plantation_partner_id: string | null;
  transfer_date: string | null;
  transfer_reference: string | null;
  partner_receipt_confirmation: boolean;
  partner_received_date: string | null;
  acknowledgement_doc: string | null;
  status: string;
  created_at: string;
}

type SheetMode = "view" | "ktb" | "partner";

export const StakeholderFinancial = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRow, setSelectedRow] = useState<ContributionRow | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>("view");
  const [sheetOpen, setSheetOpen] = useState(false);

  // KTB form state
  const [ktbForm, setKtbForm] = useState({
    ktb_receipt_id: "",
    ktb_received_date: "",
    plantation_partner_id: "",
    transfer_date: "",
    transfer_reference: "",
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

  const { data: orgId } = useQuery({
    queryKey: ["stakeholderOrgId", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("organization_id").eq("user_id", user!.id).single();
      return data?.organization_id;
    },
    enabled: !!user?.id,
  });

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

  // Fetch plantation partners for KTB dropdown
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

  const isKtbUser = userRole === "institutional_partner";
  const isPlantationPartner = userRole === "stakeholder";

  const updateKtbMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contribution_tracking" as any)
        .update({
          ktb_receipt_id: ktbForm.ktb_receipt_id,
          ktb_received_date: ktbForm.ktb_received_date || null,
          plantation_partner_id: ktbForm.plantation_partner_id || null,
          transfer_date: ktbForm.transfer_date || null,
          transfer_reference: ktbForm.transfer_reference,
          status: "ktb_received",
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("KTB receipt details saved");
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
          status: partnerForm.partner_receipt_confirmation ? "partner_confirmed" : "ktb_received",
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
      case "contribution_received":
        return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">Contribution Received</Badge>;
      case "ktb_received":
        return <Badge variant="secondary" className="text-orange-700 bg-orange-100">KTB Received</Badge>;
      case "partner_confirmed":
        return <Badge className="bg-green-600 text-white">Partner Confirmed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filtered = contributions?.filter((c) => {
    const matchSearch =
      !search ||
      c.contribution_id?.toLowerCase().includes(search.toLowerCase()) ||
      c.tourist_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.transaction_reference?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  }) || [];

  const totals = {
    total: contributions?.reduce((s, c) => s + Number(c.amount_paid), 0) || 0,
    ktbReceived: contributions?.filter((c) => c.status === "ktb_received" || c.status === "partner_confirmed").length || 0,
    partnerConfirmed: contributions?.filter((c) => c.status === "partner_confirmed").length || 0,
    pending: contributions?.filter((c) => c.status === "contribution_received").length || 0,
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Contributions</p>
          <p className="text-2xl font-bold">${formatNumber(totals.total)}</p>
          <p className="text-xs text-muted-foreground mt-1">{contributions?.length || 0} entries</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Pending KTB Receipt</p>
          <p className="text-2xl font-bold text-blue-600">{totals.pending}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">KTB Received</p>
          <p className="text-2xl font-bold text-orange-600">{totals.ktbReceived}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Partner Confirmed</p>
          <p className="text-2xl font-bold text-green-600">{totals.partnerConfirmed}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by ID, tourist name, or reference..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="contribution_received">Contribution Received</SelectItem>
            <SelectItem value="ktb_received">KTB Received</SelectItem>
            <SelectItem value="partner_confirmed">Partner Confirmed</SelectItem>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contribution ID</TableHead>
                  <TableHead>Tourist</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.contribution_id}</TableCell>
                    <TableCell>{c.tourist_name || "-"}</TableCell>
                    <TableCell>{c.country || "-"}</TableCell>
                    <TableCell className="font-medium">${Number(c.amount_paid).toFixed(2)}</TableCell>
                    <TableCell>{formatDate(c.payment_date)}</TableCell>
                    <TableCell>{c.payment_method || "-"}</TableCell>
                    <TableCell>{getStatusBadge(c.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openSheet(c, "view")} title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isKtbUser && (
                          <Button variant="ghost" size="icon" onClick={() => openSheet(c, "ktb")} title="KTB Receipt Entry" className="text-blue-600">
                            <Landmark className="h-4 w-4" />
                          </Button>
                        )}
                        {isPlantationPartner && c.plantation_partner_id === orgId && c.status !== "contribution_received" && (
                          <Button variant="ghost" size="icon" onClick={() => openSheet(c, "partner")} title="Partner Confirmation" className="text-green-600">
                            <Building2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                {/* Core */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Contribution Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">ID:</span><p className="font-mono">{selectedRow.contribution_id}</p></div>
                    <div><span className="text-muted-foreground">Tourist:</span><p>{selectedRow.tourist_name || "-"}</p></div>
                    <div><span className="text-muted-foreground">Country:</span><p>{selectedRow.country || "-"}</p></div>
                    <div><span className="text-muted-foreground">Trip ID:</span><p className="font-mono text-xs">{selectedRow.trip_id?.slice(0, 8) || "-"}</p></div>
                    <div><span className="text-muted-foreground">Amount:</span><p className="font-semibold">${Number(selectedRow.amount_paid).toFixed(2)}</p></div>
                    <div><span className="text-muted-foreground">Currency:</span><p>{selectedRow.currency}</p></div>
                    <div><span className="text-muted-foreground">Payment Date:</span><p>{formatDate(selectedRow.payment_date)}</p></div>
                    <div><span className="text-muted-foreground">Method:</span><p>{selectedRow.payment_method || "-"}</p></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Reference:</span><p>{selectedRow.transaction_reference || "-"}</p></div>
                  </div>
                </div>
                {/* KTB */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">KTB Receipt</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Receipt ID:</span><p>{selectedRow.ktb_receipt_id || "-"}</p></div>
                    <div><span className="text-muted-foreground">Received Date:</span><p>{formatDate(selectedRow.ktb_received_date)}</p></div>
                    <div><span className="text-muted-foreground">Transfer Date:</span><p>{formatDate(selectedRow.transfer_date)}</p></div>
                    <div><span className="text-muted-foreground">Transfer Ref:</span><p>{selectedRow.transfer_reference || "-"}</p></div>
                  </div>
                </div>
                {/* Partner */}
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

          {selectedRow && sheetMode === "ktb" && (
            <>
              <SheetHeader>
                <SheetTitle>KTB Receipt Entry</SheetTitle>
                <SheetDescription>Record KTB payment receipt and transfer details for {selectedRow.contribution_id}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p><strong>Tourist:</strong> {selectedRow.tourist_name}</p>
                  <p><strong>Amount:</strong> ${Number(selectedRow.amount_paid).toFixed(2)}</p>
                </div>
                <div className="space-y-2">
                  <Label>KTB Receipt ID</Label>
                  <Input value={ktbForm.ktb_receipt_id} onChange={(e) => setKtbForm({ ...ktbForm, ktb_receipt_id: e.target.value })} placeholder="e.g., KTB-REC-001" />
                </div>
                <div className="space-y-2">
                  <Label>KTB Received Date</Label>
                  <Input type="date" value={ktbForm.ktb_received_date} onChange={(e) => setKtbForm({ ...ktbForm, ktb_received_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Plantation Partner</Label>
                  <Select value={ktbForm.plantation_partner_id} onValueChange={(v) => setKtbForm({ ...ktbForm, plantation_partner_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                    <SelectContent>
                      {partners?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Transfer Date</Label>
                  <Input type="date" value={ktbForm.transfer_date} onChange={(e) => setKtbForm({ ...ktbForm, transfer_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Transfer Reference</Label>
                  <Input value={ktbForm.transfer_reference} onChange={(e) => setKtbForm({ ...ktbForm, transfer_reference: e.target.value })} placeholder="e.g., TRF-2026-001" />
                </div>
                <Button className="w-full mt-4" onClick={() => updateKtbMutation.mutate(selectedRow.id)} disabled={updateKtbMutation.isPending}>
                  {updateKtbMutation.isPending ? "Saving..." : "Save KTB Receipt"}
                </Button>
              </div>
            </>
          )}

          {selectedRow && sheetMode === "partner" && (
            <>
              <SheetHeader>
                <SheetTitle>Partner Fund Confirmation</SheetTitle>
                <SheetDescription>Confirm receipt of funds from KTB for {selectedRow.contribution_id}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p><strong>Tourist:</strong> {selectedRow.tourist_name}</p>
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
                  {updatePartnerMutation.isPending ? "Saving..." : "Save Confirmation"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
