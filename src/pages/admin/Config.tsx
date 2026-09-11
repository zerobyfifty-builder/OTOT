import { useStore } from "@/contexts/StoreContext";
import { usd } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminConfig() {
  const { state } = useStore();
  const avgCost =
    state.treeTypes.reduce((s, t) => s + t.costPerTree, 0) / Math.max(1, state.treeTypes.length);
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Config</h1>
        <p className="text-muted-foreground mt-1">Planting cost shell until a real API exists.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Plantation cost</CardTitle>
          <CardDescription>Average across active tree types.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Average cost per tree · {usd(avgCost)}</div>
          <div>Platform fee · 5%</div>
          <div>Processor fee · 2.9%</div>
          <p className="text-muted-foreground pt-2">
            Edit individual species on Tree types. Charge split is applied at checkout.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
