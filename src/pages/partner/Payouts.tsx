import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { shortDate, usd } from "@/lib/format";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PartnerPayouts() {
  const { session } = useAuth();
  const { state } = useStore();
  const requestIds = state.plantationRequests
    .filter((r) => r.partnerId === session?.vendorId)
    .map((r) => r.id);
  const payouts = state.plantationPayouts.filter((p) => requestIds.includes(p.plantationRequestId));

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payouts received</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payouts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{shortDate(p.createdAt)}</TableCell>
                    <TableCell>{usd(p.amount)}</TableCell>
                    <TableCell className="font-mono text-xs">{p.transactionReferenceNumber}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.payoutStatus} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[14rem] truncate">
                      {p.failureMessage ?? ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
