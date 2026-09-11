import { ClipboardList, Landmark, ListChecks, Trees } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { usd } from "@/lib/format";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PartnerDashboard() {
  const { session } = useAuth();
  const { state } = useStore();
  const vendorId = session?.vendorId;
  const requests = state.plantationRequests.filter((r) => r.partnerId === vendorId);
  const vprs = state.vendorPlantationRequests.filter((v) => v.vendorId === vendorId);
  const payouts = state.plantationPayouts.filter((p) =>
    requests.some((r) => r.id === p.plantationRequestId),
  );

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Partner dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Assign ministry requests to agents, then complete them in the field.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Assigned requests" value={requests.length} icon={ClipboardList} />
        <KpiCard
          title="In progress"
          value={vprs.filter((v) => v.status !== "completed").length}
          icon={ListChecks}
        />
        <KpiCard title="Trees in queue" value={requests.reduce((s, r) => {
          const d = state.donations.find((x) => x.id === r.donationId);
          return s + (d?.trees.reduce((n, t) => n + t.count, 0) || 0);
        }, 0)} icon={Trees} />
        <KpiCard title="Payouts" value={usd(payouts.reduce((s, p) => s + p.amount, 0))} icon={Landmark} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Incoming from ministry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="flex justify-between border rounded-md px-3 py-2 text-sm">
              <span>{usd(r.amount)}</span>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
