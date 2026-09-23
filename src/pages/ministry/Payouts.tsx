import { CheckCircle2, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { shortDate, usd } from "@/lib/format";
import { EmptyState, IconStatCard, PortalPage, TableFrame } from "@/components/portal/PortalUI";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function MinistryPayouts() {
  const { session } = useAuth();
  const { state, createPayout } = useStore();
  const canWrite = session?.role === "ministry_admin";
  const completed = state.plantationRequests.filter((r) => r.status === "completed");
  const waiting = completed.filter((r) => !state.plantationPayouts.some((p) => p.plantationRequestId === r.id));
  const totalPaid = state.plantationPayouts
    .filter((p) => p.payoutStatus === "paid")
    .reduce((s, p) => s + p.amount, 0);
  const pendingCount = state.plantationPayouts.filter(
    (p) => p.payoutStatus === "pending" || p.payoutStatus === "processing",
  ).length;

  return (
    <PortalPage
      tone="ministry"
      title="Payouts"
      subtitle="Released against completed plantation requests. Amount is the plantation share, paid to the vendor’s M-Pesa number via Afrinet."
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <IconStatCard label="Total paid out" value={usd(totalPaid)} icon={DollarSign} tint={{ bg: "bg-primary/10", fg: "text-primary" }} />
        <IconStatCard label="Pending" value={pendingCount} icon={Clock} tint={{ bg: "bg-orange-100", fg: "text-orange-600" }} />
        <IconStatCard label="Awaiting payout" value={waiting.length} icon={CheckCircle2} tint={{ bg: "bg-green-100", fg: "text-green-600" }} />
      </div>

      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle>Create payout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {waiting.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed requests waiting for payout.</p>
            ) : (
              waiting.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border px-4 py-3">
                  <span className="text-sm">
                    <span className="font-medium">{usd(r.amount)}</span> request
                    {(() => {
                      const vendor = state.vendors.find((v) => v.id === r.partnerId);
                      return vendor?.mpesaPhone
                        ? ` → ${vendor.mpesaPhone}`
                        : " (set an M-Pesa number on the vendor first)";
                    })()}
                  </span>
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await createPayout(r.id);
                        toast.success("Payout submitted");
                      } catch (err) {
                        toast.error(apiErrorMessage(err));
                      }
                    }}
                  >
                    Pay partner
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payout Records</CardTitle>
        </CardHeader>
        <CardContent>
          {state.plantationPayouts.length === 0 ? (
            <EmptyState icon={DollarSign} message="No payouts recorded yet." />
          ) : (
            <TableFrame>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Txn</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.plantationPayouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{shortDate(p.createdAt)}</TableCell>
                      <TableCell className="font-medium">{usd(p.amount)}</TableCell>
                      <TableCell className="font-mono text-xs">{p.transactionId}</TableCell>
                      <TableCell className="font-mono text-xs">{p.transactionReferenceNumber}</TableCell>
                      <TableCell>
                        <StatusBadge status={p.payoutStatus} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[16rem] truncate">
                        {p.failureMessage ?? ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableFrame>
          )}
        </CardContent>
      </Card>
    </PortalPage>
  );
}
