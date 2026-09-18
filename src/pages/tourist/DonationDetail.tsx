import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { redirectToCheckout } from "@/lib/checkout";
import { looksLikeMpesaPhone } from "@/lib/mpesa";
import { kg, kes, shortDate, treeCount, usd } from "@/lib/format";
import { MpesaPhoneField } from "@/components/shared/MpesaPhoneField";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TouristPage } from "@/components/layout/TouristPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DonationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { state, retryDonationCheckout } = useStore();
  const [retrying, setRetrying] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const donation = state.donations.find((d) => d.id === id);
  const payment = state.payments
    .filter((p) => p.donationId === id)
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
  const request = state.plantationRequests.find((r) => r.donationId === id);

  if (!donation || (session?.role === "tourist" && donation.userId !== session.userId)) {
    return (
      <TouristPage title="Donation">
        <p className="text-muted-foreground">Donation not found.</p>
      </TouristPage>
    );
  }

  return (
    <TouristPage title="Donation" subtitle={shortDate(donation.createdAt)} className="max-w-2xl">
      <Card className="glass-card">
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
              {payment.amountKes != null && <div>Charged {kes(payment.amountKes)}</div>}
              {payment.afrinetTransactionCode && (
                <div className="font-mono text-xs text-muted-foreground">{payment.afrinetTransactionCode}</div>
              )}
              {payment.mpesaReceipt && <div>M-Pesa receipt {payment.mpesaReceipt}</div>}
              {payment.failureMessage && <p className="text-destructive">{payment.failureMessage}</p>}
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
          {payment?.status === "pending" && (
            <Button asChild>
              <Link to={`/donate/awaiting/${payment.id}`}>Awaiting confirmation</Link>
            </Button>
          )}
          {payment?.status === "failed" && (
            <div className="space-y-3">
              <MpesaPhoneField value={phoneNumber} onChange={setPhoneNumber} disabled={retrying} />
              <Button
                disabled={retrying || !phoneNumber.trim()}
                onClick={async () => {
                  if (!looksLikeMpesaPhone(phoneNumber)) {
                    toast.error("Enter a Kenyan M-Pesa number (07… or 2547…).");
                    return;
                  }
                  setRetrying(true);
                  try {
                    const result = await retryDonationCheckout(donation.id, phoneNumber);
                    redirectToCheckout(result.checkoutUrl, navigate);
                  } catch (err) {
                    toast.error(apiErrorMessage(err));
                    setRetrying(false);
                  }
                }}
              >
                {retrying ? "Sending M-Pesa prompt…" : "Try M-Pesa again"}
              </Button>
            </div>
          )}
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </TouristPage>
  );
}
