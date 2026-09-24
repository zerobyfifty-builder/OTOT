import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CircleDollarSign, Leaf, Minus, Plus, Trees } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { scoreMix, suggestTreeMix } from "@/lib/treeMix";
import { apiErrorMessage } from "@/lib/api";
import { redirectToCheckout } from "@/lib/checkout";
import { splitCharges } from "@/lib/charges";
import { looksLikeMpesaPhone } from "@/lib/mpesa";
import { kg, treeCount, usd } from "@/lib/format";
import { treesPlantedForTrip } from "@/lib/trips";
import type { CheckoutMethod, TreeLine } from "@/types/otot";
import { MpesaPhoneField } from "@/components/shared/MpesaPhoneField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import mauForestImage from "@/assets/mau-forest-complex.jpg";

type PurchaseOption = "flexible" | "mix";

const PAYMENT_METHODS: { value: CheckoutMethod; label: string }[] = [
  { value: "card", label: "Card" },
  { value: "mpesa", label: "M-Pesa" },
];

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

export default function Donate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const { state, quoteTreeMix, checkoutDonation } = useStore();
  const incoming = location.state as
    | { carbonOffsetKg?: number; trees?: TreeLine[]; treesNeeded?: number; tripId?: string }
    | undefined;
  const tripId = incoming?.tripId;

  const [carbonOffsetKg, setCarbonOffsetKg] = useState(incoming?.carbonOffsetKg ?? 320);
  const [baseMix, setBaseMix] = useState<TreeLine[]>(() =>
    incoming?.trees?.length
      ? incoming.trees
      : suggestTreeMix(incoming?.carbonOffsetKg ?? 320, state.treeTypes).trees,
  );
  const [trees, setTrees] = useState<TreeLine[]>(baseMix);
  const [option, setOption] = useState<PurchaseOption>("flexible");
  const [method, setMethod] = useState<CheckoutMethod>("card");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (baseMix.length > 0 || state.treeTypes.length === 0) return;
    const suggested = suggestTreeMix(carbonOffsetKg, state.treeTypes).trees;
    setBaseMix(suggested);
    setTrees(suggested);
    // Only seed once tree types arrive from the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.treeTypes]);

  const mix = useMemo(() => scoreMix(trees, state.treeTypes), [trees, state.treeTypes]);
  const baseCount = treeCount(baseMix);
  const committed = treeCount(mix.trees);
  const treesNeeded = incoming?.treesNeeded ?? baseCount;
  const treesPlanted = tripId ? treesPlantedForTrip(tripId, state.donations) : 0;
  const sliderMax = Math.max(1, treesNeeded, baseCount);

  const creditPct =
    treesPlanted + treesNeeded > 0
      ? Math.min(100, Math.round(((treesPlanted + committed) / (treesPlanted + treesNeeded)) * 100))
      : 0;
  const barColor = creditPct <= 30 ? "bg-red-500" : creditPct <= 70 ? "bg-yellow-500" : "bg-green-500";

  const activeTypes = state.treeTypes.filter((t) => t.active);
  const uniqueCosts = [...new Set(activeTypes.map((t) => t.costPerTree))];
  const perTree = uniqueCosts.length === 1 ? uniqueCosts[0] : committed > 0 ? mix.amount / committed : 0;

  const offsetForCheckout =
    option === "flexible" && baseCount > 0 && committed < baseCount
      ? (carbonOffsetKg * committed) / baseCount
      : carbonOffsetKg;

  const split = splitCharges(mix.amount);
  const ready = committed > 0 && mix.offsetKg + 0.005 >= offsetForCheckout
    && (method === "card" || looksLikeMpesaPhone(phoneNumber));

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
    let next: TreeLine[];
    try {
      next = (await quoteTreeMix(carbonOffsetKg)).trees;
    } catch {
      next = suggestTreeMix(carbonOffsetKg, state.treeTypes).trees;
    }
    setBaseMix(next);
    setTrees(next);
  };

  const pay = async () => {
    if (!session || committed === 0) return;
    if (method === "mpesa" && !looksLikeMpesaPhone(phoneNumber)) {
      toast.error("Enter a Kenyan M-Pesa number (07… or 2547…).");
      return;
    }
    setBusy(true);
    try {
      const result = await checkoutDonation({
        carbonOffsetKg: offsetForCheckout || 0,
        trees: mix.trees,
        tripId,
        paymentMethod: method,
        phoneNumber: method === "mpesa" ? phoneNumber : undefined,
      });
      redirectToCheckout(result.checkoutUrl, navigate);
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setBusy(false);
    }
  };

  const optionCardClass = (value: PurchaseOption) =>
    `transition-all duration-300 hover:shadow-lg ${option === value ? "ring-2 ring-primary shadow-lg scale-105" : ""}`;

  return (
    <div className="tourist-dashboard-glass tree-purchase-glass min-h-screen">
      <div className="container max-w-5xl py-8">
        <div className="mb-8">
          <h1 className="tourist-page-heading text-2xl sm:text-4xl font-bold text-foreground mb-2">Plant Your Trees</h1>
          <p className="tourist-page-subheading text-sm sm:text-base text-muted-foreground mb-6">
            Choose how you'd like to offset your carbon footprint
          </p>

          <section className="glass-card glass-card--leafy relative py-8 px-4 sm:py-10 sm:px-6 md:py-12 md:px-8 rounded-2xl sm:rounded-3xl overflow-hidden">
            <div className="relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                    <Leaf className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total CO₂ Emissions</p>
                    <p className="text-2xl font-bold text-foreground">{carbonOffsetKg.toFixed(2)} kg</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Leaf className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trees Needed</p>
                    <p className="text-2xl font-bold text-foreground">{treesNeeded}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Leaf className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trees Planted</p>
                    <p className="text-2xl font-bold text-foreground">{treesPlanted}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Leaf className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trees Committed</p>
                    <p className="text-2xl font-bold text-foreground">{committed}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-accent/20">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-600 font-medium">Tree Credit: {creditPct}%</span>
                  <span className="text-muted-foreground">Tree Debt: {100 - creditPct}%</span>
                </div>
                <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-300 ${barColor}`} style={{ width: `${creditPct}%` }} />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6 mb-8">
          <h2 className="tourist-page-heading text-2xl font-semibold text-foreground">Choose Your Option</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className={optionCardClass("flexible")}>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                  <Leaf className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Flexible Tree Planting</CardTitle>
                <CardDescription>Select number of trees</CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="py-4">
                  <p className="text-3xl font-bold text-primary">
                    {usd(option === "flexible" ? mix.amount : scoreMix(baseMix, state.treeTypes).amount)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    for {option === "flexible" ? committed : baseCount} {(option === "flexible" ? committed : baseCount) === 1 ? "tree" : "trees"}
                  </p>
                </div>

                {option === "flexible" && (
                  <div className="space-y-2">
                    <Label>Number of Trees: {committed}</Label>
                    <Slider
                      value={[committed]}
                      onValueChange={(value) => setFlexibleCount(value[0])}
                      min={1}
                      max={sliderMax}
                      step={1}
                      disabled={baseCount === 0}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1</span>
                      <span>{sliderMax}</span>
                    </div>
                  </div>
                )}

                <Button
                  variant={option === "flexible" ? "default" : "outline"}
                  className="w-full"
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
                    {option === "mix"
                      ? `offsets about ${kg(mix.offsetKg)} of ${kg(carbonOffsetKg)}`
                      : `${activeTypes.length} native species available`}
                  </p>
                </div>

                {option === "mix" && (
                  <div className="space-y-4 text-left">
                    <div className="space-y-2">
                      <Label htmlFor="co2">Carbon offset target (kg CO₂)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="co2"
                          type="number"
                          min={0}
                          value={carbonOffsetKg}
                          onChange={(e) => setCarbonOffsetKg(Number(e.target.value))}
                        />
                        <Button type="button" variant="outline" onClick={() => void recalculate()}>
                          Recalculate
                        </Button>
                      </div>
                    </div>
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
                            <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => setCount(t.id, count - 1)}>
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-6 text-center tabular-nums">{count}</span>
                            <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => setCount(t.id, count + 1)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button variant={option === "mix" ? "default" : "outline"} className="w-full" onClick={() => setOption("mix")}>
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
              <p className="why-per-tree-title font-semibold text-sm">Why {usd(perTree)} per tree?</p>
              <p className="why-per-tree-desc text-sm">
                Your contribution covers seedling, planting labour, 3 years of aftercare, MRV/GPS geotagging and program overhead as per the plantation partners and program administrator charges.
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
              <h3 className="text-lg font-bold text-foreground">MFC-ICLIP</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Mau Forest Complex Integrated Conservation and Livelihood Improvement Programme, under the Ministry of Environment, Climate Change & Forestry, is a landmark 10-year initiative targeting over 317,000 hectares—one of East Africa's most ambitious landscape restoration efforts.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:shadow-md transition-shadow overflow-hidden">
            <img src={mauForestImage} alt="Mau Forest Complex reforestation site" className="w-full h-32 object-cover" />
            <CardContent className="pt-4 text-center space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Planted here</p>
              <h3 className="text-lg font-bold text-foreground">Mau Forest Complex</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A vital water tower and source of 12 major rivers feeding Lake Victoria, Lake Nakuru, and the Maasai Mara -Serengeti. Your tree is planted here by MFC-ICLIP to restore this degraded landscape and regenerate the forest.
              </p>
              <a href="https://mfc-iclip.org/" target="_blank" rel="noopener noreferrer">
                <Button variant="link" size="sm" className="text-xs text-primary p-0 h-auto">
                  Know more →
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-1">Total Amount</h3>
                <p className="text-sm text-muted-foreground">
                  {committed} {committed === 1 ? "tree" : "trees"}
                  {mix.trees.length > 1 && ` · ${mix.trees.map((t) => `${t.count} × ${t.treeType}`).join(", ")}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-primary">{usd(mix.amount)}</p>
              </div>
            </div>

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
              </div>
              {method === "mpesa" && (
                <div className="pt-2">
                  <MpesaPhoneField id="donate-mpesa-phone" value={phoneNumber} onChange={setPhoneNumber} disabled={busy} />
                </div>
              )}
            </div>

            {committed > 0 && (
              <div className="mb-6 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div>Plantation <span className="block font-medium text-foreground">{usd(split.plantation)}</span></div>
                <div>Platform (5%) <span className="block font-medium text-foreground">{usd(split.platform)}</span></div>
                <div>Processor (2.9%) <span className="block font-medium text-foreground">{usd(split.processor)}</span></div>
              </div>
            )}

            <Button size="lg" className="w-full text-lg" onClick={() => void pay()} disabled={busy || !ready}>
              {busy ? "Processing..." : "Proceed to Payment"}
            </Button>

            <p className="tree-purchase-payment-footnote text-center mt-4" style={{ color: "hsl(0 0% 45%)" }}>
              {method === "card"
                ? "Secure card payment on Afrinet's checkout page. We confirm the transfer when you return."
                : "Pay with M-Pesa. We confirm the transfer on the next screen."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
