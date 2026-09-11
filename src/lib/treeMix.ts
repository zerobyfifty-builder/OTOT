import type { TreeLine, TreeType } from "@/types/otot";

export interface TreeMixResult {
  trees: TreeLine[];
  amount: number;
  offsetKg: number;
}

/** Suggest a 2–3 species mix that covers the given CO₂ volume. */
export function suggestTreeMix(co2Kg: number, types: TreeType[]): TreeMixResult {
  const active = types.filter((t) => t.active);
  if (active.length === 0 || co2Kg <= 0) {
    return { trees: [], amount: 0, offsetKg: 0 };
  }

  const pick = active.slice(0, Math.min(3, active.length));
  const share = co2Kg / pick.length;
  const trees: TreeLine[] = pick.map((t) => ({
    treeTypeId: t.id,
    treeType: t.name,
    count: Math.max(1, Math.ceil(share / t.offsetKg)),
  }));

  return scoreMix(trees, types);
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
    offsetKg: Math.round(offsetKg * 10) / 10,
  };
}
