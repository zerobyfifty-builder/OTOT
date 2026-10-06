import { useState } from "react";
import { Info, Leaf, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";
import { splitCharges, usdToKes } from "@/lib/charges";
import { kes, kg, usd } from "@/lib/format";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

/** Example tourist payment for the split preview, in USD (tourists are quoted in USD). */
const EXAMPLE_USD = 100;
const MAX_FEE_PCT = 20;

const pctLabel = (value: number) => `${Number(value.toFixed(2))}%`;

/** Valid fee: a number from 0 to 20 with at most two decimals. */
function parseFee(raw: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(raw.trim())) return null;
  const value = Number(raw);
  return value >= 0 && value <= MAX_FEE_PCT ? value : null;
}

function FeeField({
  id,
  label,
  hint,
  value,
  onChange,
  invalid,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="font-medium">
        {label}
      </Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex items-center gap-2 max-w-xs">
        <Input
          id={id}
          inputMode="decimal"
          className="w-28 tabular-nums"
          value={value}
          aria-invalid={invalid}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">% of each payment</span>
      </div>
      {invalid && <p className="text-xs text-destructive">Enter a percentage from 0 to {MAX_FEE_PCT}, e.g. 2.9.</p>}
    </div>
  );
}

export default function AdminConfig() {
  const { state, updateFeeSettings } = useStore();
  const { settings } = state;
  const [chargeFee, setChargeFee] = useState(String(settings.chargeFeePct));
  const [payoutFee, setPayoutFee] = useState(String(settings.payoutFeePct));
  const [confirming, setConfirming] = useState(false);
  const [synced, setSynced] = useState(settings);

  // The store loads after first render; follow it until the user starts editing.
  if (synced !== settings) {
    if (chargeFee === String(synced.chargeFeePct)) setChargeFee(String(settings.chargeFeePct));
    if (payoutFee === String(synced.payoutFeePct)) setPayoutFee(String(settings.payoutFeePct));
    setSynced(settings);
  }

  const chargeFeePct = parseFee(chargeFee);
  const payoutFeePct = parseFee(payoutFee);
  const valid = chargeFeePct !== null && payoutFeePct !== null;
  const dirty = valid && (chargeFeePct !== settings.chargeFeePct || payoutFeePct !== settings.payoutFeePct);

  // Preview with the rates typed above (the saved rates until you change them).
  const rates = valid ? { chargeFeePct, payoutFeePct } : settings;
  const exampleKes = usdToKes(EXAMPLE_USD, settings.kesPerUsd);
  const example = splitCharges(exampleKes, rates);
  // Same cent rounding as splitCharges.
  const chargeFeeKes = Math.round(exampleKes * rates.chargeFeePct) / 100;
  const netKes = exampleKes - example.processor;
  const share = (amount: number) => `${Number(((amount / exampleKes) * 100).toFixed(1))}%`;

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
          Fees and Split
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Every Afrinet fee comes off each payment first. What's left is split 15% OTOT, 15% Ministry and 70% partner.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Afrinet fees</CardTitle>
              <CardDescription className="mt-1.5">
                Changes apply to payments that settle from now on. Past splits never change.
              </CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0">
              Saved: {pctLabel(settings.chargeFeePct)} + {pctLabel(settings.payoutFeePct)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <FeeField
            id="charge-fee"
            label="(1) Afrinet collection fee"
            hint="What Afrinet charges to collect an M-Pesa or card payment."
            value={chargeFee}
            onChange={setChargeFee}
            invalid={chargeFeePct === null}
          />
          <FeeField
            id="payout-fee"
            label="(2) Payout transfer fee reserve"
            hint="Held back to cover the M-Pesa fees for sending the OTOT, Ministry and partner shares out."
            value={payoutFee}
            onChange={setPayoutFee}
            invalid={payoutFeePct === null}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={!dirty} onClick={() => setConfirming(true)}>
              Save fee rates
            </Button>
            {dirty && (
              <Button
                variant="ghost"
                onClick={() => {
                  setChargeFee(String(settings.chargeFeePct));
                  setPayoutFee(String(settings.payoutFeePct));
                }}
              >
                Discard changes
              </Button>
            )}
          </div>

          <Separator />

          <div className="bg-muted/50 rounded-lg p-4 space-y-1">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Info className="h-4 w-4 text-muted-foreground" />
              Shares (of the amount left after both fees)
            </p>
            <p className="text-xs text-muted-foreground">
              (3) OTOT 15% · (4) Ministry 15% · (5) Partner 70%. These percentages are fixed.
            </p>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold">
              Example: a {usd(EXAMPLE_USD)} payment = {kes(exampleKes)}
              <span className="font-normal text-muted-foreground">
                {" "}
                (KES {settings.kesPerUsd} per USD{dirty ? ", with the rates above" : ""})
              </span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              {[
                { label: "Collection fee", amount: chargeFeeKes },
                { label: "Transfer reserve", amount: example.processor - chargeFeeKes },
                { label: "OTOT", amount: example.platform },
                { label: "Ministry", amount: example.ministry },
                { label: "Partner", amount: example.plantation },
              ].map((row) => (
                <div key={row.label} className="bg-background rounded p-3 text-center">
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className="text-lg font-bold tabular-nums">{kes(row.amount)}</p>
                  <p className="text-xs text-muted-foreground">{share(row.amount)} of the payment</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {kes(exampleKes)} − {kes(example.processor)} fees = {kes(netKes)} to split. The server rounds each share to
              whole shillings when a payment settles.
            </p>
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
          Tourists are quoted per tree in USD and charged the KES equivalent. Edit individual species on Tree Types.
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
            <span className="font-semibold">
              {usd(avgCost)} <span className="font-normal text-muted-foreground">(≈ {kes(avgCost * settings.kesPerUsd)})</span>
            </span>
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
                    {usd(t.costPerTree)}{" "}
                    <span className="text-muted-foreground">
                      (≈ {kes(t.costPerTree * settings.kesPerUsd)} · {kg(t.offsetKg)} CO₂)
                    </span>
                  </span>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Change the Afrinet fee rates?"
        description={
          <>
            <p>
              Collection fee {pctLabel(settings.chargeFeePct)} → {pctLabel(chargeFeePct ?? 0)}, transfer reserve{" "}
              {pctLabel(settings.payoutFeePct)} → {pctLabel(payoutFeePct ?? 0)}.
            </p>
            <p>
              Payments that settle from now on are split with the new rates, which changes how much OTOT, the Ministry
              and partners receive. Past splits never change.
            </p>
          </>
        }
        confirmLabel="Save fee rates"
        busyLabel="Saving…"
        onConfirm={async () => {
          if (chargeFeePct === null || payoutFeePct === null) return;
          await updateFeeSettings({ chargeFeePct, payoutFeePct });
          toast.success("Fee rates saved. They apply to new payments.");
        }}
      />
    </div>
  );
}
