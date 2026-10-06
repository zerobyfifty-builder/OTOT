import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { checkoutActionLabel, checkoutMethodFromMode, checkoutReady, redirectToCheckout } from "@/lib/checkout";
import { looksLikeMpesaPhone } from "@/lib/mpesa";
import { kes, usd } from "@/lib/format";
import { offsetTripState } from "@/lib/trips";
import type { CheckoutMethod, Payment, PaymentStatus } from "@/types/otot";
import { CheckoutMethodFields } from "@/components/shared/CheckoutMethodFields";
import { SimulatePaymentButton } from "@/components/shared/SimulatePaymentButton";
import { TouristPage } from "@/components/layout/TouristPage";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const POLL_FIRST_MS = 2_000;
const POLL_MAX_MS = 10_000;
const POLL_LIMIT_MS = 10 * 60_000;
/** After this long a still-pending payment may have stalled; offer another try. */
const OFFER_RETRY_AFTER_MS = 2 * 60_000;

const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Waiting for confirmation",
  success: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export default function AwaitingPayment() {
  const { paymentId } = useParams();
  const [params] = useSearchParams();
  const cancelled = params.get("cancelled") === "1";
  const navigate = useNavigate();
  const { state, getPayment, syncPayment, simulatePaymentSuccess, retryDonationCheckout, cancelPayment, refresh } =
    useStore();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [checkRun, setCheckRun] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [method, setMethod] = useState<CheckoutMethod>("mpesa");
  const [phoneNumber, setPhoneNumber] = useState("");
  const seededMethod = useRef(false);
  const cancelSentFor = useRef<string | null>(null);

  // A retry lands on a new payment id: start that one from a clean slate.
  useEffect(() => {
    seededMethod.current = false;
    setPayment(null);
    setError(null);
    setRetryError(null);
    setRetrying(false);
    setSimulating(false);
    setTimedOut(false);
  }, [paymentId]);

  useEffect(() => {
    if (!paymentId) return;
    let alive = true;
    let timer: number | undefined;
    let inFlight = false;
    let pausedWhileHidden = false;
    let delay = POLL_FIRST_MS;
    let ticks = 0;
    const startedAt = Date.now();
    setTimedOut(false);

    const schedule = () => {
      if (!alive) return;
      if (Date.now() - startedAt >= POLL_LIMIT_MS) {
        setTimedOut(true);
        return;
      }
      timer = window.setTimeout(() => void tick(), delay);
      delay = Math.min(POLL_MAX_MS, Math.round(delay * 1.5));
    };

    const tick = async () => {
      if (!alive || inFlight) return;
      if (document.hidden) {
        // Resume from the visibility listener instead of polling a background tab.
        pausedWhileHidden = true;
        return;
      }
      inFlight = true;
      try {
        ticks += 1;
        // Ask Afrinet directly now and then; the webhook usually gets there first.
        const next = ticks === 1 || ticks % 3 === 0 ? await syncPayment(paymentId) : await getPayment(paymentId);
        if (!alive) return;
        setPayment(next);
        setNow(Date.now());
        if (!seededMethod.current) {
          setMethod(checkoutMethodFromMode(next.paymentMode));
          seededMethod.current = true;
        }
        setError(null);
        if (next.status === "success") {
          await refresh().catch(() => undefined);
          if (!alive) return;
          toast.success("Payment successful");
          navigate(`/donations/${next.donationId}`, { replace: true });
          return;
        }
        if (next.status !== "pending") return;
      } catch (err) {
        if (!alive) return;
        setError(apiErrorMessage(err));
      } finally {
        inFlight = false;
      }
      schedule();
    };

    const onVisibility = () => {
      if (!document.hidden && pausedWhileHidden && alive) {
        pausedWhileHidden = false;
        delay = POLL_FIRST_MS;
        void tick();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const start = async () => {
      // Back from card checkout with ?cancelled=1: close that charge once, then show the retry form.
      if (cancelled && cancelSentFor.current !== paymentId) {
        cancelSentFor.current = paymentId;
        try {
          const closed = await cancelPayment(paymentId);
          if (!alive) return;
          setPayment(closed);
        } catch (err) {
          if (!alive) return;
          setError(apiErrorMessage(err));
        }
      }
      void tick();
    };
    void start();

    return () => {
      alive = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [cancelPayment, cancelled, checkRun, getPayment, navigate, paymentId, refresh, syncPayment]);

  if (!paymentId) {
    return (
      <TouristPage title="Payment">
        <p className="text-muted-foreground">Missing payment.</p>
      </TouristPage>
    );
  }

  const card = payment?.paymentMode === "Card";
  const donation = payment ? state.donations.find((d) => d.id === payment.donationId) : undefined;
  const trip = donation?.tripId ? state.trips.find((t) => t.id === donation.tripId) : undefined;
  const pendingLong =
    payment?.status === "pending" && now - new Date(payment.createdAt).getTime() >= OFFER_RETRY_AFTER_MS;
  const showRetry = payment?.status === "failed" || pendingLong;

  const retry = async () => {
    if (!payment) return;
    if (method === "mpesa" && !looksLikeMpesaPhone(phoneNumber)) {
      toast.error("Enter a Kenyan M-Pesa number (07… or 2547…).");
      return;
    }
    setRetrying(true);
    setRetryError(null);
    try {
      const result = await retryDonationCheckout(payment.donationId, {
        paymentMethod: method,
        phoneNumber: method === "mpesa" ? phoneNumber : undefined,
      });
      redirectToCheckout(result.checkoutUrl, navigate);
    } catch (err) {
      // 409 payment_pending carries the reason the previous charge is still open.
      setRetryError(apiErrorMessage(err));
      setRetrying(false);
    }
  };

  const markPaid = async () => {
    if (!paymentId) return;
    setSimulating(true);
    try {
      const next = await simulatePaymentSuccess(paymentId);
      await refresh().catch(() => undefined);
      toast.success("Payment marked as done");
      navigate(`/donations/${next.donationId}`, { replace: true });
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setSimulating(false);
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
            {cancelled && card
              ? "You cancelled card checkout. Try the card again, or pay with M-Pesa instead."
              : card
                ? "This page updates when the card payment is confirmed."
                : "This page updates when M-Pesa confirms the payment."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {payment && (
            <div className="space-y-1">
              <div>
                Status: <StatusBadge status={payment.status} label={STATUS_LABELS[payment.status]} />
              </div>
              {payment.amountKes != null && <div>Charged {kes(payment.amountKes)}</div>}
              {payment.afrinetTransactionCode && (
                <div className="font-mono text-xs text-muted-foreground">{payment.afrinetTransactionCode}</div>
              )}
              {payment.failureMessage && <div className="text-destructive">{payment.failureMessage}</div>}
            </div>
          )}
          {error && <div className="text-destructive">{error}</div>}
          {payment?.status === "pending" && (
            <div className="space-y-3">
              <div className="text-muted-foreground">
                {timedOut
                  ? "We haven't had a confirmation after 10 minutes. If you approved the payment, check again in a moment. A payment that never confirms is marked failed after an hour."
                  : card
                    ? "Waiting for the card payment to complete…"
                    : "Waiting for you to approve the M-Pesa prompt…"}
              </div>
              <div className="flex flex-wrap gap-3">
                {timedOut && (
                  <Button variant="outline" onClick={() => setCheckRun((n) => n + 1)}>
                    Check again
                  </Button>
                )}
                <SimulatePaymentButton disabled={simulating} busy={simulating} onClick={() => void markPaid()} />
              </div>
            </div>
          )}
          {showRetry && (
            <div className="space-y-3">
              {pendingLong && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
                  Still waiting? If you already approved the prompt, wait — don't pay twice. Otherwise you can send a new
                  payment below.
                </div>
              )}
              <CheckoutMethodFields
                method={method}
                onMethodChange={setMethod}
                phoneNumber={phoneNumber}
                onPhoneNumberChange={setPhoneNumber}
                disabled={retrying || simulating}
                phoneId="retry-mpesa-phone"
                extra={
                  payment?.status === "failed" ? (
                    <SimulatePaymentButton disabled={simulating} busy={simulating} onClick={() => void markPaid()} />
                  ) : undefined
                }
              />
              {retryError && (
                <div role="alert" className="text-destructive">
                  {retryError}
                </div>
              )}
              <Button onClick={() => void retry()} disabled={retrying || simulating || !checkoutReady(method, phoneNumber)}>
                {checkoutActionLabel(method, { busy: retrying, retry: true })}
              </Button>
            </div>
          )}
          <Button asChild variant="outline">
            {/* A failed trip payment must stay linked to its trip, or the new donation won't offset it. */}
            <Link to="/donate" state={trip ? offsetTripState(trip, state.donations) : undefined}>
              Back to donate
            </Link>
          </Button>
        </CardContent>
      </Card>
    </TouristPage>
  );
}
