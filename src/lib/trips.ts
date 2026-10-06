import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { airports } from "@/data/airports";
import { treeCount } from "@/lib/format";
import type { AccommodationType, Donation, Payment, TravelClass, Trip } from "@/types/otot";

export const TRAVEL_CLASS_LABELS: Record<TravelClass, string> = {
  economy: "Economy",
  premium_economy: "Premium Economy",
  business: "Business",
  first: "First Class",
};

export const ACCOMMODATION_LABELS: Record<AccommodationType, string> = {
  none: "No Accommodation",
  hotel: "Hotel",
  rental: "Rental",
  cruise: "Cruise Ship",
  service_apartment: "Service Apartment",
};

export type OffsetStatus = "fully" | "partially" | "not";

export function airportCity(code: string) {
  return airports.find((a) => a.code === code)?.city ?? code;
}

export function airportCountry(code: string) {
  return airports.find((a) => a.code === code)?.country ?? code;
}

export function parseDay(iso: string) {
  return parseISO(iso.slice(0, 10));
}

export function tripNights(fromDate: string, toDate: string) {
  return Math.max(0, differenceInCalendarDays(parseDay(toDate), parseDay(fromDate)));
}

export function formatDateRange(fromDate: string, toDate: string) {
  const from = parseDay(fromDate);
  const to = parseDay(toDate);
  const days = tripNights(fromDate, toDate);
  const daysText = days === 0 ? "Same day" : `${days} ${days === 1 ? "day" : "days"}`;
  if (format(from, "dd MMM yyyy") === format(to, "dd MMM yyyy")) {
    return { dateText: format(from, "dd MMM yyyy"), daysText };
  }
  if (format(from, "MMM yyyy") === format(to, "MMM yyyy")) {
    return { dateText: `${format(from, "dd")} to ${format(to, "dd MMM yyyy")}`, daysText };
  }
  if (format(from, "yyyy") === format(to, "yyyy")) {
    return { dateText: `${format(from, "dd MMM")} to ${format(to, "dd MMM yyyy")}`, daysText };
  }
  return { dateText: `${format(from, "dd MMM yyyy")} to ${format(to, "dd MMM yyyy")}`, daysText };
}

export function paidDonationsForTrip(tripId: string, donations: Donation[]) {
  return donations.filter((d) => d.tripId === tripId && d.status === "paid");
}

/** Trees paid for on this trip. Paid is not planted: planting status comes from plantation requests. */
export function treesFundedForTrip(tripId: string, donations: Donation[]) {
  return paidDonationsForTrip(tripId, donations).reduce((sum, d) => sum + treeCount(d.trees), 0);
}

export function carbonOffsetForTrip(tripId: string, donations: Donation[]) {
  return paidDonationsForTrip(tripId, donations).reduce((sum, d) => sum + d.carbonOffsetKg, 0);
}

/** Rounding slack so 115.68 kg funded against 115.7 kg still counts as offset. */
const OFFSET_TOLERANCE_KG = 0.5;

/** CO₂ is the offset measure: a trip is offset when paid trees cover its emissions. */
export function offsetStatus(trip: Trip, donations: Donation[]): OffsetStatus {
  const offset = carbonOffsetForTrip(trip.id, donations);
  if (offset + OFFSET_TOLERANCE_KG >= trip.totalCo2) return "fully";
  if (offset > 0) return "partially";
  return "not";
}

export function remainingCarbonKg(trip: Trip, donations: Donation[]) {
  const remaining = trip.totalCo2 - carbonOffsetForTrip(trip.id, donations);
  return remaining <= OFFSET_TOLERANCE_KG ? 0 : remaining;
}

/** Estimate only: the tree mix for the remaining CO₂ decides the real count. */
export function remainingTrees(trip: Trip, donations: Donation[]) {
  const remaining = remainingCarbonKg(trip, donations);
  if (remaining === 0 || trip.totalCo2 <= 0) return 0;
  return Math.max(1, Math.ceil((trip.treesNeeded * remaining) / trip.totalCo2));
}

/**
 * Trip donations with a charge still open (an M-Pesa prompt or card session).
 * Old failed attempts also stay pending_payment, so look at the payments.
 */
export function pendingDonationsForTrip(tripId: string, donations: Donation[], payments: Payment[]) {
  return donations.filter(
    (d) =>
      d.tripId === tripId &&
      d.status === "pending_payment" &&
      payments.some((p) => p.donationId === d.id && p.status === "pending"),
  );
}

/** Router state for `/donate` that keeps the donation linked to this trip. */
export function offsetTripState(trip: Trip, donations: Donation[]) {
  return {
    carbonOffsetKg: remainingCarbonKg(trip, donations),
    treesNeeded: remainingTrees(trip, donations),
    tripId: trip.id,
  };
}

/** "Nairobi → Mombasa", or the stored label for flight-time and multi-city trips. */
export function tripRouteLabel(trip: Trip) {
  return trip.routeLabel || `${airportCity(trip.originAirport)} → ${airportCity(trip.destinationAirport)}`;
}
