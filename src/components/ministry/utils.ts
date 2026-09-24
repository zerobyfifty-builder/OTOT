import { treeCount } from "@/lib/format";
import type { PlantationRequest, StoreState } from "@/types/otot";

export type ChartDateRange = { from: Date | undefined; to: Date | undefined };

export const EMPTY_RANGE: ChartDateRange = { from: undefined, to: undefined };

export function inDateRange(date: Date, range: ChartDateRange) {
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

export type SortDirection = "asc" | "desc";

export function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  direction: SortDirection,
) {
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "string" && typeof b === "string") {
    return direction === "asc" ? a.localeCompare(b) : b.localeCompare(a);
  }
  return direction === "asc" ? (a > b ? 1 : -1) : b > a ? 1 : -1;
}

export function paginate<T>(rows: T[], page: number, pageSize: number) {
  return rows.slice((page - 1) * pageSize, page * pageSize);
}

export function requestTrees(state: StoreState, request: PlantationRequest) {
  return state.donations
    .filter((d) => request.donationIds.includes(d.id))
    .reduce((s, d) => s + treeCount(d.trees), 0);
}

export function requestPayments(state: StoreState, request: PlantationRequest) {
  return state.donations
    .filter((d) => request.donationIds.includes(d.id))
    .reduce((s, d) => s + d.amount, 0);
}

export function partnerTreeStats(state: StoreState) {
  const grouped: Record<string, { allocated: number; planted: number; payments: number }> = {};
  state.plantationRequests.forEach((r) => {
    if (!r.partnerId) return;
    if (!grouped[r.partnerId]) grouped[r.partnerId] = { allocated: 0, planted: 0, payments: 0 };
    const row = grouped[r.partnerId];
    const trees = requestTrees(state, r);
    row.allocated += trees;
    row.payments += requestPayments(state, r);
    if (r.status === "completed") row.planted += trees;
  });
  return grouped;
}
