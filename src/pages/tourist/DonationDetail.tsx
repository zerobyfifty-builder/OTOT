import { useEffect, useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Check, ClipboardList, Handshake, MapPin, Plane, Sprout, TreePine, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { redirectToCheckout } from "@/lib/checkout";
import { looksLikeMpesaPhone } from "@/lib/mpesa";
import { kg, kes, shortDate, treeCount, usd } from "@/lib/format";
import { airportCity } from "@/lib/trips";
import { PLANTED_HERE, toTouristStage } from "@/lib/treeStages";
import { cn } from "@/lib/utils";
import type { AllocationStatus, CheckoutMethod, PaymentAllocation, RecipientType } from "@/types/otot";
import {
  CheckoutMethodFields,
  checkoutActionLabel,
  checkoutMethodFromMode,
  checkoutReady,
} from "@/components/shared/CheckoutMethodFields";
import { SimulatePaymentButton } from "@/components/shared/SimulatePaymentButton";
import { TouristPage } from "@/components/layout/TouristPage";
import { Button } from "@/components/ui/button";
import treeSilhouette from "@/assets/tree-green-cropped.png";
import "@/styles/donation-ticket.css";

/** How far the stub tree has grown at each point of the journey (0 = unpaid … 5 = planted). */
const GROWTH = [0.06, 0.24, 0.42, 0.62, 0.82, 1];

const PAYOUT_LABELS: Record<AllocationStatus, string> = {
  pending: "Queued for payout",
  initiated: "Paying out",
  in_progress: "Paying out",
  transferred: "Paid out",
  failed: "Payout retrying",
};

export default function DonationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { state, retryDonationCheckout, simulatePaymentSuccess } = useStore();
  const [retrying, setRetrying] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [method, setMethod] = useState<CheckoutMethod | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [grown, setGrown] = useState(false);
  const donation = state.donations.find((d) => d.id === id);
  const payment = state.payments
    .filter((p) => p.donationId === id)
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
  const request = state.plantationRequests.find((r) => r.donationIds.includes(id ?? ""));
  const retryMethod = method ?? checkoutMethodFromMode(payment?.paymentMode);

  useEffect(() => {
    // Let the bare silhouette paint first, then grow it to the current stage.
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!donation || (session?.role === "tourist" && donation.userId !== session.userId)) {
    return (
      <TouristPage title="Donation">
        <p className="text-muted-foreground">Donation not found.</p>
      </TouristPage>
    );
  }

  const trip = donation.tripId ? state.trips.find((t) => t.id === donation.tripId) : undefined;
  const partner = request?.partnerId ? state.vendors.find((v) => v.id === request.partnerId) : undefined;
  const allocations = payment ? state.paymentAllocations.filter((a) => a.paymentId === payment.id) : [];
  const trees = treeCount(donation.trees);
  const paid = donation.status === "paid";
  const stage = toTouristStage(request?.status);
  const reached = !paid ? 0 : !request ? 1 : { waiting: 2, assigned: 3, scheduled: 4, planted: 5 }[stage];

  const headline = !paid
    ? payment?.status === "failed"
      ? "Payment didn't go through"
      : "Waiting for your payment"
    : { waiting: "Waiting for a planting partner", assigned: "A partner has your trees", scheduled: "Planting is underway", planted: "Your trees are in the ground" }[stage];

  const markPaid = async () => {
    if (!payment) return;
    setSimulating(true);
    try {
      await simulatePaymentSuccess(payment.id);
      toast.success("Payment marked as done");
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setSimulating(false);
    }
  };

  const retry = async () => {
    if (retryMethod === "mpesa" && !looksLikeMpesaPhone(phoneNumber)) {
      toast.error("Enter a Kenyan M-Pesa number (07… or 2547…).");
      return;
    }
    setRetrying(true);
    try {
      const result = await retryDonationCheckout(donation.id, {
        paymentMethod: retryMethod,
        phoneNumber: retryMethod === "mpesa" ? phoneNumber : undefined,
      });
      redirectToCheckout(result.checkoutUrl, navigate);
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setRetrying(false);
    }
  };

  const steps = [
    {
      icon: Wallet,
      title: "Paid",
      detail: paid
        ? `${payment?.paymentMode ?? "Payment"} · ${shortDate(request?.createdAt ?? payment?.createdAt ?? donation.createdAt)}`
        : "Confirm your payment to start the journey.",
    },
    {
      icon: ClipboardList,
      title: "Planting request raised",
      detail: request ? `Queued on ${shortDate(request.createdAt)}` : "Raised as soon as payment clears.",
    },
    {
      icon: Handshake,
      title: "Partner assigned",
      detail: partner ? `${partner.name}, ${partner.region}` : "The ministry picks a community planting partner.",
    },
    {
      icon: Sprout,
      title: "Planting underway",
      detail: "Seedlings are raised and carried to the site.",
    },
    {
      icon: TreePine,
      title: "In the ground",
      detail: `Planted at ${PLANTED_HERE}.`,
    },
  ];

  return (
    <TouristPage title="Your trees" subtitle={`Donation of ${shortDate(donation.createdAt)}`} className="max-w-5xl">
      <div className="donation-page space-y-6 sm:space-y-8">
        <section className="donation-ticket" aria-label="Donation summary">
          <div className="donation-ticket__main flex flex-col gap-7">
            <div>
              <h2 className="dt-title font-bold text-balance">
                {trees} {trees === 1 ? "tree" : "trees"} for {PLANTED_HERE.replace(" Complex", "")}
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Tree mix">
                {donation.trees.map((t) => (
                  <li
                    key={t.treeTypeId}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(96_55%_90%)] px-3 py-1 text-sm font-medium text-[hsl(150_45%_20%)]"
                  >
                    <TreePine className="h-3.5 w-3.5" aria-hidden />
                    {t.count} × {t.treeType}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-5">
              <div className="min-w-0">
                <div className="text-xs text-[var(--dt-ink-muted)]">From</div>
                <div className="mt-1 flex items-start gap-2 font-semibold">
                  <Plane className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(150_62%_32%)]" aria-hidden />
                  <div className="min-w-0">
                    {trip ? `${airportCity(trip.originAirport)} → ${airportCity(trip.destinationAirport)}` : "Direct gift"}
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex items-center text-[hsl(110_20%_70%)]" aria-hidden>
                <div className="h-px w-10 border-t-2 border-dotted border-current" />
                <ArrowRight className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-[var(--dt-ink-muted)]">To</div>
                <div className="mt-1 flex items-start gap-2 font-semibold">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(150_62%_32%)]" aria-hidden />
                  <div className="min-w-0">{PLANTED_HERE}</div>
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 border-t border-dashed border-[hsl(110_25%_80%)] pt-5">
              <div>
                <dt className="text-xs text-[var(--dt-ink-muted)]">Carbon offset</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">{kg(donation.carbonOffsetKg)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--dt-ink-muted)]">Contribution</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {usd(donation.amount)}
                  {payment?.amountKes != null && (
                    <small className="ml-2 text-sm font-normal text-[var(--dt-ink-muted)]">{kes(payment.amountKes)}</small>
                  )}
                </dd>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <dt className="text-xs text-[var(--dt-ink-muted)]">Offsets</dt>
                <dd className="mt-1 text-xl font-semibold">
                  {trip ? (
                    <Link to="/my-trips" className="underline decoration-[hsl(96_55%_55%)] decoration-2 underline-offset-4 hover:decoration-[hsl(150_62%_32%)]">
                      {trip.friendlyTripId}
                    </Link>
                  ) : (
                    "No trip linked"
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="donation-ticket__stub flex flex-col justify-between gap-6">
            <div>
              <div className="text-xl font-semibold leading-snug text-balance">{headline}</div>
              <div className="mt-1.5 text-sm text-[hsl(96_45%_80%)]">
                {paid ? `${reached} of 5 steps done` : "The journey starts once you pay"}
              </div>
            </div>
            <div
              className="donation-tree mx-auto max-w-[15rem]"
              style={{ "--dt-tree": `url(${treeSilhouette})`, "--dt-grow": grown ? GROWTH[reached] : 0 } as CSSProperties}
              role="img"
              aria-label={`Tree progress: ${headline}`}
            >
              <div className="donation-tree__fill" />
            </div>
          </div>
        </section>

        {payment?.status === "pending" && (
          <section className="donation-panel p-6 sm:p-8 space-y-4">
            <h2 className="dt-h font-semibold">Finish your payment</h2>
            <div className="text-sm text-[var(--dt-ink-muted)]">
              {payment.paymentMode === "Card"
                ? "Complete card checkout and this page updates once it's confirmed."
                : "Approve the M-Pesa prompt on your phone and this page updates once it's confirmed."}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to={`/donate/awaiting/${payment.id}`}>Awaiting confirmation</Link>
              </Button>
              <SimulatePaymentButton disabled={simulating} busy={simulating} onClick={() => void markPaid()} />
            </div>
          </section>
        )}

        {payment?.status === "failed" && (
          <section className="donation-panel p-6 sm:p-8 space-y-4">
            <h2 className="dt-h font-semibold">Try the payment again</h2>
            {payment.failureMessage && <div className="text-sm text-destructive">{payment.failureMessage}</div>}
            <CheckoutMethodFields
              method={retryMethod}
              onMethodChange={setMethod}
              phoneNumber={phoneNumber}
              onPhoneNumberChange={setPhoneNumber}
              disabled={retrying || simulating}
              phoneId="donation-retry-mpesa-phone"
              extra={<SimulatePaymentButton disabled={simulating} busy={simulating} onClick={() => void markPaid()} />}
            />
            <Button disabled={retrying || simulating || !checkoutReady(retryMethod, phoneNumber)} onClick={() => void retry()}>
              {checkoutActionLabel(retryMethod, { busy: retrying, retry: true })}
            </Button>
          </section>
        )}

        <section className="donation-panel p-6 sm:p-8" aria-labelledby="journey-heading">
          <h2 id="journey-heading" className="dt-h font-semibold">
            From payment to planted
          </h2>
          <ol className="mt-6 grid gap-0 md:grid-cols-5 md:gap-4">
            {steps.map((step, index) => {
              const done = index < reached;
              const current = index === reached;
              const Icon = done ? Check : step.icon;
              return (
                <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0 md:flex-col md:gap-3 md:pb-0">
                  {index < steps.length - 1 && (
                    <div
                      aria-hidden
                      className={cn(
                        "absolute left-[1.0625rem] top-10 bottom-0 w-0.5 md:left-11 md:right-[-0.75rem] md:top-[1.0625rem] md:bottom-auto md:h-0.5 md:w-auto",
                        done ? "bg-[hsl(150_62%_32%)]" : "bg-[hsl(110_20%_86%)]",
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      "donation-step__dot relative",
                      done && "bg-[hsl(150_62%_32%)] text-white",
                      current && "bg-[hsl(96_62%_86%)] text-[hsl(150_62%_24%)] ring-4 ring-[hsl(96_62%_62%/0.35)]",
                      !done && !current && "bg-[hsl(110_20%_93%)] text-[hsl(140_10%_50%)]",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <div className={cn("font-semibold", !done && !current && "text-[hsl(140_10%_45%)]")}>
                      {step.title}
                      {current && <small className="ml-2 text-xs font-medium text-[hsl(150_62%_30%)]">Up next</small>}
                    </div>
                    <div className="mt-1 text-sm leading-relaxed text-[var(--dt-ink-muted)]">{step.detail}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {payment && (
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1.4fr_1fr]">
            <MoneySplit amount={payment.amount} split={payment.transactionChargesSplit} allocations={allocations} />

            <section className="donation-panel p-6 sm:p-8" aria-labelledby="payment-heading">
              <h2 id="payment-heading" className="dt-h font-semibold">
                Payment
              </h2>
              <dl className="mt-5 space-y-4 text-sm">
                <Row label="Method" value={payment.paymentMode} />
                <Row
                  label="Status"
                  value={{ success: "Confirmed", pending: "Waiting for confirmation", failed: "Failed" }[payment.status]}
                />
                {payment.amountKes != null && <Row label="Charged" value={kes(payment.amountKes)} />}
                {payment.mpesaReceipt && <Row label="M-Pesa receipt" value={payment.mpesaReceipt} mono />}
                {payment.afrinetTransactionCode && <Row label="Transaction" value={payment.afrinetTransactionCode} mono />}
                {payment.externalReference && <Row label="Reference" value={payment.externalReference} mono />}
              </dl>
            </section>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/my-trees">See all my trees</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </TouristPage>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[hsl(110_25%_90%)] pb-3 last:border-0 last:pb-0">
      <dt className="text-[var(--dt-ink-muted)]">{label}</dt>
      <dd className={cn("text-right font-medium break-all", mono && "font-mono text-[0.8125rem] tracking-tight")}>{value}</dd>
    </div>
  );
}

const SHARES: { key: "plantation" | "ministry" | "platform" | "processor"; recipient?: RecipientType; label: string; note: string; color: string }[] = [
  { key: "plantation", recipient: "partner", label: "Planting partner", note: "Seedlings, planting and care", color: "hsl(150 62% 30%)" },
  { key: "ministry", recipient: "ministry", label: "Ministry", note: "Site oversight and verification", color: "hsl(178 48% 36%)" },
  { key: "platform", recipient: "otot", label: "OTOT", note: "Running One Tourist One Tree", color: "hsl(96 52% 52%)" },
  { key: "processor", label: "Afrinet fee", note: "Payment processing", color: "hsl(40 75% 55%)" },
];

function MoneySplit({
  amount,
  split,
  allocations,
}: {
  amount: number;
  split: Record<(typeof SHARES)[number]["key"], number>;
  allocations: PaymentAllocation[];
}) {
  const total = SHARES.reduce((sum, s) => sum + split[s.key], 0) || amount || 1;
  return (
    <section className="donation-panel p-6 sm:p-8" aria-labelledby="split-heading">
      <h2 id="split-heading" className="dt-h font-semibold">
        Where your {usd(amount)} goes
      </h2>
      <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-[hsl(110_20%_92%)]" aria-hidden>
        {SHARES.filter((s) => split[s.key] > 0).map((s) => (
          <div
            key={s.key}
            style={{ width: `${(split[s.key] / total) * 100}%`, background: s.color }}
            className="h-full border-r-2 border-[var(--dt-paper)] last:border-r-0"
          />
        ))}
      </div>
      <ul className="mt-6 space-y-4">
        {SHARES.map((s) => {
          const allocation = s.recipient ? allocations.find((a) => a.recipientType === s.recipient) : undefined;
          return (
            <li key={s.key} className="flex items-start gap-3">
              <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{s.label}</div>
                <div className="text-sm text-[var(--dt-ink-muted)]">{s.note}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold tabular-nums">{usd(split[s.key])}</div>
                {allocation && (
                  <div className="text-xs tabular-nums text-[var(--dt-ink-muted)]">
                    {kes(allocation.amountKes)} · {PAYOUT_LABELS[allocation.status]}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
