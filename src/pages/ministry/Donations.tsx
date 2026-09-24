import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { kg, shortDate, treeCount, usd } from "@/lib/format";
import {
  MinistryStatusBadge,
  SortableHead,
  TablePagination,
  TableToolbar,
} from "@/components/ministry/TableControls";
import { compareValues, paginate, type SortDirection } from "@/components/ministry/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const NO_REQUEST = "no_request";

type SortField = "tourist" | "treeType" | "quantity" | "status" | "offset" | "amount" | "createdAt";

export default function MinistryDonations() {
  const { session } = useAuth();
  const { state, loading, createPlantationRequest } = useStore();
  const canWrite = session?.role === "ministry_admin";
  const [partnerByDonation, setPartnerByDonation] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const rows = useMemo(
    () =>
      state.donations
        .filter((d) => d.status === "paid")
        .map((d) => {
          const request = state.plantationRequests.find((r) => r.donationIds.includes(d.id));
          return {
            donation: d,
            request,
            tourist: state.users.find((u) => u.id === d.userId)?.email ?? "Unknown",
            treeType: d.trees.map((t) => t.treeType).join(", "),
            quantity: treeCount(d.trees),
            status: request?.status ?? NO_REQUEST,
            offset: d.carbonOffsetKg,
            amount: d.amount,
            createdAt: d.createdAt,
          };
        }),
    [state.donations, state.plantationRequests, state.users],
  );

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.status)))
        .sort()
        .map((value) => ({ value, label: value === NO_REQUEST ? "No request" : value.replace(/_/g, " ") })),
    [rows],
  );

  const sortedRows = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return rows
      .filter(
        (r) =>
          (!q || r.tourist.toLowerCase().includes(q) || r.treeType.toLowerCase().includes(q)) &&
          (statusFilter === "all" || r.status === statusFilter),
      )
      .sort((a, b) => compareValues(a[sortField], b[sortField], sortDirection));
  }, [rows, searchQuery, statusFilter, sortField, sortDirection]);

  const pageRows = paginate(sortedRows, currentPage, pageSize);

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
                  setCurrentPage(1);
                }}
                searchPlaceholder="Search by email, tree type..."
                status={statusFilter}
                onStatusChange={(v) => {
                  setStatusFilter(v);
                  setCurrentPage(1);
                }}
                statusOptions={statusOptions}
                pageSize={pageSize}
                onPageSizeChange={(v) => {
                  setPageSize(v);
                  setCurrentPage(1);
                }}
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
                      <SortableHead align="right" onClick={() => handleSort("amount")}>
                        Amount
                      </SortableHead>
                      <SortableHead onClick={() => handleSort("createdAt")}>Created</SortableHead>
                      {canWrite && <TableHead>Assign Partner</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.length > 0 ? (
                      pageRows.map(({ donation: d, request, ...row }) => (
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
                          <TableCell className="text-right">{usd(row.amount)}</TableCell>
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
                                      <SelectValue placeholder="Partner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {state.vendors.map((v) => (
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
                currentPage={currentPage}
                pageSize={pageSize}
                total={sortedRows.length}
                noun="orders"
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
