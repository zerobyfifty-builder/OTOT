import { useMemo, useState } from "react";
import { CheckCircle2, DollarSign, Loader2, Plus, RefreshCw, TreePine } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { kes, shortDate, treeCount } from "@/lib/format";
import { isOpenPayout, isPayable } from "@/lib/payouts";
import { REQUEST_STATUS_LABEL, requestDonationIds } from "@/lib/plantingStatus";
import { useSimulationAllowed } from "@/hooks/useSimulationAllowed";
import { MinistryStatusBadge } from "@/components/ministry/TableControls";
import { partnerTreeStats } from "@/components/ministry/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function MinistryPayouts() {
  const { session } = useAuth();
  const { state, loading, createPayout, simulatePayoutSuccess, refresh } = useStore();
  // Super Admin can open the Ministry screens and acts with Ministry admin rights.
  const canWrite = session?.role === "ministry_admin" || session?.role === "super_admin";
  // Test-only shortcut; the API allows it for Super Admin where simulation is on.
  const canSimulate = useSimulationAllowed() && session?.role === "super_admin";
  const [open, setOpen] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  const partnerShares = state.paymentAllocations.filter((a) => a.recipientType === "partner");
  const partnerPayouts = state.payouts.filter((p) => p.recipientType === "partner");
  const sharesFor = (id: string) => {
    const request = state.plantationRequests.find((r) => r.id === id);
    const ids = new Set(request ? requestDonationIds(request) : []);
    return partnerShares.filter((a) => ids.has(a.donationId));
  };
  const payableKes = (id: string) => sharesFor(id).filter(isPayable).reduce((s, a) => s + a.amountKes, 0);
  // Partners can be paid as soon as the Ministry assigns them, not only after verification.
  const waiting = state.plantationRequests.filter(
    (r) => r.partnerId && r.status !== "unassigned" && payableKes(r.id) > 0,
  );
  const totalPaid = partnerPayouts.filter((p) => p.status === "transferred").reduce((s, p) => s + p.amountKes, 0);
  const pendingCount = partnerPayouts.filter((p) => isOpenPayout(p.status)).length;
  const donationTrees = new Map(state.donations.map((d) => [d.id, treeCount(d.trees)]));
  const payoutTrees = (payoutId: string) =>
    partnerShares
      .filter((a) => a.payoutId === payoutId)
      .reduce((s, a) => s + (donationTrees.get(a.donationId) ?? 0), 0);
  const allocations = useMemo(() => partnerTreeStats(state), [state]);
  const allocatedPartners = state.vendors.filter((v) => allocations[v.id]);

  const vendorFor = (partnerId?: string) => state.vendors.find((v) => v.id === partnerId);
  const isRetry = (id: string) => sharesFor(id).some((a) => a.status === "failed");
  const selectedRequest = waiting.find((r) => r.id === requestId);
  const selectedVendor = vendorFor(selectedRequest?.partnerId);

  const submitPayout = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      const payout = await createPayout(selectedRequest.id);
      toast.success(`Payout of ${kes(payout.amountKes)} submitted to ${selectedVendor?.name ?? "the partner"}`);
      setOpen(false);
      setRequestId("");
    } catch (err) {
      toast.error(`${apiErrorMessage(err)} Check Disbursement Records before trying again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const markPayoutPaid = async (payoutId: string) => {
    setSimulatingId(payoutId);
    try {
      await simulatePayoutSuccess(payoutId);
      toast.success("Test payout marked transferred");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSimulatingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Disbursements</h1>
          <p className="text-muted-foreground mt-1">
            The partner's share (what's left after Afrinet fees and the OTOT and Ministry shares), sent to their M-Pesa
            via Afrinet. A partner can be paid as soon as a request is assigned to them.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            title="Refresh"
            aria-label="Refresh"
            onClick={() => refresh().catch((err) => toast.error(apiErrorMessage(err)))}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canWrite && (
            <Dialog
              open={open}
              onOpenChange={(next) => {
                if (submitting) return;
                setOpen(next);
                if (!next) setRequestId("");
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Disbursement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Pay a partner</DialogTitle>
                  <DialogDescription>
                    Sends the unpaid partner share for one assigned request as a single M-Pesa transfer. This moves real
                    money and can't be recalled.
                  </DialogDescription>
                </DialogHeader>
                {waiting.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No assigned requests have an unpaid partner share right now.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Assigned request</Label>
                      <Select value={requestId} onValueChange={setRequestId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select request" />
                        </SelectTrigger>
                        <SelectContent>
                          {waiting.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {vendorFor(r.partnerId)?.name ?? "Unknown partner"} · {kes(payableKes(r.id))} ·{" "}
                              {REQUEST_STATUS_LABEL[r.status]}
                              {isRetry(r.id) ? " (retry)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedRequest && (
                      <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm space-y-1">
                        {selectedVendor?.mpesaPhone ? (
                          <p>
                            Pays <span className="font-medium">{kes(payableKes(selectedRequest.id))}</span> to{" "}
                            {selectedVendor.name} at <span className="font-mono text-xs">{selectedVendor.mpesaPhone}</span>
                          </p>
                        ) : (
                          <p className="text-destructive">
                            {selectedVendor?.name ?? "This partner"} has no M-Pesa wallet. Ask the Super Admin to add one
                            on the Wallets screen.
                          </p>
                        )}
                        {selectedRequest.status !== "completed" && (
                          <p className="text-xs text-muted-foreground">
                            Planting isn't verified yet ({REQUEST_STATUS_LABEL[selectedRequest.status]}). Paying now is
                            allowed.
                          </p>
                        )}
                      </div>
                    )}
                    <Button
                      className="w-full"
                      onClick={submitPayout}
                      disabled={!selectedRequest || !selectedVendor?.mpesaPhone || submitting}
                    >
                      {submitting
                        ? "Submitting..."
                        : selectedRequest
                          ? `${isRetry(selectedRequest.id) ? "Retry payout" : "Pay partner"} ${kes(payableKes(selectedRequest.id))}`
                          : "Pay partner"}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Disbursed</p>
                <p className="text-2xl font-bold">{kes(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <TreePine className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payouts in progress</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assigned requests awaiting payout</p>
                <p className="text-2xl font-bold">{waiting.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {allocatedPartners.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Partner Allocations Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Trees Assigned</TableHead>
                    <TableHead>Reported Planted</TableHead>
                    <TableHead>Verified Planted</TableHead>
                    <TableHead>Partner Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocatedPartners.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>{allocations[v.id].allocated.toLocaleString()}</TableCell>
                      <TableCell>{allocations[v.id].reported.toLocaleString()}</TableCell>
                      <TableCell>{allocations[v.id].planted.toLocaleString()}</TableCell>
                      <TableCell>{kes(allocations[v.id].shareKes)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Disbursement Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : partnerPayouts.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No disbursements recorded yet.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Trees</TableHead>
                    <TableHead>Txn ID</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    {canSimulate && <TableHead className="text-right">Test</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerPayouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap">{shortDate(p.createdAt)}</TableCell>
                      <TableCell className="font-medium">{vendorFor(p.partnerId)?.name || p.recipientName}</TableCell>
                      <TableCell>{kes(p.amountKes)}</TableCell>
                      <TableCell>{payoutTrees(p.id) || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{p.transactionCode || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <MinistryStatusBadge status={p.status} />
                          {p.needsReview && <MinistryStatusBadge status="needs_review" />}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[240px] text-sm">
                        {p.needsReview ? (
                          <p className="text-amber-700" title={p.reviewNote}>
                            Possible double payment; the Super Admin is reviewing it.
                            {p.reviewNote ? ` ${p.reviewNote}` : ""}
                          </p>
                        ) : null}
                        {p.failureMessage && (
                          <p className="truncate" title={p.failureMessage}>
                            {p.failureMessage}
                          </p>
                        )}
                        {p.resolutionNote && (
                          <p className="text-muted-foreground truncate" title={p.resolutionNote}>
                            Resolved: {p.resolutionNote}
                          </p>
                        )}
                        {!p.needsReview && !p.failureMessage && !p.resolutionNote && "-"}
                      </TableCell>
                      {canSimulate && (
                        <TableCell className="text-right">
                          {isOpenPayout(p.status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={simulatingId === p.id}
                              onClick={() => void markPayoutPaid(p.id)}
                            >
                              {simulatingId === p.id ? "Marking…" : "Mark this payout successful"}
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
