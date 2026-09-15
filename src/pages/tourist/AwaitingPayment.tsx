import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { redirectToCheckout } from "@/lib/checkout";
import { looksLikeMpesaPhone } from "@/lib/mpesa";
import { kes, usd } from "@/lib/format";
import type { Payment } from "@/types/otot";
import { TouristPage } from "@/components/layout/TouristPage";
import { MpesaPhoneField } from "@/components/shared/MpesaPhoneField";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AwaitingPayment() {
  const { paymentId } = useParams();
  const [params] = useSearchParams();
  const cancelled = params.get("cancelled") === "1";
  const navigate = useNavigate();
  const { getPayment, syncPayment, retryDonationCheckout, refresh } = useStore();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const ticks = useRef(0);

  useEffect(() => {
    if (!paymentId) return;
    let alive = true;
    let id = 0;
    const tick = async () => {
      try {
        ticks.current += 1;
        const next =
          ticks.current === 1 || ticks.current % 3 === 0
            ? await syncPayment(paymentId)
            : await getPayment(paymentId);
        if (!alive) return;
        setPayment(next);
        setError(null);
        if (next.status === "success") {
          window.clearInterval(id);
          await refresh();
          toast.success("Payment successful");
          navigate(`/donations/${next.donationId}`, { replace: true });
          return;
        }
        if (next.status === "failed") window.clearInterval(id);
      } catch (err) {
        if (!alive) return;
        setError(apiErrorMessage(err));
      }
    };
    void tick();
    id = window.setInterval(() => void tick(), 2000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [getPayment, navigate, paymentId, refresh, syncPayment]);

  if (!paymentId) {
    return (
      <TouristPage title="Payment">
        <p className="text-muted-foreground">Missing payment.</p>
      </TouristPage>
    );
  }

  const retry = async () => {
    if (!payment) return;
    if (!looksLikeMpesaPhone(phoneNumber)) {
      toast.error("Enter a Kenyan M-Pesa number (07… or 2547…).");
      return;
    }
    setRetrying(true);
    try {
      const result = await retryDonationCheckout(payment.donationId, phoneNumber);
      redirectToCheckout(result.checkoutUrl, navigate);
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setRetrying(false);
    }
  };

  return (
    <TouristPage title="Awaiting confirmation" subtitle="Approve the M-Pesa prompt on your phone." className="max-w-xl" purchase>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{payment ? usd(payment.amount) : "Confirming…"}</CardTitle>
          <CardDescription>
            {cancelled
              ? "If you cancelled the M-Pesa prompt, you can send another one. If you paid, stay on this page."
              : "This page updates when M-Pesa confirms the payment."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {payment && (
            <div className="space-y-1">
              <div>
                Status: <StatusBadge status={payment.status} />
              </div>
              {payment.amountKes != null && <div>Charged {kes(payment.amountKes)}</div>}
              {payment.afrinetTransactionCode && (
                <div className="font-mono text-xs text-muted-foreground">{payment.afrinetTransactionCode}</div>
              )}
              {payment.failureMessage && <p className="text-destructive">{payment.failureMessage}</p>}
            </div>
          )}
          {error && <p className="text-destructive">{error}</p>}
          {payment?.status === "pending" && (
            <p className="text-muted-foreground">Waiting for you to approve the M-Pesa prompt…</p>
          )}
          {payment?.status === "failed" && (
            <div className="space-y-3">
              <MpesaPhoneField value={phoneNumber} onChange={setPhoneNumber} disabled={retrying} />
              <Button onClick={() => void retry()} disabled={retrying || !phoneNumber.trim()}>
                {retrying ? "Sending M-Pesa prompt…" : "Try M-Pesa again"}
              </Button>
            </div>
          )}
          <Button asChild variant="outline">
            <Link to="/donate">Back to donate</Link>
          </Button>
        </CardContent>
      </Card>
    </TouristPage>
  );
}
