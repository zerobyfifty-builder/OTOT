import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, CircleDollarSign, Clock, Leaf, Minus, Plus, Trees } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { scoreMix, suggestTreeMix } from "@/lib/treeMix";
import { apiErrorMessage } from "@/lib/api";
import { checkoutActionLabel, redirectToCheckout } from "@/lib/checkout";
import { splitCharges, usdToKes } from "@/lib/charges";
import { nid } from "@/lib/ids";
import { looksLikeMpesaPhone } from "@/lib/mpesa";
import { kes, kg, treeCount, usd } from "@/lib/format";
import {
  carbonOffsetForTrip,
  offsetStatus,
  pendingDonationsForTrip,
  remainingCarbonKg,
  tripRouteLabel,
} from "@/lib/trips";
import { PLANTED_HERE } from "@/lib/treeStages";
import type { CheckoutMethod, TreeLine } from "@/types/otot";
import { MpesaPhoneField } from "@/components/shared/MpesaPhoneField";
import { SimulatePaymentButton } from "@/components/shared/SimulatePaymentButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import mauForestImage from "@/assets/mau-forest-complex.jpg";

type PurchaseOption = "flexible" | "mix";

/** Router state from My Trips, My Trees, the calculator or a failed payment. */
type IncomingState = { carbonOffsetKg?: number; trees?: TreeLine[]; treesNeeded?: number; tripId?: string };

const PAYMENT_METHODS: { value: CheckoutMethod; label: string }[] = [
  { value: "card", label: "Card" },
  { value: "mpesa", label: "M-Pesa" },
];

const MAX_DIRECT_TREES = 1000;

