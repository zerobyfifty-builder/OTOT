import { treeCount } from "@/lib/format";
import { partnerShareKesByDonation } from "@/lib/ledger";
import { plantingStage, requestDonationIds } from "@/lib/plantingStatus";
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
  const ids = new Set(requestDonationIds(request));
  return state.donations.filter((d) => ids.has(d.id)).reduce((s, d) => s + treeCount(d.trees), 0);
}

/** KES received for a request's donations (settled payments, duplicates excluded). */
export function requestReceivedKes(received: Map<string, number>, request: PlantationRequest) {
  return requestDonationIds(request).reduce((s, id) => s + (received.get(id) ?? 0), 0);
}

/**
 * Per partner: trees assigned to them (any stage), trees reported planted
 * (awaiting verification), trees verified planted, and their KES share.
 */
export function partnerTreeStats(state: StoreState) {
  const grouped: Record<string, { allocated: number; reported: number; planted: number; shareKes: number }> = {};
  const shareKes = partnerShareKesByDonation(state);
  state.plantationRequests.forEach((r) => {
    if (!r.partnerId) return;
    if (!grouped[r.partnerId]) grouped[r.partnerId] = { allocated: 0, reported: 0, planted: 0, shareKes: 0 };
    const row = grouped[r.partnerId];
    const trees = requestTrees(state, r);
    row.allocated += trees;
    row.shareKes += requestDonationIds(r).reduce((s, id) => s + (shareKes.get(id) ?? 0), 0);
    const stage = plantingStage(r.status);
    if (stage === "verified") row.planted += trees;
    else if (stage === "reported") row.reported += trees;
  });
  return grouped;
}
