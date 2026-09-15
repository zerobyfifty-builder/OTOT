import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { airports } from "@/data/airports";
import { treeCount } from "@/lib/format";
import type { AccommodationType, Donation, TravelClass, Trip } from "@/types/otot";

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

export function treesPlantedForTrip(tripId: string, donations: Donation[]) {
  return paidDonationsForTrip(tripId, donations).reduce((sum, d) => sum + treeCount(d.trees), 0);
}

export function carbonOffsetForTrip(tripId: string, donations: Donation[]) {
  return paidDonationsForTrip(tripId, donations).reduce((sum, d) => sum + d.carbonOffsetKg, 0);
}

export function offsetStatus(trip: Trip, planted: number): OffsetStatus {
  if (planted >= trip.treesNeeded) return "fully";
  if (planted > 0) return "partially";
  return "not";
}

export function remainingCarbonKg(trip: Trip, donations: Donation[]) {
  return Math.max(0, trip.totalCo2 - carbonOffsetForTrip(trip.id, donations));
}

export function remainingTrees(trip: Trip, donations: Donation[]) {
  return Math.max(0, trip.treesNeeded - treesPlantedForTrip(trip.id, donations));
}
