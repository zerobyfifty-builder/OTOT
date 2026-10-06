import { Link } from "react-router-dom";
import { useStore } from "@/contexts/StoreContext";
import { kg, shortDate, treeCount, usd } from "@/lib/format";
import { donationPaymentState, tripTypeLabel } from "@/lib/offsetLabels";
import {
  ACCOMMODATION_LABELS,
  TRAVEL_CLASS_LABELS,
  carbonOffsetForTrip,
  formatDateRange,
  offsetStatus,
  remainingCarbonKg,
  tripRouteLabel,
} from "@/lib/trips";
import type { Trip } from "@/types/otot";
import { DonationPaymentBadge, OffsetBadge } from "@/components/tourist/StatusBadges";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function TripDetailsDialog({ trip, onClose }: { trip: Trip | null; onClose: () => void }) {
  const { state } = useStore();
  const linked = trip
    ? state.donations
        .filter((d) => d.tripId === trip.id)
        .slice()
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    : [];
  return (
    <Dialog open={Boolean(trip)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {trip && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {trip.friendlyTripId}
                <OffsetBadge status={offsetStatus(trip, state.donations)} />
              </DialogTitle>
              <DialogDescription>{tripRouteLabel(trip)}</DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Cabin</dt>
                <dd className="font-medium">{TRAVEL_CLASS_LABELS[trip.travelClass]}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Trip</dt>
                <dd className="font-medium">{tripTypeLabel(trip)}</dd>
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
                <dt className="text-muted-foreground">Trees needed (estimate)</dt>
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
              <div>
                <dt className="text-muted-foreground">CO₂ offset</dt>
                <dd className="font-medium">
                  {kg(carbonOffsetForTrip(trip.id, state.donations))} of {kg(trip.totalCo2)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">CO₂ remaining</dt>
                <dd className="font-medium">{kg(remainingCarbonKg(trip, state.donations))}</dd>
              </div>
            </dl>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Contributions</p>
              {linked.length === 0 ? (
                <p className="text-sm text-muted-foreground">No donations linked yet.</p>
              ) : (
                linked.map((d) => {
                  const trees = treeCount(d.trees);
                  return (
                    <Link
                      key={d.id}
                      to={`/donations/${d.id}`}
                      className="flex items-center justify-between gap-3 text-sm border rounded-md px-3 py-2 hover:bg-muted/40"
                    >
                      <span className="min-w-0">
                        <span className="block">
                          {trees} {trees === 1 ? "tree" : "trees"} · {kg(d.carbonOffsetKg)}
                        </span>
                        <span className="block text-xs text-muted-foreground">{shortDate(d.createdAt)}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <DonationPaymentBadge state={donationPaymentState(d, state.payments)} />
                        <span className="font-semibold">{usd(d.amount)}</span>
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
