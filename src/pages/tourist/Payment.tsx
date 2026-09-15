import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { splitCharges } from "@/lib/charges";
import { treeCount, usd } from "@/lib/format";
import type { PaymentMode, TreeLine } from "@/types/otot";
import { TouristPage } from "@/components/layout/TouristPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function Payment() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { checkoutDonation } = useStore();
  const incoming = useLocation().state as
    | { carbonOffsetKg?: number; trees?: TreeLine[]; amount?: number; tripId?: string }
    | undefined;
  const [mode, setMode] = useState<PaymentMode>("Card");
  const [busy, setBusy] = useState(false);

  if (!incoming?.trees?.length || !incoming.amount) {
    return (
      <TouristPage title="Payment" subtitle="Start from the donation screen.">
        <Button onClick={() => navigate("/donate")}>Go to donate</Button>
      </TouristPage>
    );
  }

  const split = splitCharges(incoming.amount);

  const pay = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const { donation } = await checkoutDonation({
        userId: session.userId,
        carbonOffsetKg: incoming.carbonOffsetKg || 0,
        trees: incoming.trees,
        paymentMode: mode,
        tripId: incoming.tripId,
      });
      toast.success("Payment recorded (demo)");
      navigate(`/donations/${donation.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouristPage title="Payment" subtitle="Demo checkout. No money is moved." className="max-w-xl" purchase>
      <Card className="glass-card">
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
    </TouristPage>
  );
}
