import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Minus, Plus } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { scoreMix, suggestTreeMix } from "@/lib/treeMix";
import { kg, usd } from "@/lib/format";
import type { TreeLine } from "@/types/otot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Donate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, quoteTreeMix } = useStore();
  const incoming = location.state as { carbonOffsetKg?: number; trees?: TreeLine[] } | undefined;

  const [carbonOffsetKg, setCarbonOffsetKg] = useState(incoming?.carbonOffsetKg ?? 320);
  const [trees, setTrees] = useState<TreeLine[]>(
    incoming?.trees?.length ? incoming.trees : suggestTreeMix(320, state.treeTypes).trees,
  );

  const mix = useMemo(() => scoreMix(trees, state.treeTypes), [trees, state.treeTypes]);

  const setCount = (id: string, count: number) => {
    setTrees((prev) =>
      prev.map((row) => (row.treeTypeId === id ? { ...row, count: Math.max(0, count) } : row)),
    );
  };

  const ensureRow = (typeId: string) => {
    setTrees((prev) => {
      if (prev.some((r) => r.treeTypeId === typeId)) return prev;
      const t = state.treeTypes.find((x) => x.id === typeId);
      if (!t) return prev;
      return [...prev, { treeTypeId: t.id, treeType: t.name, count: 1 }];
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Donation</h1>
        <p className="text-muted-foreground mt-1">
          Choose tree types and counts. Amount is plantation cost × trees. Carbon offset is the volume you intend to cover.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Offset volume</CardTitle>
          <CardDescription>From the calculator, or enter a target yourself.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="co2">Carbon offset (kg CO₂)</Label>
            <Input
              id="co2"
              type="number"
              min={0}
              value={carbonOffsetKg}
              onChange={(e) => setCarbonOffsetKg(Number(e.target.value))}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              try {
                const mixQuote = await quoteTreeMix(carbonOffsetKg);
                setTrees(mixQuote.trees);
              } catch {
                setTrees(suggestTreeMix(carbonOffsetKg, state.treeTypes).trees);
              }
            }}
          >
            Recalculate tree mix
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trees</CardTitle>
          <CardDescription>Nested field: tree type and count.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.treeTypes.filter((t) => t.active).map((t) => {
            const row = trees.find((r) => r.treeTypeId === t.id);
            const count = row?.count ?? 0;
            return (
              <div key={t.id} className="flex items-center justify-between gap-4 border rounded-lg p-3">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.scientificName} · {kg(t.offsetKg)} / tree · {usd(t.costPerTree)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" size="icon" variant="outline" onClick={() => {
                    if (!row) ensureRow(t.id);
                    setCount(t.id, count - 1);
                  }}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center tabular-nums">{count}</span>
                  <Button type="button" size="icon" variant="outline" onClick={() => {
                    if (!row) ensureRow(t.id);
                    setCount(t.id, count + 1);
                  }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              Mix offsets about {kg(mix.offsetKg)} against a {kg(carbonOffsetKg)} target
            </div>
            <div className="text-xl font-semibold">{usd(mix.amount)}</div>
          </div>
          <Button
            className="w-full"
            disabled={mix.trees.length === 0}
            onClick={() =>
              navigate("/donate/pay", {
                state: { carbonOffsetKg, trees: mix.trees, amount: mix.amount },
              })
            }
          >
            Continue to payment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
