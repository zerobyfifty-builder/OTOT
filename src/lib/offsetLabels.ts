import type { OffsetStatus } from "@/lib/trips";
import type { Donation, Payment, Trip } from "@/types/otot";

/** One label set for a trip's CO₂ offset, used on every tourist page. */
export const OFFSET_LABELS: Record<OffsetStatus, string> = {
  fully: "Fully offset",
  partially: "Partially offset",
  not: "Not offset",
};

export const OFFSET_TONES: Record<OffsetStatus, string> = {
  fully: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  partially: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
  not: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
};

/** Name for donations that are not linked to a trip. */
export const DIRECT_DONATION = "Direct donation";

export type DonationPaymentState = "paid" | "pending" | "failed" | "refunded";

export const DONATION_PAYMENT_LABELS: Record<DonationPaymentState, string> = {
  paid: "Paid",
  pending: "Payment pending",
  failed: "Payment failed",
  refunded: "Refunded",
};

export const DONATION_PAYMENT_TONES: Record<DonationPaymentState, string> = {
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
  pending: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
  failed: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
  refunded: "bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-100",
};

/**
 * Where a donation's money stands for the tourist. An unpaid donation is
 * pending while any charge is still open; otherwise its attempts failed.
 */
export function donationPaymentState(donation: Donation, payments: Payment[]): DonationPaymentState {
  if (donation.status === "paid") return "paid";
  if (donation.status === "refunded") return "refunded";
  return payments.some((p) => p.donationId === donation.id && p.status === "pending") ? "pending" : "failed";
}

/** "Return", "One-way" or "Multi-city" (multi-city trips store "LHR → DXB → NBO"). */
export function tripTypeLabel(trip: Trip) {
  if ((trip.routeLabel?.match(/→/g)?.length ?? 0) >= 2) return "Multi-city";
  return trip.isReturn ? "Return" : "One-way";
}
