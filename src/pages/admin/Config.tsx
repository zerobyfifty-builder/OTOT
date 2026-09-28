import { Info, Leaf, Wallet } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { splitCharges } from "@/lib/charges";
import { kg, usd } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const EXAMPLE_CONTRIBUTION = 100;

function RateBox({ label, hint, value, note }: { label: string; hint: string; value: string; note?: string }) {
  return (
    <div className="space-y-2">
      <Label className="font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex items-center gap-2 max-w-xs">
        <div className="w-24 h-10 rounded-md border border-input bg-muted flex items-center justify-center text-sm font-semibold tabular-nums">
          {value}
        </div>
        {note && <span className="text-xs text-muted-foreground italic">{note}</span>}
      </div>
    </div>
  );
}

export default function AdminConfig() {
  const { state } = useStore();
  const example = splitCharges(EXAMPLE_CONTRIBUTION);
  const pct = (amount: number) => `${Number(((amount / EXAMPLE_CONTRIBUTION) * 100).toFixed(1))}%`;
  const activeTypes = state.treeTypes.filter((t) => t.active);
  const avgCost = state.treeTypes.reduce((s, t) => s + t.costPerTree, 0) / Math.max(1, state.treeTypes.length);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-admin-primary">Configuration</h1>
        <p className="text-muted-foreground mt-1">Manage system-level settings</p>
      </div>

      <Separator />

      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 text-admin-primary">
          <Wallet className="h-5 w-5" />
          Wallet Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Fund allocation split applied to every tree planting contribution at checkout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Contribution Split Configuration</CardTitle>
              <CardDescription className="mt-1.5">
                The estimated Afrinet fee is deducted first. The remaining amount is split between OTOT,
                the Ministry, and the plantation partner.
              </CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0">
              Read-only
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <RateBox
            label="(1) Afrinet transaction fee"
            hint="Estimated at 2.9% of the gross contribution."
            value={pct(example.processor)}
          />
          <RateBox
            label="(2) OTOT share"
            hint="15% of the amount remaining after the Afrinet fee."
            value={usd(example.platform)}
          />

          <Separator />

          <div className="bg-muted/50 rounded-lg p-4 space-y-1">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Info className="h-4 w-4 text-muted-foreground" />
              Amount to split after Afrinet fee: <span className="font-bold">{usd(EXAMPLE_CONTRIBUTION - example.processor)}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              OTOT receives 15%, the Ministry 15%, and the partner 70% of this amount.
            </p>
          </div>

          <RateBox
            label="(3) Ministry share"
            hint="15% of the amount after the Afrinet fee."
            value={usd(example.ministry)}
          />

          <RateBox label="(4) Partner share" hint="70% of the amount after the Afrinet fee."
            value={usd(example.plantation)} />

          <Separator />

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold">Example: {usd(EXAMPLE_CONTRIBUTION)} Contribution Breakdown</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {[
                { label: "Afrinet fee", amount: example.processor },
                { label: "OTOT", amount: example.platform },
                { label: "Ministry", amount: example.ministry },
                { label: "Partner", amount: example.plantation },
              ].map((row) => (
                <div key={row.label} className="bg-background rounded p-3 text-center">
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className="text-lg font-bold">{usd(row.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {pct(row.amount)} of {usd(EXAMPLE_CONTRIBUTION)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 text-admin-primary">
          <Leaf className="h-5 w-5" />
          Planting Costs
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Plantation cost per tree comes from each tree type. Edit individual species on Tree Types.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Plantation cost</CardTitle>
          <CardDescription>Average across {state.treeTypes.length} tree types.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Average cost per tree</span>
            <span className="font-semibold">{usd(avgCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Active tree types</span>
            <span>{activeTypes.length}</span>
          </div>
          {activeTypes.length > 0 && (
            <>
              <Separator />
              {activeTypes.map((t) => (
                <div key={t.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t.name}</span>
                  <span>
                    {usd(t.costPerTree)} <span className="text-muted-foreground">({kg(t.offsetKg)} CO₂)</span>
                  </span>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
