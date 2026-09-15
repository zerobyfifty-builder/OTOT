import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { shortDate, usd } from "@/lib/format";
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

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payouts</h1>
        <p className="text-muted-foreground mt-1">
          Released against completed plantation requests. Amount is the plantation share, paid to the vendor’s M-Pesa number via Afrinet.
        </p>
      </div>
      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle>Create payout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completed.filter((r) => !state.plantationPayouts.some((p) => p.plantationRequestId === r.id)).length ===
            0 ? (
              <p className="text-sm text-muted-foreground">No completed requests waiting for payout.</p>
            ) : (
              completed
                .filter((r) => !state.plantationPayouts.some((p) => p.plantationRequestId === r.id))
                .map((r) => (
                  <div key={r.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                    <span>
                      {usd(r.amount)} request
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
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <TableCell>{usd(p.amount)}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
