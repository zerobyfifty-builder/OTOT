import { Building2, CreditCard, Trees, Users } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { kg, usd } from "@/lib/format";
import { KpiCard } from "@/components/shared/KpiCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminOverview() {
  const { state, resetDemo } = useStore();
  const paid = state.donations.filter((d) => d.status === "paid");
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform overview</h1>
          <p className="text-muted-foreground mt-1">Read-only oversight of the demo store. Reset anytime.</p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await resetDemo();
              toast.success("Demo data reset");
            } catch (err) {
              toast.error(apiErrorMessage(err));
            }
          }}
        >
          Reset demo data
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Users" value={state.users.length} icon={Users} />
        <KpiCard title="Vendors" value={state.vendors.length} icon={Building2} />
        <KpiCard title="Donations" value={usd(paid.reduce((s, d) => s + d.amount, 0))} hint={`${paid.length} paid`} icon={CreditCard} />
        <KpiCard title="Offset pledged" value={kg(paid.reduce((s, d) => s + d.carbonOffsetKg, 0))} icon={Trees} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pipeline counts</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4 text-sm">
          <div>Plantation requests · {state.plantationRequests.length}</div>
          <div>Vendor requests · {state.vendorPlantationRequests.length}</div>
          <div>Payouts · {state.plantationPayouts.length}</div>
        </CardContent>
      </Card>
    </div>
  );
}
