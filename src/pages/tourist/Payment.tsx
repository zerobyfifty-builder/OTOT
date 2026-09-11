import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { splitCharges } from "@/lib/charges";
import { treeCount, usd } from "@/lib/format";
import type { PaymentMode, TreeLine } from "@/types/otot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function Payment() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { checkoutDonation } = useStore();
  const incoming = useLocation().state as
    | { carbonOffsetKg?: number; trees?: TreeLine[]; amount?: number }
    | undefined;
  const [mode, setMode] = useState<PaymentMode>("Card");
  const [busy, setBusy] = useState(false);

  if (!incoming?.trees?.length || !incoming.amount) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Start from the donation screen.</p>
        <Button className="mt-4" onClick={() => navigate("/donate")}>
          Go to donate
        </Button>
      </div>
    );
  }

  const split = splitCharges(incoming.amount);

  const pay = () => {
    if (!session) return;
    setBusy(true);
    const { donation } = checkoutDonation({
      userId: session.userId,
      carbonOffsetKg: incoming.carbonOffsetKg || 0,
      trees: incoming.trees,
      paymentMode: mode,
    });
    toast.success("Payment recorded (demo)");
    setBusy(false);
    navigate(`/donations/${donation.id}`);
  };

  return (
    <div className="p-6 md:p-8 max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payment</h1>
        <p className="text-muted-foreground mt-1">Demo checkout — no money is moved.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{usd(incoming.amount)}</CardTitle>
          <CardDescription>
            {treeCount(incoming.trees)} trees · {incoming.carbonOffsetKg?.toFixed(0)} kg CO₂
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm font-medium mb-3">Payment mode</p>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as PaymentMode)} className="gap-3">
              {(["Card", "M-Pesa", "Bank Transfer"] as PaymentMode[]).map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm border rounded-md px-3 py-2">
                  <RadioGroupItem value={m} /> {m}
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="text-sm space-y-1 rounded-md bg-muted p-3">
            <div className="font-medium">Transaction charges split</div>
            <div className="flex justify-between"><span>Plantation</span><span>{usd(split.plantation)}</span></div>
            <div className="flex justify-between"><span>Platform (5%)</span><span>{usd(split.platform)}</span></div>
            <div className="flex justify-between"><span>Processor (2.9%)</span><span>{usd(split.processor)}</span></div>
          </div>
          <Button className="w-full" onClick={pay} disabled={busy}>
            Confirm payment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
