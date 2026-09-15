import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { redirectToCheckout } from "@/lib/checkout";
import { splitCharges } from "@/lib/charges";
import { treeCount, usd } from "@/lib/format";
import type { TreeLine } from "@/types/otot";
import { TouristPage } from "@/components/layout/TouristPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Payment() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { checkoutDonation } = useStore();
  const incoming = useLocation().state as
    | { carbonOffsetKg?: number; trees?: TreeLine[]; amount?: number; tripId?: string }
    | undefined;
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
      const result = await checkoutDonation({
        carbonOffsetKg: incoming.carbonOffsetKg || 0,
        trees: incoming.trees,
        tripId: incoming.tripId,
      });
      redirectToCheckout(result.checkoutUrl, navigate);
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <TouristPage
      title="Payment"
      subtitle="Confirm to start an Afrinet card checkout. We confirm the payment on the next screen."
      className="max-w-xl"
      purchase
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{usd(incoming.amount)}</CardTitle>
          <CardDescription>
            {treeCount(incoming.trees)} trees · {incoming.carbonOffsetKg?.toFixed(0)} kg CO₂
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Afrinet starts a hosted card checkout. Stay on the next screen until we confirm the transfer.
          </p>
          <div className="text-sm space-y-1 rounded-md bg-muted p-3">
            <div className="font-medium">Transaction charges split</div>
            <div className="flex justify-between"><span>Plantation</span><span>{usd(split.plantation)}</span></div>
            <div className="flex justify-between"><span>Platform (5%)</span><span>{usd(split.platform)}</span></div>
            <div className="flex justify-between"><span>Processor (2.9%)</span><span>{usd(split.processor)}</span></div>
          </div>
          <Button className="w-full" onClick={() => void pay()} disabled={busy}>
            {busy ? "Starting payment…" : "Confirm payment"}
          </Button>
        </CardContent>
      </Card>
    </TouristPage>
  );
}
