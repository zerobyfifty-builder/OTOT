import type { AllocationStatus, PaymentAllocation, PayoutSource, PayoutStatus, RecipientType } from "@/types/otot";

export const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  initiated: "Initiated",
  in_progress: "In progress",
  transferred: "Transferred",
  failed: "Failed",
};

/** A share with no payout yet is "Pending"; a partner share with no vendor awaits the Ministry. */
export const ALLOCATION_STATUS_LABEL: Record<AllocationStatus | "unassigned", string> = {
  pending: "Pending",
  unassigned: "Awaiting assignment",
  ...PAYOUT_STATUS_LABEL,
};

export const RECIPIENT_LABEL: Record<RecipientType, string> = {
  otot: "OTOT",
  ministry: "Ministry",
  partner: "Partner",
};

export const PAYOUT_SOURCE_LABEL: Record<PayoutSource, string> = {
  manual: "Super Admin",
  ministry: "Ministry",
  auto_per_transaction: "Auto (per payment)",
  auto_daily: "Auto (end of day)",
  legacy: "Before ledger",
};

export type SweepMode = "daily" | "per_transaction" | "manual";

export const SWEEP_MODE_LABEL: Record<SweepMode, string> = {
  daily: "End of day",
  per_transaction: "Every transaction",
  manual: "Manual only",
};

export function sweepModeDescription(mode: SweepMode, hourEat: number): string {
  if (mode === "daily") return `Auto-transferred at end of day (${String(hourEat).padStart(2, "0")}:00 EAT)`;
  if (mode === "per_transaction") return "Auto-transferred after every transaction";
  return "Transferred only when you press Transfer";
}

export const isOpenPayout = (status: PayoutStatus) => status === "initiated" || status === "in_progress";

/** Status to show for one share, including the "awaiting assignment" state. */
export function shareStatus(share?: PaymentAllocation): AllocationStatus | "unassigned" | undefined {
  if (!share) return undefined;
  if (share.recipientType === "partner" && !share.partnerId) return "unassigned";
  return share.status;
}

/** A share can go into a new payout once it is assigned and not already moving. */
export function isPayable(share?: PaymentAllocation): boolean {
  if (!share || share.amountKes <= 0) return false;
  if (share.recipientType === "partner" && !share.partnerId) return false;
  return share.status === "pending" || share.status === "failed";
}
