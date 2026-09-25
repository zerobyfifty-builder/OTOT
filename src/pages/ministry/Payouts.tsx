import { useMemo, useState } from "react";
import { CheckCircle2, DollarSign, Loader2, Plus, RefreshCw, TreePine } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { shortDate, usd } from "@/lib/format";
import { useSimulationAllowed } from "@/hooks/useSimulationAllowed";
import { MinistryStatusBadge } from "@/components/ministry/TableControls";
import { partnerTreeStats, requestTrees } from "@/components/ministry/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function MinistryPayouts() {
  const { session } = useAuth();
  const { state, loading, createPayout, simulatePayoutSuccess, refresh } = useStore();
  const canWrite = session?.role === "ministry_admin";
  const canSimulate = useSimulationAllowed() && (canWrite || session?.role === "super_admin");
  const [open, setOpen] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  const waiting = state.plantationRequests
    .filter((r) => r.status === "completed")
    .filter((r) => {
      const payout = state.plantationPayouts.find((p) => p.plantationRequestId === r.id);
      return !payout || payout.payoutStatus === "failed";
    });
  const totalPaid = state.plantationPayouts
    .filter((p) => p.payoutStatus === "paid")
    .reduce((s, p) => s + p.amount, 0);
  const pendingCount = state.plantationPayouts.filter(
    (p) => p.payoutStatus === "pending" || p.payoutStatus === "processing",
  ).length;
  const allocations = useMemo(() => partnerTreeStats(state), [state]);
  const allocatedPartners = state.vendors.filter((v) => allocations[v.id]);

  const vendorFor = (partnerId?: string) => state.vendors.find((v) => v.id === partnerId);
  const isRetry = (id: string) =>
    state.plantationPayouts.some((p) => p.plantationRequestId === id && p.payoutStatus === "failed");
  const selectedRequest = waiting.find((r) => r.id === requestId);
  const selectedVendor = vendorFor(selectedRequest?.partnerId);

  const submitPayout = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      await createPayout(selectedRequest.id);
      toast.success("Payout submitted");
      setOpen(false);
      setRequestId("");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const markPayoutPaid = async (payoutId: string) => {
    setSimulatingId(payoutId);
    try {
      await simulatePayoutSuccess(payoutId);
      toast.success("Payout marked successful");
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
            Plantation share paid to partners’ M-Pesa numbers via Afrinet against completed requests
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            title="Refresh"
            onClick={() => refresh().catch((err) => toast.error(apiErrorMessage(err)))}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canWrite && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Disbursement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Disbursement</DialogTitle>
                </DialogHeader>
                {waiting.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No completed requests waiting for payout.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Completed Request</Label>
                      <Select value={requestId} onValueChange={setRequestId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select request" />
                        </SelectTrigger>
                        <SelectContent>
                          {waiting.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {vendorFor(r.partnerId)?.name ?? "Unassigned"} · {usd(r.amount)}
                              {isRetry(r.id) ? " (retry)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedRequest && (
                      <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                        {selectedVendor?.mpesaPhone ? (
                          <>
                            Pays <span className="font-medium">{usd(selectedRequest.amount)}</span> to{" "}
                            <span className="font-mono text-xs">{selectedVendor.mpesaPhone}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Set an M-Pesa number on the vendor first.</span>
                        )}
                      </div>
                    )}
                    <Button className="w-full" onClick={submitPayout} disabled={!selectedRequest || submitting}>
                      {submitting
                        ? "Submitting..."
                        : selectedRequest && isRetry(selectedRequest.id)
                          ? "Retry Payout"
                          : "Pay Partner"}
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
                <p className="text-2xl font-bold">{usd(totalPaid)}</p>
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
                <p className="text-xs text-muted-foreground">Pending</p>
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
                <p className="text-xs text-muted-foreground">Awaiting Payout</p>
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
                    <TableHead>Trees Allocated</TableHead>
                    <TableHead>Trees Planted</TableHead>
                    <TableHead>Tourist Payments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocatedPartners.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>{allocations[v.id].allocated.toLocaleString()}</TableCell>
                      <TableCell>{allocations[v.id].planted.toLocaleString()}</TableCell>
                      <TableCell>{usd(allocations[v.id].payments)}</TableCell>
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
          ) : state.plantationPayouts.length === 0 ? (
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
                    {canSimulate && canWrite ? <TableHead className="text-right">Test</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.plantationPayouts.map((p) => {
                    const request = state.plantationRequests.find((r) => r.id === p.plantationRequestId);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="whitespace-nowrap">{shortDate(p.createdAt)}</TableCell>
                        <TableCell className="font-medium">{vendorFor(request?.partnerId)?.name || "-"}</TableCell>
                        <TableCell>{usd(p.amount)}</TableCell>
                        <TableCell>{request ? requestTrees(state, request) || "-" : "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{p.transactionId || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{p.transactionReferenceNumber || "-"}</TableCell>
                        <TableCell>
                          <MinistryStatusBadge status={p.payoutStatus} />
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{p.failureMessage || "-"}</TableCell>
                        {canSimulate && canWrite ? (
                          <TableCell className="text-right">
                            {p.payoutStatus === "paid" ? null : (
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
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
