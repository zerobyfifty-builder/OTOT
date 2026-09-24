import { useMemo, useState } from "react";
import { Layers } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { shortDate, usd } from "@/lib/format";
import {
  MinistryStatusBadge,
  SortableHead,
  TablePagination,
  TableToolbar,
} from "@/components/ministry/TableControls";
import { compareValues, paginate, requestTrees, type SortDirection } from "@/components/ministry/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SortField = "createdAt" | "orders" | "trees" | "amount" | "partner" | "status";

export default function MinistryRequests() {
  const { session } = useAuth();
  const { state, loading, assignPlantationRequest, markPlantationComplete, combinePlantationRequests } = useStore();
  const canWrite = session?.role === "ministry_admin";
  const [partnerPick, setPartnerPick] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const rows = useMemo(
    () =>
      state.plantationRequests.map((r) => {
        const vprs = state.vendorPlantationRequests.filter((v) => v.plantationRequestId === r.id);
        return {
          request: r,
          vprs,
          partner: state.vendors.find((v) => v.id === r.partnerId)?.name ?? "Unassigned",
          orders: r.donationIds.length,
          trees: requestTrees(state, r),
          amount: r.amount,
          status: r.status as string,
          createdAt: r.createdAt,
        };
      }),
    [state],
  );

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.status)))
        .sort()
        .map((value) => ({ value, label: value.replace(/_/g, " ") })),
    [rows],
  );

  const sortedRows = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return rows
      .filter(
        (r) => (!q || r.partner.toLowerCase().includes(q)) && (statusFilter === "all" || r.status === statusFilter),
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

  const columnCount = canWrite ? 9 : 7;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Planting Requests</h1>
        <p className="text-muted-foreground mt-1">
          Assign partners and mark requests complete once every vendor plantation request is done
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>All Planting Requests</CardTitle>
              <CardDescription>Plantation requests with partner progress and current status</CardDescription>
            </div>
            {canWrite && selected.length >= 2 && (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await combinePlantationRequests(selected);
                    setSelected([]);
                    toast.success("Requests combined");
                  } catch (err) {
                    toast.error(apiErrorMessage(err));
                  }
                }}
              >
                <Layers className="h-4 w-4 mr-2" />
                Combine {selected.length} requests
              </Button>
            )}
          </div>
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
                searchPlaceholder="Search by partner..."
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
                      {canWrite && <TableHead className="w-10" />}
                      <SortableHead onClick={() => handleSort("createdAt")}>Created</SortableHead>
                      <SortableHead align="right" onClick={() => handleSort("orders")}>
                        Tree Orders
                      </SortableHead>
                      <SortableHead align="right" onClick={() => handleSort("trees")}>
                        Trees
                      </SortableHead>
                      <SortableHead align="right" onClick={() => handleSort("amount")}>
                        Amount
                      </SortableHead>
                      <SortableHead onClick={() => handleSort("partner")}>Partner</SortableHead>
                      <TableHead>Vendor Work</TableHead>
                      <SortableHead onClick={() => handleSort("status")}>Status</SortableHead>
                      {canWrite && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.length > 0 ? (
                      pageRows.map(({ request: r, vprs, ...row }) => {
                        const allDone = vprs.length > 0 && vprs.every((v) => v.status === "completed");
                        return (
                          <TableRow key={r.id}>
                            {canWrite && (
                              <TableCell>
                                {r.status === "unassigned" && (
                                  <Checkbox
                                    aria-label={`Select request ${r.id}`}
                                    checked={selected.includes(r.id)}
                                    onCheckedChange={(checked) =>
                                      setSelected((prev) =>
                                        checked === true ? [...prev, r.id] : prev.filter((id) => id !== r.id),
                                      )
                                    }
                                  />
                                )}
                              </TableCell>
                            )}
                            <TableCell className="whitespace-nowrap">{shortDate(row.createdAt)}</TableCell>
                            <TableCell className="text-right">{row.orders}</TableCell>
                            <TableCell className="text-right">{row.trees}</TableCell>
                            <TableCell className="text-right">{usd(row.amount)}</TableCell>
                            <TableCell
                              className={r.partnerId ? "font-medium" : "text-muted-foreground"}
                            >
                              {row.partner}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {vprs.length === 0
                                ? "None yet"
                                : `${vprs.filter((v) => v.status === "completed").length}/${vprs.length} complete`}
                            </TableCell>
                            <TableCell>
                              <MinistryStatusBadge status={r.status} />
                            </TableCell>
                            {canWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {r.status === "unassigned" && (
                                    <>
                                      <Select
                                        value={partnerPick[r.id] || ""}
                                        onValueChange={(v) => setPartnerPick((p) => ({ ...p, [r.id]: v }))}
                                      >
                                        <SelectTrigger className="w-40">
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
                                        variant="outline"
                                        onClick={async () => {
                                          const pid = partnerPick[r.id];
                                          const admin = state.users.find(
                                            (u) => u.vendorId === pid && u.role === "partner_admin",
                                          );
                                          if (!pid || !admin) {
                                            toast.error("Pick a partner with an admin");
                                            return;
                                          }
                                          try {
                                            await assignPlantationRequest(r.id, pid, admin.id);
                                            toast.success("Assigned");
                                          } catch (err) {
                                            toast.error(apiErrorMessage(err));
                                          }
                                        }}
                                      >
                                        Assign
                                      </Button>
                                    </>
                                  )}
                                  {r.status === "ready_for_review" && allDone && (
                                    <Button
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          await markPlantationComplete(r.id);
                                          toast.success("Marked complete");
                                        } catch (err) {
                                          toast.error(apiErrorMessage(err));
                                        }
                                      }}
                                    >
                                      Mark complete
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                          No planting requests found
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
                noun="requests"
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
