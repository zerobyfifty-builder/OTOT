import { Link } from "react-router-dom";
import { kg, treeCount, usd } from "@/lib/format";
import { ACCOMMODATION_LABELS, TRAVEL_CLASS_LABELS, airportCity, formatDateRange } from "@/lib/trips";
import type { Donation, Trip } from "@/types/otot";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function TripDetailsDialog({
  trip,
  donations,
  onClose,
}: {
  trip: Trip | null;
  donations: Donation[];
  onClose: () => void;
}) {
  const linked = trip ? donations.filter((d) => d.tripId === trip.id) : [];
  return (
    <Dialog open={Boolean(trip)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        {trip && (
          <>
            <DialogHeader>
              <DialogTitle>{trip.friendlyTripId}</DialogTitle>
              <DialogDescription>
                {airportCity(trip.originAirport)} → {airportCity(trip.destinationAirport)}
              </DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Cabin</dt>
                <dd className="font-medium">{TRAVEL_CLASS_LABELS[trip.travelClass]}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Trip</dt>
                <dd className="font-medium">{trip.isReturn ? "Return" : "One-way"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Dates</dt>
                <dd className="font-medium">{formatDateRange(trip.fromDate, trip.toDate).dateText}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Stay</dt>
                <dd className="font-medium">{ACCOMMODATION_LABELS[trip.accommodationType]}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Travelers</dt>
                <dd className="font-medium">{trip.numTravelers}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Trees needed</dt>
                <dd className="font-medium">{trip.treesNeeded}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Flight CO₂</dt>
                <dd className="font-medium">{kg(trip.flightCo2)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Stay CO₂</dt>
                <dd className="font-medium">{kg(trip.accommodationCo2)}</dd>
              </div>
            </dl>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Contributions</p>
              {linked.length === 0 ? (
                <p className="text-sm text-muted-foreground">No donations linked yet.</p>
              ) : (
                linked.map((d) => (
                  <Link
                    key={d.id}
                    to={`/donations/${d.id}`}
                    className="flex justify-between text-sm border rounded-md px-3 py-2 hover:bg-muted/40"
                  >
                    <span>
                      {treeCount(d.trees)} trees · {kg(d.carbonOffsetKg)}
                    </span>
                    <span className="font-semibold">{usd(d.amount)}</span>
                  </Link>
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
