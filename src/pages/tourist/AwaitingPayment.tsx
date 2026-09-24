import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { redirectToCheckout } from "@/lib/checkout";
import { looksLikeMpesaPhone } from "@/lib/mpesa";
import { kes, usd } from "@/lib/format";
import type { CheckoutMethod, Payment } from "@/types/otot";
import {
  CheckoutMethodFields,
  checkoutActionLabel,
  checkoutMethodFromMode,
  checkoutReady,
} from "@/components/shared/CheckoutMethodFields";
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
  const [method, setMethod] = useState<CheckoutMethod>("mpesa");
  const [phoneNumber, setPhoneNumber] = useState("");
  const ticks = useRef(0);
  const seededMethod = useRef(false);

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
        if (!seededMethod.current) {
          setMethod(checkoutMethodFromMode(next.paymentMode));
          seededMethod.current = true;
        }
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

  const card = payment?.paymentMode === "Card";

  const retry = async () => {
    if (!payment) return;
    if (method === "mpesa" && !looksLikeMpesaPhone(phoneNumber)) {
      toast.error("Enter a Kenyan M-Pesa number (07… or 2547…).");
      return;
    }
    setRetrying(true);
    try {
      const result = await retryDonationCheckout(payment.donationId, {
        paymentMethod: method,
        phoneNumber: method === "mpesa" ? phoneNumber : undefined,
      });
      redirectToCheckout(result.checkoutUrl, navigate);
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setRetrying(false);
    }
  };

  return (
    <TouristPage
      title="Awaiting confirmation"
      subtitle={card ? "Finish card checkout, then wait here for confirmation." : "Approve the M-Pesa prompt on your phone."}
      className="max-w-xl"
      purchase
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{payment ? usd(payment.amount) : "Confirming…"}</CardTitle>
          <CardDescription>
            {cancelled
              ? card
                ? "If you cancelled card checkout, you can try again or pay with M-Pesa. If you paid, stay on this page."
                : "If you cancelled the M-Pesa prompt, you can send another one. If you paid, stay on this page."
              : card
                ? "This page updates when the card payment is confirmed."
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
            <p className="text-muted-foreground">
              {card ? "Waiting for the card payment to complete…" : "Waiting for you to approve the M-Pesa prompt…"}
            </p>
          )}
          {payment?.status === "failed" && (
            <div className="space-y-3">
              <CheckoutMethodFields
                method={method}
                onMethodChange={setMethod}
                phoneNumber={phoneNumber}
                onPhoneNumberChange={setPhoneNumber}
                disabled={retrying}
                phoneId="retry-mpesa-phone"
              />
              <Button onClick={() => void retry()} disabled={retrying || !checkoutReady(method, phoneNumber)}>
                {checkoutActionLabel(method, { busy: retrying, retry: true })}
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
