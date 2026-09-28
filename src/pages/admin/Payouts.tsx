import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage, apiFetch } from "@/lib/api";
import { shortDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AdminPayout = {
  id: string; recipientType: "ministry" | "partner"; partnerId?: string; recipientName: string;
  mpesaPhone: string; amountKes: number; status: "processing" | "paid" | "failed";
  reference: string; transactionCode?: string; failureMessage?: string; createdAt: string;
};
type UnpaidTransaction = {
  paymentId: string; donationId: string; requestId?: string; requestStatus?: string; reference: string;
  createdAt: string; grossKes: number; feeKes: number; netKes: number;
  shareKes: number; committedKes: number; unpaidKes: number;
};
type RecipientLedger = { earnedKes: number; committedKes: number; unpaidKes: number; transactions: UnpaidTransaction[] };
type PayoutData = {
  wallet: { grossKes: number; afrinetFeeKes: number; creditedKes: number;
    committedKes: number; calculatedBalanceKes: number; availableKes: number };
  allocation: { ototKes: number; ministryKes: number; partnerKes: number; unassignedPartnerKes: number };
  ministry: RecipientLedger; partners: Record<string, RecipientLedger>;
  payouts: AdminPayout[]; kesPerUsd: number; sdkConfigured: boolean;
};
const kes = (amount: number) => `KES ${amount.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

export default function AdminPayouts() {
  const { state, refresh: refreshStore } = useStore();
  const [data, setData] = useState<PayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recipientType, setRecipientType] = useState<"ministry" | "partner">("ministry");
  const [partnerId, setPartnerId] = useState("");
  const [ministryPhone, setMinistryPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await apiFetch<PayoutData>("/v1/admin/payouts")); }
    catch (err) { toast.error(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const selectedPartner = state.vendors.find((v) => v.id === partnerId);
  const recipientLedger = recipientType === "ministry" ? data?.ministry : data?.partners[partnerId];
  const suggested = Math.min(data?.wallet.availableKes ?? 0, recipientLedger?.unpaidKes ?? 0);
  const parsedAmount = Number(amount);
  const phone = recipientType === "ministry" ? ministryPhone : selectedPartner?.mpesaPhone ?? "";
  const valid = Boolean(data?.sdkConfigured && phone && Number.isSafeInteger(parsedAmount) && parsedAmount > 0 &&
    parsedAmount <= suggested && (recipientType === "ministry" || selectedPartner?.status === "active"));

  const submit = async () => {
    if (!valid) return;
    setSending(true);
    try {
      await apiFetch("/v1/admin/payouts", { method: "POST", body: JSON.stringify(recipientType === "ministry"
        ? { recipientType, ministryPhone: ministryPhone.trim(), amountKes: parsedAmount }
        : { recipientType, partnerId, amountKes: parsedAmount }) });
      toast.success("Payout submitted to Afrinet. Awaiting settlement.");
      setAmount(""); setConfirming(false);
      await Promise.all([load(), refreshStore()]);
    } catch (err) {
      toast.error(`${apiErrorMessage(err)} Check payout history before trying again.`);
      await load();
    } finally { setSending(false); }
  };

  return <div className="p-4 sm:p-6 md:p-8 space-y-6">
    <div className="flex items-start justify-between gap-4">
      <div><h1 className="text-2xl sm:text-3xl font-bold text-admin-primary">Payouts</h1>
        <p className="text-muted-foreground mt-1">Pay the Ministry’s 15% share or an assigned partner’s 70% share after the Afrinet fee.</p></div>
      <Button variant="outline" size="icon" aria-label="Refresh payouts" disabled={loading} onClick={() => { void load(); void refreshStore(); }}><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}/></Button>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Calculated Afrinet wallet balance</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{kes(data?.wallet.calculatedBalanceKes ?? 0)}</div><p className="text-xs text-muted-foreground mt-2">Successful charges − estimated Afrinet fee − paid and processing payouts. Reconcile against the merchant portal.</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Received after Afrinet fee</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{kes(data?.wallet.creditedKes ?? 0)}</div><p className="text-xs text-muted-foreground mt-2">{kes(data?.wallet.grossKes ?? 0)} gross − {kes(data?.wallet.afrinetFeeKes ?? 0)} estimated fee (2.9%).</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Payouts committed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{kes(data?.wallet.committedKes ?? 0)}</div><p className="text-xs text-muted-foreground mt-2">Includes completed and processing transfers to the Ministry and partners.</p></CardContent></Card>
    </div>

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.75fr)]">
      <Card><CardHeader><CardTitle>Create payout</CardTitle></CardHeader><CardContent className="space-y-5">
        <div className="space-y-2"><Label>Recipient</Label><Select value={recipientType} onValueChange={(value) => { setRecipientType(value as "ministry" | "partner"); setAmount(""); setConfirming(false); }}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ministry">Ministry M-Pesa wallet</SelectItem><SelectItem value="partner">Partner M-Pesa wallet</SelectItem></SelectContent></Select></div>
        {recipientType === "partner" ? <div className="space-y-2"><Label>Partner</Label><Select value={partnerId} onValueChange={(value) => { setPartnerId(value); setAmount(""); setConfirming(false); }}><SelectTrigger><SelectValue placeholder="Select an active partner"/></SelectTrigger><SelectContent>{state.vendors.filter((v) => v.status === "active").map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">M-Pesa number: {selectedPartner?.mpesaPhone || "Not set — add it in Partners"}</p></div>
          : <div className="space-y-2"><Label htmlFor="ministry-phone">Ministry M-Pesa number</Label><Input id="ministry-phone" inputMode="tel" placeholder="2547XXXXXXXX" value={ministryPhone} onChange={(e) => { setMinistryPhone(e.target.value); setConfirming(false); }}/><p className="text-xs text-muted-foreground">The number used for this transfer is saved with its payout record.</p></div>}
        <div className="space-y-2"><Label htmlFor="payout-amount">Amount to transfer (whole KES)</Label><div className="flex gap-2"><Input id="payout-amount" type="number" min="1" step="1" value={amount} onChange={(e) => { setAmount(e.target.value); setConfirming(false); }}/><Button type="button" variant="outline" onClick={() => { setAmount(String(suggested)); setConfirming(false); }} disabled={suggested < 1}>Use suggested</Button></div><p className="text-xs text-muted-foreground">Unpaid to this recipient: {kes(recipientLedger?.unpaidKes ?? 0)} · Available in calculated wallet: {kes(data?.wallet.availableKes ?? 0)}. Suggested maximum: {kes(suggested)}.</p></div>
        {!data?.sdkConfigured && <p className="text-sm text-amber-700">Afrinet SDK credentials are not configured. Transfers are disabled.</p>}
        {confirming && valid && <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">Send <strong>{kes(parsedAmount)}</strong> to <strong>{recipientType === "ministry" ? "Ministry" : selectedPartner?.name}</strong> at <strong>{phone}</strong>? Afrinet will debit the merchant wallet if the payout settles.</div>}
        <Button disabled={!valid || sending} onClick={() => confirming ? void submit() : setConfirming(true)}><Send className="h-4 w-4 mr-2"/>{sending ? "Submitting…" : confirming ? "Confirm and send" : "Review payout"}</Button>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>How amounts are calculated</CardTitle></CardHeader><CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">Afrinet’s estimated 2.9% fee is removed first. The remainder is split 15% OTOT, 15% Ministry, and 70% for the assigned partner. Only successful payments contribute.</p>
        <div className="rounded-md bg-muted/50 p-3 space-y-1 text-muted-foreground"><div>All successful payments: <strong className="text-foreground">{kes(data?.allocation.ototKes ?? 0)}</strong> OTOT · <strong className="text-foreground">{kes(data?.allocation.ministryKes ?? 0)}</strong> Ministry · <strong className="text-foreground">{kes(data?.allocation.partnerKes ?? 0)}</strong> partner share.</div><div>{kes(data?.allocation.unassignedPartnerKes ?? 0)} of the partner share is still unassigned. It cannot be sent to a selected partner until those requests are assigned.</div></div>
        <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded border p-2"><span className="block text-xs text-muted-foreground">Earned</span><strong>{kes(recipientLedger?.earnedKes ?? 0)}</strong></div><div className="rounded border p-2"><span className="block text-xs text-muted-foreground">Paid / processing</span><strong>{kes(recipientLedger?.committedKes ?? 0)}</strong></div><div className="rounded border p-2"><span className="block text-xs text-muted-foreground">Unpaid</span><strong>{kes(recipientLedger?.unpaidKes ?? 0)}</strong></div></div>
        <div><h3 className="font-medium mb-2">{recipientType === "ministry" ? "Unpaid Ministry transactions" : selectedPartner ? `Unpaid transactions · ${selectedPartner.name}` : "Select a partner to see unpaid transactions"}</h3>
          {!recipientLedger?.transactions.length ? <p className="text-muted-foreground">No unpaid eligible transactions.</p> : <div className="max-h-72 overflow-auto rounded border"><Table><TableHeader><TableRow><TableHead>Payment</TableHead><TableHead className="text-right">Gross</TableHead><TableHead className="text-right">Fee</TableHead><TableHead className="text-right">Net</TableHead><TableHead className="text-right">Share</TableHead><TableHead className="text-right">Paid / processing</TableHead><TableHead className="text-right">Unpaid</TableHead></TableRow></TableHeader><TableBody>{recipientLedger.transactions.map((row) => <TableRow key={row.paymentId}><TableCell><div className="font-mono text-xs">{row.reference}</div><div className="text-xs text-muted-foreground">{shortDate(row.createdAt)}{row.requestStatus ? ` · ${row.requestStatus.replaceAll("_", " ")}` : ""}</div></TableCell><TableCell className="text-right">{kes(row.grossKes)}</TableCell><TableCell className="text-right">{kes(row.feeKes)}</TableCell><TableCell className="text-right">{kes(row.netKes)}</TableCell><TableCell className="text-right">{kes(row.shareKes)}</TableCell><TableCell className="text-right">{kes(row.committedKes)}</TableCell><TableCell className="text-right font-medium">{kes(row.unpaidKes)}</TableCell></TableRow>)}</TableBody></Table></div>}
        </div>
        <p className="text-xs text-muted-foreground">The wallet balance is calculated from OTOT’s records. Afrinet’s SDK does not provide a live balance or actual fee lookup.</p>
      </CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle>Payout history</CardTitle></CardHeader><CardContent>{!data?.payouts.length ? <p className="text-sm text-muted-foreground">No Super Admin payouts yet.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Recipient</TableHead><TableHead>M-Pesa</TableHead><TableHead>Reference</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{data.payouts.map((p) => <TableRow key={p.id}><TableCell>{shortDate(p.createdAt)}</TableCell><TableCell>{p.recipientName}</TableCell><TableCell className="font-mono">{p.mpesaPhone}</TableCell><TableCell className="font-mono text-xs">{p.transactionCode || p.reference}</TableCell><TableCell><Badge variant={p.status === "failed" ? "destructive" : "outline"}>{p.status}</Badge>{p.failureMessage && <div className="text-xs text-muted-foreground mt-1">{p.failureMessage}</div>}</TableCell><TableCell className="text-right font-medium">{kes(p.amountKes)}</TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card>
  </div>;
}
