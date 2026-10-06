import type { PlantationRequest } from "@/types/otot";

/** Every OTOT tree is planted at one site. Keep in step with PLANTING_SITE in bakend/src/db/profile.ts. */
export const PLANTED_HERE = "Mau Forest Complex";

export const TOURIST_STAGE_LABELS = {
  waiting: "Waiting for a partner",
  assigned: "Partner assigned",
  scheduled: "Planting underway",
  verifying: "Verifying planting",
  planted: "Planted",
} as const;

export type TouristStage = keyof typeof TOURIST_STAGE_LABELS;

export const STAGE_ORDER: TouristStage[] = ["waiting", "assigned", "scheduled", "verifying", "planted"];

/**
 * Collapse ministry/partner request statuses into the stages a tourist sees.
 * Only a Ministry-completed request counts as planted; that is also when the
 * certificate is issued.
 */
export function toTouristStage(status: PlantationRequest["status"] | undefined): TouristStage {
  switch (status) {
    case "completed":
      return "planted";
    case "ready_for_review":
      return "verifying";
    case "in_progress":
      return "scheduled";
    case "assigned":
      return "assigned";
    default:
      return "waiting";
  }
}
