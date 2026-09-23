import { CheckCircle, Clock, CreditCard, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { shortDate, usd } from "@/lib/format";
import { PortalPage } from "@/components/portal/PortalUI";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
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
  const totalAmount = payouts.reduce((s, p) => s + p.amount, 0);
  const pendingCount = payouts.filter((p) => p.payoutStatus === "pending" || p.payoutStatus === "processing").length;
  const paidCount = payouts.filter((p) => p.payoutStatus === "paid").length;

  return (
    <PortalPage tone="partner" icon={CreditCard} title="Payouts received" subtitle="Plantation share paid to your M-Pesa number">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold">{usd(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-xl font-bold">{paidCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
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
                {payouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No payouts yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{shortDate(p.createdAt)}</TableCell>
                      <TableCell className="font-medium">{usd(p.amount)}</TableCell>
                      <TableCell className="font-mono text-xs">{p.transactionReferenceNumber}</TableCell>
                      <TableCell>
                        <StatusBadge status={p.payoutStatus} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {p.failureMessage ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PortalPage>
  );
}
