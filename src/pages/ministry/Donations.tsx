import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { kes, kg, shortDate, treeCount, usd } from "@/lib/format";
import { receivedKesByDonation } from "@/lib/ledger";
import { REQUEST_STATUS_LABEL } from "@/lib/plantingStatus";
import { usePagination } from "@/components/admin/usePagination";
import {
  MinistryStatusBadge,
  SortableHead,
  TablePagination,
  TableToolbar,
} from "@/components/ministry/TableControls";
import { compareValues, type SortDirection } from "@/components/ministry/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const NO_REQUEST = "no_request";

type SortField = "tourist" | "treeType" | "quantity" | "status" | "offset" | "amountKes" | "createdAt";

export default function MinistryDonations() {
  const { session } = useAuth();
  const { state, loading, createPlantationRequest } = useStore();
  // Super Admin can open the Ministry screens and acts with Ministry admin rights.
  const canWrite = session?.role === "ministry_admin" || session?.role === "super_admin";
  const [partnerByDonation, setPartnerByDonation] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const activeVendors = state.vendors.filter((v) => v.status === "active");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const rows = useMemo(() => {
    const received = receivedKesByDonation(state);
    return state.donations
      .filter((d) => d.status === "paid")
      .map((d) => {
        const request = state.plantationRequests.find((r) => r.donationIds.includes(d.id));
        const user = state.users.find((u) => u.id === d.userId);
        return {
          donation: d,
          request,
          // View-only Ministry users don't receive tourists' emails.
          tourist: user?.email || user?.name || "Unknown",
          treeType: d.trees.map((t) => t.treeType).join(", "),
          quantity: treeCount(d.trees),
          status: request?.status ?? NO_REQUEST,
          offset: d.carbonOffsetKg,
          amountKes: received.get(d.id) ?? 0,
          createdAt: d.createdAt,
        };
      });
  }, [state]);

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.status)))
        .sort()
        .map((value) => ({
          value,
          label: value === NO_REQUEST ? "No request" : REQUEST_STATUS_LABEL[value as keyof typeof REQUEST_STATUS_LABEL],
        })),
    [rows],
  );

  const sortedRows = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return rows
      .filter(
        (r) =>
          (!q ||
            r.tourist.toLowerCase().includes(q) ||
            r.treeType.toLowerCase().includes(q) ||
            r.donation.id.toLowerCase().includes(q)) &&
          (statusFilter === "all" || r.status === statusFilter),
      )
      .sort((a, b) => compareValues(a[sortField], b[sortField], sortDirection));
  }, [rows, searchQuery, statusFilter, sortField, sortDirection]);

  // usePagination clamps the page when filters or new requests shrink the list.
  const pager = usePagination(sortedRows, 10);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Tree Orders</h1>
        <p className="text-muted-foreground mt-1">
          Paid tree orders are queued automatically and can be grouped before partner assignment
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tree Orders</CardTitle>
          <CardDescription>Paid tree orders with their plantation request status</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <TableToolbar
                search={searchQuery}
                onSearchChange={(v) => {
                  setSearchQuery(v);
                  pager.resetPage();
                }}
                searchPlaceholder="Search by tourist, tree type or donation ID..."
                status={statusFilter}
                onStatusChange={(v) => {
                  setStatusFilter(v);
                  pager.resetPage();
                }}
                statusOptions={statusOptions}
                pageSize={pager.pageSize}
                onPageSizeChange={pager.setPageSize}
              />

              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHead onClick={() => handleSort("tourist")}>Tourist</SortableHead>
                      <SortableHead onClick={() => handleSort("treeType")}>Tree Type</SortableHead>
                      <SortableHead align="right" onClick={() => handleSort("quantity")}>
                        Quantity
                      </SortableHead>
                      <SortableHead onClick={() => handleSort("status")}>Status</SortableHead>
                      <SortableHead align="right" onClick={() => handleSort("offset")}>
                        CO₂ Offset
                      </SortableHead>
                      <SortableHead align="right" onClick={() => handleSort("amountKes")}>
                        Received
                      </SortableHead>
                      <SortableHead onClick={() => handleSort("createdAt")}>Created</SortableHead>
                      {canWrite && <TableHead>Assign Partner</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pager.pageRows.length > 0 ? (
                      pager.pageRows.map(({ donation: d, request, ...row }) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{row.tourist}</TableCell>
                          <TableCell>{row.treeType || "Not specified"}</TableCell>
                          <TableCell className="text-right">{row.quantity}</TableCell>
                          <TableCell>
                            {request ? (
                              <MinistryStatusBadge status={request.status} />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{kg(row.offset)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="tabular-nums">{kes(row.amountKes)}</div>
                            <div className="text-xs text-muted-foreground">{usd(d.amount)}</div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{shortDate(row.createdAt)}</TableCell>
                          {canWrite && (
                            <TableCell>
                              {request ? (
                                <span className="text-xs text-muted-foreground">Already created</span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={partnerByDonation[d.id] || ""}
                                    onValueChange={(v) => setPartnerByDonation((p) => ({ ...p, [d.id]: v }))}
                                  >
                                    <SelectTrigger className="w-44">
                                      <SelectValue placeholder="Partner (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {activeVendors.map((v) => (
                                        <SelectItem key={v.id} value={v.id}>
                                          {v.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        await createPlantationRequest({
                                          donationId: d.id,
                                          partnerId: partnerByDonation[d.id] || undefined,
                                        });
                                        toast.success("Plantation request created");
                                      } catch (err) {
                                        toast.error(apiErrorMessage(err));
                                      }
                                    }}
                                  >
                                    Create request
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={canWrite ? 8 : 7} className="h-24 text-center text-muted-foreground">
                          No tree orders found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <TablePagination
                currentPage={pager.currentPage}
                pageSize={pager.pageSize}
                total={pager.totalCount}
                noun="orders"
                onPageChange={pager.setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
