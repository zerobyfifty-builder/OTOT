import { ClipboardList, Landmark, Trees, Wallet } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { kg, usd } from "@/lib/format";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MinistryDashboard() {
  const { state } = useStore();
  const paid = state.donations.filter((d) => d.status === "paid");
  const open = state.plantationRequests.filter((r) => r.status !== "completed");
  const ready = state.plantationRequests.filter((r) => r.status === "ready_for_review");
  const paidOut = state.plantationPayouts.filter((p) => p.payoutStatus === "paid");

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ministry</h1>
        <p className="text-muted-foreground mt-1">
          Turn paid donations into plantation requests, assign partners, and release payouts.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Paid donations" value={paid.length} icon={Wallet} hint={usd(paid.reduce((s, d) => s + d.amount, 0))} />
        <KpiCard title="CO₂ pledged" value={kg(paid.reduce((s, d) => s + d.carbonOffsetKg, 0))} icon={Trees} />
        <KpiCard title="Open requests" value={open.length} hint={`${ready.length} ready to complete`} icon={ClipboardList} />
        <KpiCard title="Payouts" value={usd(paidOut.reduce((s, p) => s + p.amount, 0))} icon={Landmark} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {state.plantationRequests.slice(0, 8).map((r) => (
            <div key={r.id} className="flex items-center justify-between border rounded-md px-3 py-2">
              <span>{usd(r.amount)}</span>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
