import { treeCount } from "@/lib/format";
import type { PlantationRequest, PlantationRequestStatus, StoreState } from "@/types/otot";

/**
 * One set of planting words for every staff screen:
 * - Funded: the tourist has paid (every paid donation).
 * - Assigned: the Ministry has given the request to a partner; planting is underway.
 * - Reported planted: the partner says the work is done (`ready_for_review`).
 * - Verified: the Ministry has checked and completed it (`completed`). Only
 *   verified trees count as planted.
 */
export type PlantingStage = "funded" | "assigned" | "reported" | "verified";

export const PLANTING_STAGE_LABEL: Record<PlantingStage, string> = {
  funded: "Funded",
  assigned: "Assigned",
  reported: "Reported planted",
  verified: "Verified",
};

/** Hints shown next to the stage, e.g. in tooltips and table footnotes. */
export const PLANTING_STAGE_HINT: Record<PlantingStage, string> = {
  funded: "Paid; waiting for the Ministry to assign a partner",
  assigned: "With a partner; planting underway",
  reported: "Partner reported the trees planted; awaiting Ministry verification",
  verified: "Planting verified by the Ministry",
};

/** StatusBadge tone for each stage. */
export const PLANTING_STAGE_TONE: Record<PlantingStage, string> = {
  funded: "unassigned",
  assigned: "assigned",
  reported: "ready_for_review",
  verified: "completed",
};

/** Labels for plantation request statuses, matching the stages above. */
export const REQUEST_STATUS_LABEL: Record<PlantationRequestStatus, string> = {
  unassigned: "Awaiting partner",
  assigned: "Assigned",
  in_progress: "In progress",
  ready_for_review: "Reported planted",
  completed: "Verified",
};

/** A paid donation with no request yet is simply funded. */
export function plantingStage(status?: PlantationRequestStatus): PlantingStage {
  switch (status) {
    case "completed":
      return "verified";
    case "ready_for_review":
      return "reported";
    case "assigned":
    case "in_progress":
      return "assigned";
    default:
      return "funded";
  }
}

export const requestDonationIds = (request: PlantationRequest) =>
  request.donationIds.length > 0 ? request.donationIds : [request.donationId];

/** The request each donation belongs to. */
export function requestByDonation(state: StoreState): Map<string, PlantationRequest> {
  const map = new Map<string, PlantationRequest>();
  for (const r of state.plantationRequests) {
    for (const id of requestDonationIds(r)) map.set(id, r);
  }
  return map;
}

/**
 * Trees in each stage. The stages don't overlap, so
 * awaitingPartner + assigned + reported + verified = funded.
 */
export interface PlantingTotals {
  funded: number;
  awaitingPartner: number;
  assigned: number;
  reported: number;
  verified: number;
}

export function plantingTotals(state: StoreState, partnerId?: string): PlantingTotals {
  const totals: PlantingTotals = { funded: 0, awaitingPartner: 0, assigned: 0, reported: 0, verified: 0 };
  const requests = requestByDonation(state);
  for (const d of state.donations) {
    if (d.status !== "paid") continue;
    const request = requests.get(d.id);
    if (partnerId && request?.partnerId !== partnerId) continue;
    const trees = treeCount(d.trees);
    totals.funded += trees;
    const stage = plantingStage(request?.status);
    if (stage === "funded") totals.awaitingPartner += trees;
    else totals[stage] += trees;
  }
  return totals;
}
