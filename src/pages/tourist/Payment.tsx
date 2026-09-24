import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { redirectToCheckout } from "@/lib/checkout";
import { looksLikeMpesaPhone } from "@/lib/mpesa";
import { splitCharges } from "@/lib/charges";
import { treeCount, usd } from "@/lib/format";
import type { CheckoutMethod, TreeLine } from "@/types/otot";
import {
  CheckoutMethodFields,
  checkoutActionLabel,
  checkoutReady,
} from "@/components/shared/CheckoutMethodFields";
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
  const [method, setMethod] = useState<CheckoutMethod>("mpesa");
  const [phoneNumber, setPhoneNumber] = useState("");

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
    if (method === "mpesa" && !looksLikeMpesaPhone(phoneNumber)) {
      toast.error("Enter a Kenyan M-Pesa number (07… or 2547…).");
      return;
    }
    setBusy(true);
    try {
      const result = await checkoutDonation({
        carbonOffsetKg: incoming.carbonOffsetKg || 0,
        trees: incoming.trees,
        tripId: incoming.tripId,
        paymentMethod: method,
        phoneNumber: method === "mpesa" ? phoneNumber : undefined,
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
      subtitle={
        method === "card"
          ? "Pay by card on Afrinet's checkout page. We confirm the transfer when you return."
          : "Pay with M-Pesa. We confirm the transfer on the next screen."
      }
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
          <CheckoutMethodFields
            method={method}
            onMethodChange={setMethod}
            phoneNumber={phoneNumber}
            onPhoneNumberChange={setPhoneNumber}
            disabled={busy}
          />
          <div className="text-sm space-y-1 rounded-md bg-muted p-3">
            <div className="font-medium">Transaction charges split</div>
            <div className="flex justify-between"><span>Plantation</span><span>{usd(split.plantation)}</span></div>
            <div className="flex justify-between"><span>Platform (5%)</span><span>{usd(split.platform)}</span></div>
            <div className="flex justify-between"><span>Processor (2.9%)</span><span>{usd(split.processor)}</span></div>
          </div>
          <Button className="w-full" onClick={() => void pay()} disabled={busy || !checkoutReady(method, phoneNumber)}>
            {checkoutActionLabel(method, { busy })}
          </Button>
        </CardContent>
      </Card>
    </TouristPage>
  );
}
