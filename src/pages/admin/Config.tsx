import { useStore } from "@/contexts/StoreContext";
import { usd } from "@/lib/format";
import { PortalPage } from "@/components/portal/PortalUI";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminConfig() {
  const { state } = useStore();
  const avgCost =
    state.treeTypes.reduce((s, t) => s + t.costPerTree, 0) / Math.max(1, state.treeTypes.length);
  return (
    <PortalPage tone="admin" title="Config" subtitle="Planting cost shell until a real API exists.">
      <Card className="bg-white border-admin-primary/10 max-w-3xl">
        <CardHeader>
          <CardTitle>Plantation cost</CardTitle>
          <CardDescription>Average across active tree types.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Average cost per tree", value: usd(avgCost) },
              { label: "Platform fee", value: "5%" },
              { label: "Processor fee", value: "2.9%" },
            ].map((row) => (
              <div key={row.label} className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">{row.label}</p>
                <p className="text-2xl font-bold text-admin-primary">{row.value}</p>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground">
            Edit individual species on Tree types. Charge split is applied at checkout.
          </p>
        </CardContent>
      </Card>
    </PortalPage>
  );
}
