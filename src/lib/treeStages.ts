import type { PlantationRequest } from "@/types/otot";

/** Where every tourist tree is planted today. */
export const PLANTED_HERE = "Mau Forest Complex";

export const TOURIST_STAGE_LABELS = {
  waiting: "Waiting to be Assigned",
  assigned: "Assigned",
  scheduled: "Planting Scheduled",
  planted: "Planted",
} as const;

export type TouristStage = keyof typeof TOURIST_STAGE_LABELS;

export const STAGE_ORDER: TouristStage[] = ["waiting", "assigned", "scheduled", "planted"];

/** Collapse ministry/partner request statuses into the four stages a tourist sees. */
export function toTouristStage(status: PlantationRequest["status"] | undefined): TouristStage {
  switch (status) {
    case "ready_for_review":
    case "completed":
      return "planted";
    case "in_progress":
      return "scheduled";
    case "assigned":
      return "assigned";
    default:
      return "waiting";
  }
}
