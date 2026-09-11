import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { kg, shortDate, treeCount, usd } from "@/lib/format";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DonationDetail() {
  const { id } = useParams();
  const { session } = useAuth();
  const { state } = useStore();
  const donation = state.donations.find((d) => d.id === id);
  const payment = state.payments.find((p) => p.donationId === id);
  const request = state.plantationRequests.find((r) => r.donationId === id);

  if (!donation || (session?.role === "tourist" && donation.userId !== session.userId)) {
    return <div className="p-8 text-muted-foreground">Donation not found.</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Donation</h1>
        <p className="text-muted-foreground">{shortDate(donation.createdAt)}</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{usd(donation.amount)}</CardTitle>
          <StatusBadge status={donation.status} />
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>Carbon offset: {kg(donation.carbonOffsetKg)}</div>
          <div>
            Trees ({treeCount(donation.trees)})
            <ul className="mt-2 space-y-1">
              {donation.trees.map((t) => (
                <li key={t.treeTypeId}>
                  {t.count} × {t.treeType}
                </li>
              ))}
            </ul>
          </div>
          {payment && (
            <div className="border-t pt-3 space-y-1">
              <div className="font-medium">Payment {payment.id.slice(0, 8)}</div>
              <div>Mode: {payment.paymentMode}</div>
              <div>
                Status: <StatusBadge status={payment.status} />
              </div>
              <div>Plantation {usd(payment.transactionChargesSplit.plantation)} · Platform{" "}
                {usd(payment.transactionChargesSplit.platform)} · Processor{" "}
                {usd(payment.transactionChargesSplit.processor)}
              </div>
            </div>
          )}
          {request && (
            <div className="border-t pt-3">
              Plantation request <StatusBadge status={request.status} />
            </div>
          )}
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