function scaleMix(base: TreeLine[], target: number): TreeLine[] {
  const total = treeCount(base);
  if (total === 0 || target <= 0) return [];
  const shares = base.map((row) => {
    const exact = (row.count * target) / total;
    return { row, count: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let missing = target - shares.reduce((sum, s) => sum + s.count, 0);
  [...shares]
    .sort((a, b) => b.rest - a.rest)
    .forEach((s) => {
      if (missing > 0) {
        s.count += 1;
        missing -= 1;
      }
    });
  return shares.filter((s) => s.count > 0).map((s) => ({ ...s.row, count: s.count }));
}

const roundKg = (value: number) => Math.round(value * 100) / 100;

export default function Donate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const { state, quoteTreeMix, checkoutDonation, simulateDonationPayment } = useStore();
  const incoming = location.state as IncomingState | undefined;
  const tripId = incoming?.tripId;
  const isTrip = Boolean(tripId);
  const trip = tripId ? state.trips.find((t) => t.id === tripId) : undefined;
  const { settings } = state;

  // Trip figures come from the store; router state can be stale after another payment.
  const tripRemainingKg = roundKg(trip ? remainingCarbonKg(trip, state.donations) : incoming?.carbonOffsetKg ?? 0);
  const tripOffsetKg = trip ? carbonOffsetForTrip(trip.id, state.donations) : 0;
  const fullyOffset = trip ? offsetStatus(trip, state.donations) === "fully" : false;
  const pendingForTrip = trip
    ? pendingDonationsForTrip(trip.id, state.donations, state.payments)
        .slice()
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    : [];

  // A direct donation starts from one tree's worth; a trip from its remaining CO₂.
  const seedMix = (targetKg: number) => suggestTreeMix(isTrip ? targetKg : 1, state.treeTypes).trees;

  const [targetKg, setTargetKg] = useState(tripRemainingKg);
  const [baseMix, setBaseMix] = useState<TreeLine[]>(() => seedMix(tripRemainingKg));
  const [trees, setTrees] = useState<TreeLine[]>(baseMix);
  const [option, setOption] = useState<PurchaseOption>("flexible");
  const [method, setMethod] = useState<CheckoutMethod>("card");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);
  // One id per Pay attempt, so a double click or retry returns the same donation.
  const attempt = useRef<{ key: string; id: string } | null>(null);

  useEffect(() => {
    // Re-seed when the trip's remaining CO₂ or the tree catalog changes.
    const next = suggestTreeMix(isTrip ? tripRemainingKg : 1, state.treeTypes).trees;
    setTargetKg(tripRemainingKg);
    setBaseMix(next);
    setTrees(next);
  }, [isTrip, tripRemainingKg, state.treeTypes]);

  const mix = useMemo(() => scoreMix(trees, state.treeTypes), [trees, state.treeTypes]);
  const baseCount = treeCount(baseMix);
  const committed = treeCount(mix.trees);
  const targetValid = Number.isFinite(targetKg) && targetKg > 0;

  const activeTypes = state.treeTypes.filter((t) => t.active);
  const uniqueCosts = [...new Set(activeTypes.map((t) => t.costPerTree))];
  const perTree = uniqueCosts.length === 1 ? uniqueCosts[0] : committed > 0 ? mix.amount / committed : 0;

  // CO₂ this donation is asked to offset. Fewer trees than suggested offset what they cover.
  const offsetForCheckout = !isTrip
    ? mix.offsetKg
    : option === "flexible"
      ? Math.min(targetKg, mix.offsetKg)
      : targetKg;
  const mixShort = isTrip && option === "mix" && targetValid && mix.offsetKg + 0.005 < targetKg;
  const phoneReady = method === "card" || looksLikeMpesaPhone(phoneNumber);
  const blocked = fullyOffset || committed === 0 || (isTrip && option === "mix" && !targetValid) || mixShort;
  const ready = !blocked && offsetForCheckout > 0 && phoneReady;

  const split = splitCharges(mix.amount, settings);
  const amountKes = usdToKes(mix.amount, settings.kesPerUsd);
  const totalFeePct = Number((settings.chargeFeePct + settings.payoutFeePct).toFixed(2));

  const tripTotalKg = trip?.totalCo2 ?? 0;
  const coveredPct =
    tripTotalKg > 0 ? Math.min(100, Math.round(((tripOffsetKg + (blocked ? 0 : offsetForCheckout)) / tripTotalKg) * 100)) : 0;
  const barColor = coveredPct <= 30 ? "bg-red-500" : coveredPct <= 70 ? "bg-yellow-500" : "bg-green-500";
  const sliderMax = Math.max(1, baseCount);

  const setFlexibleCount = (count: number) => setTrees(scaleMix(baseMix, count));

  const setCount = (typeId: string, count: number) => {
    setTrees((prev) => {
      const next = Math.max(0, count);
      if (!prev.some((r) => r.treeTypeId === typeId)) {
        const t = state.treeTypes.find((x) => x.id === typeId);
        if (!t || next === 0) return prev;
        return [...prev, { treeTypeId: t.id, treeType: t.name, count: next }];
      }
      return prev.map((row) => (row.treeTypeId === typeId ? { ...row, count: next } : row));
    });
  };

  const recalculate = async () => {
    if (!targetValid) return;
    let next: TreeLine[];
    try {
      next = (await quoteTreeMix(targetKg)).trees;
    } catch {
      next = suggestTreeMix(targetKg, state.treeTypes).trees;
    }
    setBaseMix(next);
    setTrees(next);
  };

  const requestIdFor = () => {
    const key = JSON.stringify([tripId, mix.trees, offsetForCheckout, method, method === "mpesa" ? phoneNumber : ""]);
    if (attempt.current?.key !== key) attempt.current = { key, id: nid() };
    return attempt.current.id;
  };

  const pay = async (pendingConfirmed = false) => {
    if (!session || !ready) return;
    if (pendingForTrip.length > 0 && !pendingConfirmed) {
      setConfirmPending(true);
      return;
    }
    setBusy(true);
    try {
      const result = await checkoutDonation({
        carbonOffsetKg: roundKg(offsetForCheckout),
        trees: mix.trees,
        tripId,
        paymentMethod: method,
        phoneNumber: method === "mpesa" ? phoneNumber : undefined,
        clientRequestId: requestIdFor(),
      });
      attempt.current = null;
      redirectToCheckout(result.checkoutUrl, navigate);
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setBusy(false);
    }
  };

  const markPaid = async () => {
    if (!session || blocked) return;
    setBusy(true);
    try {
      const result = await simulateDonationPayment({
        carbonOffsetKg: roundKg(offsetForCheckout),
        trees: mix.trees,
        tripId,
        paymentMethod: method,
      });
      toast.success("Payment marked as done");
      navigate(`/donations/${result.donation.id}`, { replace: true });
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setBusy(false);
    }
  };

  const blockedReason = (() => {
    if (committed === 0) return "Add at least one tree.";
    if (isTrip && option === "mix" && !targetValid) return "Enter a CO₂ target above 0 kg.";
    if (mixShort) return `Selected trees cover ${kg(mix.offsetKg)} of ${kg(targetKg)}. Add trees or lower the target.`;
    if (method === "mpesa" && phoneNumber.trim() && !looksLikeMpesaPhone(phoneNumber)) {
      return "Enter a Kenyan M-Pesa number (07… or 2547…).";
    }
    return null;
  })();

  const optionCardClass = (value: PurchaseOption) =>
    `transition-all duration-300 hover:shadow-lg ${option === value ? "ring-2 ring-primary shadow-lg scale-105" : ""}`;

  const stat = (label: string, value: string, tone: string) => (
    <div className="flex items-center gap-3">
      <div className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center ${tone}`}>
        <Leaf className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="tourist-dashboard-glass tree-purchase-glass min-h-screen">
      <div className="container max-w-5xl py-8">
        <div className="mb-8">
          <h1 className="tourist-page-heading text-2xl sm:text-4xl font-bold text-foreground mb-2">Plant Your Trees</h1>
          <p className="tourist-page-subheading text-sm sm:text-base text-muted-foreground mb-6">
            {isTrip
              ? `Offset ${trip ? `${trip.friendlyTripId} · ${tripRouteLabel(trip)}` : "your trip"}`
              : "A direct donation funds trees without linking them to a trip"}
          </p>

          <section className="glass-card glass-card--leafy relative py-8 px-4 sm:py-10 sm:px-6 md:py-12 md:px-8 rounded-2xl sm:rounded-3xl overflow-hidden">
            <div className="relative z-10">
              {isTrip ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {trip && stat("Trip CO₂", kg(trip.totalCo2), "bg-accent/20 text-accent")}
                    {trip && stat("Already offset", kg(tripOffsetKg), "bg-emerald-500/20 text-emerald-600")}
                    {stat("Left to offset", kg(tripRemainingKg), "bg-primary/20 text-primary")}
                    {stat("Trees in this order", String(fullyOffset ? 0 : committed), "bg-green-500/20 text-green-600")}
                  </div>
                  {trip && (
                    <div className="space-y-2 pt-4 border-t border-accent/20">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-green-600 font-medium">
                          {fullyOffset ? "Trip fully offset" : `Offset after this payment: ${coveredPct}%`}
                        </span>
                        <span className="text-muted-foreground">{kg(tripTotalKg)} total</span>
                      </div>
                      <div
                        className="relative w-full h-3 bg-muted rounded-full overflow-hidden"
                        role="progressbar"
                        aria-label="Trip CO₂ offset after this payment"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={coveredPct}
                      >
                        <div className={`h-full transition-all duration-300 ${barColor}`} style={{ width: `${coveredPct}%` }} />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {stat("Trees in this donation", String(committed), "bg-green-500/20 text-green-600")}
                  {stat("CO₂ these trees offset", kg(mix.offsetKg), "bg-accent/20 text-accent")}
                </div>
              )}
            </div>
          </section>
        </div>

        {pendingForTrip.length > 0 && !fullyOffset && (
          <div
            role="status"
            className="mb-8 flex flex-col gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                A payment for this trip is still open. If you already approved the M-Pesa prompt or paid by card, wait
                for it to confirm so you aren't charged twice.
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link to={`/donations/${pendingForTrip[0].id}`}>View pending payment</Link>
            </Button>
          </div>
        )}

        {fullyOffset ? (
          <Card className="mb-8">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">This trip is fully offset</h2>
              <p className="text-sm text-muted-foreground">
                The trees you've paid for cover all {kg(tripTotalKg)} of this trip's CO₂. There's nothing left to pay.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild variant="outline">
                  <Link to="/my-trips">Back to My Trips</Link>
                </Button>
                <Button onClick={() => navigate("/donate", { replace: true, state: null })}>Make a direct donation</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-6 mb-8">
              <h2 className="tourist-page-heading text-2xl font-semibold text-foreground">Choose Your Option</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className={optionCardClass("flexible")}>
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                      <Leaf className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">Flexible Tree Planting</CardTitle>
                    <CardDescription>
                      {isTrip ? "We suggest the trees; choose how many" : "Choose how many trees to fund"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center space-y-4">
                    <div className="py-4">
                      <p className="text-3xl font-bold text-primary">
                        {usd(option === "flexible" ? mix.amount : scoreMix(baseMix, state.treeTypes).amount)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        for {option === "flexible" ? committed : baseCount}{" "}
                        {(option === "flexible" ? committed : baseCount) === 1 ? "tree" : "trees"}
                      </p>
                    </div>

                    {option === "flexible" && isTrip && sliderMax > 1 && (
                      <div className="space-y-2">
                        <Label id="tree-count-label">Number of trees: {committed}</Label>
                        <Slider
                          value={[committed]}
                          onValueChange={(value) => setFlexibleCount(value[0])}
                          min={1}
                          max={sliderMax}
                          step={1}
                          aria-labelledby="tree-count-label"
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>1</span>
                          <span>{sliderMax} (covers the trip)</span>
                        </div>
                      </div>
                    )}

                    {option === "flexible" && !isTrip && (
                      <div className="space-y-2">
                        <Label htmlFor="direct-tree-count">Number of trees</Label>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-9 w-9"
                            aria-label="One tree fewer"
                            disabled={committed <= 1}
                            onClick={() => setFlexibleCount(Math.max(1, committed - 1))}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            id="direct-tree-count"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={MAX_DIRECT_TREES}
                            value={committed || ""}
                            onChange={(e) => {
                              const next = Math.floor(Number(e.target.value));
                              if (Number.isFinite(next)) setFlexibleCount(Math.min(MAX_DIRECT_TREES, Math.max(1, next)));
                            }}
                            className="w-20 text-center"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-9 w-9"
                            aria-label="One tree more"
                            disabled={committed >= MAX_DIRECT_TREES}
                            onClick={() => setFlexibleCount(Math.min(MAX_DIRECT_TREES, committed + 1))}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        {mix.trees.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {mix.trees.map((t) => `${t.count} × ${t.treeType}`).join(", ")} · offsets about {kg(mix.offsetKg)}
                          </p>
                        )}
                      </div>
                    )}

                    <Button
                      variant={option === "flexible" ? "default" : "outline"}
                      className="w-full"
                      aria-pressed={option === "flexible"}
                      onClick={() => {
                        if (option !== "flexible") setTrees(baseMix);
                        setOption("flexible");
                      }}
                    >
                      {option === "flexible" ? "Selected" : "Select"}
                    </Button>
                  </CardContent>
                </Card>

                <Card className={optionCardClass("mix")}>
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-4">
                      <Trees className="h-8 w-8 text-accent" />
                    </div>
                    <CardTitle className="text-xl">Choose Your Tree Mix</CardTitle>
                    <CardDescription>Pick species and counts yourself</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center space-y-4">
                    <div className="py-4">
                      <p className="text-3xl font-bold text-accent">{option === "mix" ? usd(mix.amount) : "Custom"}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option !== "mix"
                          ? `${activeTypes.length} native species available`
                          : isTrip
                            ? `offsets about ${kg(mix.offsetKg)} of ${targetValid ? kg(targetKg) : "—"}`
                            : `offsets about ${kg(mix.offsetKg)}`}
                      </p>
                    </div>

                    {option === "mix" && (
                      <div className="space-y-4 text-left">
                        {isTrip && (
                          <div className="space-y-2">
                            <Label htmlFor="co2">CO₂ to offset (kg)</Label>
                            <div className="flex gap-2">
                              <Input
                                id="co2"
                                type="number"
                                min={0}
                                step="any"
                                value={Number.isFinite(targetKg) ? targetKg : ""}
                                aria-invalid={!targetValid}
                                onChange={(e) => setTargetKg(e.target.value === "" ? Number.NaN : Number(e.target.value))}
                              />
                              <Button type="button" variant="outline" disabled={!targetValid} onClick={() => void recalculate()}>
                                Suggest trees
                              </Button>
                            </div>
                            {!targetValid && <div className="text-xs text-destructive">Enter a CO₂ target above 0 kg.</div>}
                          </div>
                        )}
                        {activeTypes.map((t) => {
                          const count = trees.find((r) => r.treeTypeId === t.id)?.count ?? 0;
                          return (
                            <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                              <div className="min-w-0">
                                <div className="font-medium truncate">{t.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {kg(t.offsetKg)} / tree · {usd(t.costPerTree)}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  aria-label={`One ${t.name} fewer`}
                                  disabled={count === 0}
                                  onClick={() => setCount(t.id, count - 1)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-6 text-center tabular-nums" aria-live="polite">
                                  {count}
                                </span>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  aria-label={`One ${t.name} more`}
                                  onClick={() => setCount(t.id, count + 1)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <Button
                      variant={option === "mix" ? "default" : "outline"}
                      className="w-full"
                      aria-pressed={option === "mix"}
                      onClick={() => setOption("mix")}
                    >
                      {option === "mix" ? "Selected" : "Select"}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="why-per-tree-info flex items-start gap-3 p-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <CircleDollarSign className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="why-per-tree-title font-semibold text-sm">
                    {uniqueCosts.length === 1 ? `Why ${usd(perTree)} per tree?` : "What does a tree cost?"}
                  </p>
                  <p className="why-per-tree-desc text-sm">
                    Your contribution covers seedling, planting labour, 3 years of aftercare, MRV/GPS geotagging and program
                    overhead as per the plantation partners and program administrator charges.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Card className="border-border/50 hover:shadow-md transition-shadow">
                <CardContent className="pt-6 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Trees className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Planted by</p>
                  <h3 className="text-lg font-bold text-foreground">Ministry-approved planting partners</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The Ministry of Environment, Climate Change & Forestry assigns every order to a community planting partner,
                    then verifies the planting. The work supports the Mau Forest Complex Integrated Conservation and Livelihood
                    Improvement Programme, a 10-year effort to restore over 317,000 hectares.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 hover:shadow-md transition-shadow overflow-hidden">
                <img src={mauForestImage} alt={`${PLANTED_HERE} reforestation site`} className="w-full h-32 object-cover" />
                <CardContent className="pt-4 text-center space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Planted here</p>
                  <h3 className="text-lg font-bold text-foreground">{PLANTED_HERE}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    A vital water tower and source of 12 major rivers feeding Lake Victoria, Lake Nakuru, and the Maasai
                    Mara-Serengeti. Every OTOT tree is planted here to restore this degraded landscape and regenerate the forest.
                  </p>
                  <Button asChild variant="link" size="sm" className="text-xs text-primary p-0 h-auto">
                    <a href="https://mfc-iclip.org/" target="_blank" rel="noopener noreferrer">
                      Know more →
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold text-foreground mb-1">Total Amount</h3>
                    <p className="text-sm text-muted-foreground">
                      {committed} {committed === 1 ? "tree" : "trees"} · {kg(mix.offsetKg)} CO₂
                      {mix.trees.length > 1 && ` · ${mix.trees.map((t) => `${t.count} × ${t.treeType}`).join(", ")}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-4xl font-bold text-primary">{usd(mix.amount)}</p>
                  </div>
                </div>

                {committed > 0 && (
                  <div className="mb-6 text-sm text-muted-foreground">
                    You'll be charged <strong className="font-semibold">{kes(amountKes)}</strong> ({usd(mix.amount)} at{" "}
                    {kes(settings.kesPerUsd)} per US dollar).
                  </div>
                )}

                <div className="mb-6 space-y-2">
                  <Label className="text-sm font-medium">Payment Method</Label>
                  <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                    {PAYMENT_METHODS.map(({ value, label }) => (
                      <button
                        type="button"
                        key={value}
                        aria-pressed={method === value}
                        disabled={busy}
                        onClick={() => setMethod(value)}
                        className={`flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors touch-manipulation select-none ${
                          method === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            method === value ? "border-primary" : "border-muted-foreground"
                          }`}
                        >
                          {method === value && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </span>
                        <span>{label}</span>
                      </button>
                    ))}
                    <SimulatePaymentButton
                      className="min-h-11"
                      disabled={busy || blocked}
                      busy={busy}
                      onClick={() => void markPaid()}
                    />
                  </div>
                  {method === "mpesa" && (
                    <div className="pt-2">
                      <MpesaPhoneField id="donate-mpesa-phone" value={phoneNumber} onChange={setPhoneNumber} disabled={busy} />
                    </div>
                  )}
                </div>

                {committed > 0 && (
                  <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                    <div>Planting partner (70% after fees) <span className="block font-medium text-foreground">{usd(split.plantation)}</span></div>
                    <div>Ministry (15% after fees) <span className="block font-medium text-foreground">{usd(split.ministry)}</span></div>
                    <div>OTOT (15% after fees) <span className="block font-medium text-foreground">{usd(split.platform)}</span></div>
                    <div>Afrinet fees ({totalFeePct}%) <span className="block font-medium text-foreground">{usd(split.processor)}</span></div>
                  </div>
                )}

                {blockedReason && (
                  <div role="status" className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {blockedReason}
                  </div>
                )}

                <Button size="lg" className="w-full text-lg" onClick={() => void pay()} disabled={busy || !ready}>
                  {checkoutActionLabel(method, { busy })}
                </Button>

                <p className="tree-purchase-payment-footnote text-center mt-4" style={{ color: "hsl(0 0% 45%)" }}>
                  {method === "card"
                    ? "Secure card payment on Afrinet's checkout page. We confirm the payment when you return."
                    : "Safaricom sends a payment prompt to your phone. We confirm the payment on the next screen."}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <AlertDialog open={confirmPending} onOpenChange={setConfirmPending}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start another payment for this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              A payment for this trip is still open. If you already approved the M-Pesa prompt or paid by card, wait for it
              to confirm. Paying again now could charge you twice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Wait</AlertDialogCancel>
            <AlertDialogAction onClick={() => void pay(true)}>Pay again</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
