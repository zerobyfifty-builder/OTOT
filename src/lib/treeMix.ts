import type { TreeLine, TreeType } from "@/types/otot";

export interface TreeMixResult {
  trees: TreeLine[];
  amount: number;
  offsetKg: number;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** Find the least expensive whole-tree mix that covers the requested CO₂ volume. */
export function suggestTreeMix(co2Kg: number, types: TreeType[]): TreeMixResult {
  const active = types.filter((t) => t.active && t.offsetKg > 0 && t.costPerTree > 0);
  if (active.length === 0 || !Number.isFinite(co2Kg) || co2Kg <= 0) {
    return { trees: [], amount: 0, offsetKg: 0 };
  }

  const offsets = active.map((t) => Math.round(t.offsetKg * 100));
  const unit = offsets.reduce(gcd);
  const needed = Math.ceil((co2Kg * 100) / unit);
  const costs = new Float64Array(needed + 1);
  const counts = new Int32Array(needed + 1);
  const choice = new Int32Array(needed + 1);
  costs.fill(Number.POSITIVE_INFINITY);
  choice.fill(-1);
  costs[0] = 0;
  for (let remaining = 1; remaining <= needed; remaining++) {
    for (let i = 0; i < active.length; i++) {
      const previous = Math.max(0, remaining - offsets[i]! / unit);
      const cost = Math.round(active[i]!.costPerTree * 100) + costs[previous]!;
      const count = counts[previous]! + 1;
      if (cost < costs[remaining]! || (cost === costs[remaining]! && count < counts[remaining]!)) {
        costs[remaining] = cost;
        counts[remaining] = count;
        choice[remaining] = i;
      }
    }
  }
  const quantities = new Array<number>(active.length).fill(0);
  for (let remaining = needed; remaining > 0;) {
    const i = choice[remaining]!;
    quantities[i] = (quantities[i] ?? 0) + 1;
    remaining = Math.max(0, remaining - offsets[i]! / unit);
  }
  return scoreMix(active.flatMap((t, i) => (quantities[i] ?? 0) > 0
    ? [{ treeTypeId: t.id, treeType: t.name, count: quantities[i]! }]
    : []), active);
}

export function scoreMix(trees: TreeLine[], types: TreeType[]): TreeMixResult {
  const byId = new Map(types.map((t) => [t.id, t]));
  let amount = 0;
  let offsetKg = 0;
  for (const row of trees) {
    const t = byId.get(row.treeTypeId);
    if (!t) continue;
    amount += row.count * t.costPerTree;
    offsetKg += row.count * t.offsetKg;
  }
  return {
    trees: trees.filter((row) => row.count > 0),
    amount: Math.round(amount * 100) / 100,
    offsetKg: Math.round(offsetKg * 100) / 100,
  };
}
