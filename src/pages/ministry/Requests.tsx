import { useMemo, useState } from "react";
import { AlertTriangle, Layers } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { kes, shortDate, usd } from "@/lib/format";
import { receivedKesByDonation } from "@/lib/ledger";
import { REQUEST_STATUS_LABEL, requestDonationIds } from "@/lib/plantingStatus";
import { ConfirmDialog, ReasonDialog } from "@/components/admin/ConfirmDialog";
import { usePagination } from "@/components/admin/usePagination";
import {
  MinistryStatusBadge,
  SortableHead,
  TablePagination,
  TableToolbar,
} from "@/components/ministry/TableControls";
import { compareValues, requestReceivedKes, requestTrees, type SortDirection } from "@/components/ministry/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AppUser, PlantationRequest, Vendor } from "@/types/otot";

type SortField = "createdAt" | "orders" | "trees" | "amountKes" | "partner" | "status";

const shortId = (id: string) => id.slice(0, 8);
/** Partner shares that have left (or may have left) the wallet can't follow a reassignment. */
const SENT_STATUSES = new Set(["initiated", "in_progress", "transferred"]);

export default function MinistryRequests() {
  const { session } = useAuth();
  const {
    state,
    loading,
    assignPlantationRequest,
    markPlantationComplete,
    reopenPlantationRequest,
    combinePlantationRequests,
  } = useStore();
  // Super Admin can open the Ministry screens and acts with Ministry admin rights.
  const canWrite = session?.role === "ministry_admin" || session?.role === "super_admin";
  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [assigning, setAssigning] = useState<PlantationRequest | null>(null);
  const [completing, setCompleting] = useState<PlantationRequest | null>(null);
  const [sendingBack, setSendingBack] = useState<PlantationRequest | null>(null);

  const vendorName = useMemo(() => new Map(state.vendors.map((v) => [v.id, v.name])), [state.vendors]);
  const activeVendors = useMemo(() => state.vendors.filter((v) => v.status === "active"), [state.vendors]);
  /** The partner admin who receives an assignment: the oldest active one, as the API picks. */
  const adminFor = useMemo(() => {
    const admins = new Map<string, AppUser>();
    for (const u of [...state.users].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      if (u.role === "partner_admin" && u.active && u.vendorId && !admins.has(u.vendorId)) admins.set(u.vendorId, u);
    }
    return admins;
  }, [state.users]);

  const rows = useMemo(() => {
    const received = receivedKesByDonation(state);
    const users = new Map(state.users.map((u) => [u.id, u]));
    const donations = new Map(state.donations.map((d) => [d.id, d]));
    return state.plantationRequests.map((r) => {
      const ids = requestDonationIds(r);
      const vprs = state.vendorPlantationRequests.filter((v) => v.plantationRequestId === r.id);
      const partner = r.partnerId ? (vendorName.get(r.partnerId) ?? "Unknown partner") : "Unassigned";
      const tourists = ids
        .map((id) => users.get(donations.get(id)?.userId ?? ""))
        .map((u) => (u ? `${u.name} ${u.email}` : ""))
        .join(" ");
      const partnerPaid = state.paymentAllocations.some(
        (a) => a.recipientType === "partner" && ids.includes(a.donationId) && SENT_STATUSES.has(a.status),
      );
      return {
        request: r,
        vprs,
        partner,
        partnerPaid,
        orders: ids.length,
        trees: requestTrees(state, r),
        amountKes: requestReceivedKes(received, r),
        status: r.status as string,
        createdAt: r.createdAt,
        search: `${r.id} ${ids.join(" ")} ${tourists} ${r.partnerId ? partner : ""}`.toLowerCase(),
      };
    });
  }, [state, vendorName]);

  const statusOptions = useMemo(
    () =>
      (Object.keys(REQUEST_STATUS_LABEL) as PlantationRequest["status"][])
        .filter((value) => rows.some((r) => r.status === value))
        .map((value) => ({ value, label: REQUEST_STATUS_LABEL[value] })),
    [rows],
  );

  const sortedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows
      .filter((r) => (!q || r.search.includes(q)) && (statusFilter === "all" || r.status === statusFilter))
      .sort((a, b) => compareValues(a[sortField], b[sortField], sortDirection));
  }, [rows, searchQuery, statusFilter, sortField, sortDirection]);

  // usePagination clamps the page when actions or filters shrink the list.
  const pager = usePagination(sortedRows, 10);

  // Combining works on what is on screen: any change of view clears the selection,
  // and requests that stopped being unassigned drop out of it.
  const unassignedIds = new Set(rows.filter((r) => r.status === "unassigned").map((r) => r.request.id));
  const selectedIds = selected.filter((id) => unassignedIds.has(id));
  const clearSelection = () => setSelected([]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    clearSelection();
  };

  const columnCount = canWrite ? 10 : 8;
  const completingRow = completing ? rows.find((r) => r.request.id === completing.id) : undefined;
  const assigningRow = assigning ? rows.find((r) => r.request.id === assigning.id) : undefined;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Planting Requests</h1>
        <p className="text-muted-foreground mt-1">
          Assign or reassign partners, then verify the planting once the partner reports it done
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>All Planting Requests</CardTitle>
              <CardDescription>
                Awaiting partner → Assigned → Reported planted (partner says it's done) → Verified (you've checked it)
              </CardDescription>
            </div>
            {canWrite && selectedIds.length >= 2 && (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await combinePlantationRequests(selectedIds);
                    clearSelection();
                    toast.success(`${selectedIds.length} requests combined into one`);
                  } catch (err) {
                    toast.error(apiErrorMessage(err));
                  }
                }}
              >
                <Layers className="h-4 w-4 mr-2" />
                Combine {selectedIds.length} requests
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
                  pager.resetPage();
                  clearSelection();
                }}
                searchPlaceholder="Search by request or donation ID, tourist or partner..."
                status={statusFilter}
                onStatusChange={(v) => {
                  setStatusFilter(v);
                  pager.resetPage();
                  clearSelection();
                }}
                statusOptions={statusOptions}
                pageSize={pager.pageSize}
                onPageSizeChange={(v) => {
                  pager.setPageSize(v);
                  clearSelection();
                }}
              />

              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canWrite && <TableHead className="w-10" />}
                      <TableHead>Request</TableHead>
                      <SortableHead onClick={() => handleSort("createdAt")}>Created</SortableHead>
                      <SortableHead align="right" onClick={() => handleSort("orders")}>
                        Tree Orders
                      </SortableHead>
                      <SortableHead align="right" onClick={() => handleSort("trees")}>
                        Trees
                      </SortableHead>
                      <SortableHead align="right" onClick={() => handleSort("amountKes")}>
                        Received
                      </SortableHead>
                      <SortableHead onClick={() => handleSort("partner")}>Partner</SortableHead>
                      <TableHead>Vendor Work</TableHead>
                      <SortableHead onClick={() => handleSort("status")}>Status</SortableHead>
                      {canWrite && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pager.pageRows.length > 0 ? (
                      pager.pageRows.map(({ request: r, vprs, ...row }) => {
                        const allDone = vprs.length > 0 && vprs.every((v) => v.status === "completed");
                        const admin = r.partnerId ? state.users.find((u) => u.id === r.assignedTo) : undefined;
                        return (
                          <TableRow key={r.id}>
                            {canWrite && (
                              <TableCell>
                                {r.status === "unassigned" && (
                                  <Checkbox
                                    aria-label={`Select request ${shortId(r.id)} to combine`}
                                    checked={selectedIds.includes(r.id)}
                                    onCheckedChange={(checked) =>
                                      setSelected((prev) =>
                                        checked === true ? [...prev, r.id] : prev.filter((id) => id !== r.id),
                                      )
                                    }
                                  />
                                )}
                              </TableCell>
                            )}
                            <TableCell className="font-mono text-xs whitespace-nowrap" title={r.id}>
                              {shortId(r.id)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{shortDate(row.createdAt)}</TableCell>
                            <TableCell className="text-right">{row.orders}</TableCell>
                            <TableCell className="text-right">{row.trees}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <div className="tabular-nums">{kes(row.amountKes)}</div>
                              <div className="text-xs text-muted-foreground">{usd(r.amount)}</div>
                            </TableCell>
                            <TableCell className={r.partnerId ? "font-medium" : "text-muted-foreground"}>
                              {row.partner}
                              {admin && <div className="text-xs font-normal text-muted-foreground">{admin.name}</div>}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {vprs.length === 0
                                ? "No agent yet"
                                : `${vprs.filter((v) => v.status === "completed").length}/${vprs.length} reported done`}
                            </TableCell>
                            <TableCell>
                              <MinistryStatusBadge status={r.status} />
                              {r.reviewNote && r.status !== "completed" && (
                                <div
                                  className="text-xs text-amber-700 mt-1 max-w-[220px] line-clamp-2"
                                  title={r.reviewNote}
                                >
                                  Sent back: {r.reviewNote}
                                </div>
                              )}
                            </TableCell>
                            {canWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {r.status === "unassigned" && (
                                    <Button size="sm" variant="outline" onClick={() => setAssigning(r)}>
                                      Assign
                                    </Button>
                                  )}
                                  {(r.status === "assigned" || r.status === "in_progress") && (
                                    <Button size="sm" variant="ghost" onClick={() => setAssigning(r)}>
                                      Reassign
                                    </Button>
                                  )}
                                  {r.status === "ready_for_review" && (
                                    <>
                                      <Button size="sm" variant="outline" onClick={() => setSendingBack(r)}>
                                        Send back
                                      </Button>
                                      <Button
                                        size="sm"
                                        disabled={!allDone}
                                        title={allDone ? undefined : "Every agent ticket must be reported done first"}
                                        onClick={() => setCompleting(r)}
                                      >
                                        Mark complete
                                      </Button>
                                    </>
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
                currentPage={pager.currentPage}
                pageSize={pager.pageSize}
                total={pager.totalCount}
                noun="requests"
                onPageChange={(page) => {
                  pager.setPage(page);
                  clearSelection();
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {canWrite && (
        <>
          <AssignPartnerDialog
            request={assigning}
            currentPartner={assigningRow?.request.partnerId ? assigningRow.partner : undefined}
            partnerPaid={assigningRow?.partnerPaid ?? false}
            hasAgentWork={(assigningRow?.vprs.length ?? 0) > 0}
            vendors={activeVendors}
            adminFor={adminFor}
            onClose={() => setAssigning(null)}
            onAssign={async (partnerId, adminId) => {
              const r = assigning!;
              await assignPlantationRequest(r.id, partnerId, adminId);
              toast.success(
                `${r.partnerId ? "Reassigned" : "Assigned"} to ${vendorName.get(partnerId) ?? "the partner"}`,
              );
              setAssigning(null);
            }}
          />

          <ConfirmDialog
            open={completing !== null}
            onOpenChange={(open) => !open && setCompleting(null)}
            title="Verify this planting?"
            description={
              <>
                <p>
                  You're confirming that {completingRow?.partner ?? "the partner"} planted{" "}
                  {completingRow?.trees.toLocaleString() ?? "the"} trees for request{" "}
                  <span className="font-mono">{completing ? shortId(completing.id) : ""}</span>.
                </p>
                <p>
                  The request becomes Verified, tourists see their trees as planted and can download their certificates.
                  This can't be undone. If something isn't right, send the work back instead.
                </p>
              </>
            }
            confirmLabel="Verify & complete"
            busyLabel="Completing…"
            onConfirm={async () => {
              await markPlantationComplete(completing!.id);
              toast.success("Planting verified and request completed");
            }}
          />

          <ReasonDialog
            open={sendingBack !== null}
            onOpenChange={(open) => !open && setSendingBack(null)}
            title="Send this work back to the partner?"
            description={
              <p>
                The request returns to In progress and the field agent's ticket reopens. The partner sees your reason
                and must report the work done again before you can verify it.
              </p>
            }
            label="What needs fixing?"
            placeholder="e.g. Site photos show 40 seedlings, the request is for 60."
            confirmLabel="Send back"
            onConfirm={async (reason) => {
              await reopenPlantationRequest(sendingBack!.id, reason);
              toast.success("Work sent back to the partner");
            }}
          />
        </>
      )}
    </div>
  );
}

function AssignPartnerDialog({
  request,
  currentPartner,
  partnerPaid,
  hasAgentWork,
  vendors,
  adminFor,
  onClose,
  onAssign,
}: {
  request: PlantationRequest | null;
  currentPartner?: string;
  partnerPaid: boolean;
  hasAgentWork: boolean;
  vendors: Vendor[];
  adminFor: Map<string, AppUser>;
  onClose: () => void;
  onAssign: (partnerId: string, adminId: string) => Promise<void>;
}) {
  const [partnerId, setPartnerId] = useState("");
  const [busy, setBusy] = useState(false);
  const reassigning = Boolean(request?.partnerId);
  const admin = partnerId ? adminFor.get(partnerId) : undefined;
  const samePartner = reassigning && partnerId === request?.partnerId;
  const blocked = reassigning && partnerPaid;
  const newPartner = vendors.find((v) => v.id === partnerId)?.name;

  const close = () => {
    if (busy) return;
    setPartnerId("");
    onClose();
  };

  const submit = async () => {
    if (!admin) return;
    setBusy(true);
    try {
      await onAssign(partnerId, admin.id);
      setPartnerId("");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{reassigning ? "Reassign to another partner" : "Assign a partner"}</DialogTitle>
          <DialogDescription>
            Request <span className="font-mono">{request ? shortId(request.id) : ""}</span>
            {reassigning && currentPartner ? <> · currently with {currentPartner}</> : null}. The partner's share
            becomes payable once it is assigned.
          </DialogDescription>
        </DialogHeader>

        {blocked ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {currentPartner ?? "The current partner"} has already been paid (or a payout is in progress) for this
            request, so it can't move to another partner.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Partner</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger>
                  <SelectValue placeholder={vendors.length ? "Select an active partner" : "No active partners"} />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id} disabled={!adminFor.has(v.id) || v.id === request?.partnerId}>
                      {v.name}
                      {v.id === request?.partnerId ? " (current)" : !adminFor.has(v.id) ? " (no active admin)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {partnerId && (
                <p className="text-xs text-muted-foreground">
                  {admin
                    ? `Goes to ${admin.name}, ${newPartner}'s partner admin.`
                    : `${newPartner} has no active partner admin. Ask the Super Admin to add one.`}
                </p>
              )}
            </div>
            {reassigning && partnerId && !samePartner && (
              <p className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  {currentPartner ?? "The current partner"} loses this request.
                  {hasAgentWork ? " Their work order and the field agent's ticket are cancelled." : ""} {newPartner}{" "}
                  starts from scratch, and the unpaid partner share moves to them.
                </span>
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={close}>
            Cancel
          </Button>
          {!blocked && (
            <Button disabled={busy || !admin || samePartner} onClick={() => void submit()}>
              {busy ? "Saving…" : reassigning ? "Reassign" : "Assign"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
