import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { redirectToCheckout } from "@/lib/checkout";
import { kes, usd } from "@/lib/format";
import type { Payment } from "@/types/otot";
import { TouristPage } from "@/components/layout/TouristPage";
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
    setRetrying(true);
    try {
      const result = await retryDonationCheckout(payment.donationId);
      redirectToCheckout(result.checkoutUrl, navigate);
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setRetrying(false);
    }
  };

  return (
    <TouristPage title="Awaiting confirmation" subtitle="Afrinet is confirming your payment." className="max-w-xl" purchase>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{payment ? usd(payment.amount) : "Confirming…"}</CardTitle>
          <CardDescription>
            {cancelled
              ? "If you cancelled on Afrinet, you can try again. If you paid, stay on this page."
              : "You can close Afrinet. This page updates when the webhook settles."}
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
          {payment?.status === "pending" && <p className="text-muted-foreground">Waiting for Afrinet…</p>}
          {payment?.status === "failed" && (
            <Button onClick={() => void retry()} disabled={retrying}>
              Try again
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/donate">Back to donate</Link>
          </Button>
        </CardContent>
      </Card>
    </TouristPage>
  );
}
