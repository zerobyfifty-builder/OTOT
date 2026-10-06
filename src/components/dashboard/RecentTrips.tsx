import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Leaf, Plane, TreePine } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { kg, usd } from "@/lib/format";
import {
  offsetStatus,
  paidDonationsForTrip,
  parseDay,
  remainingCarbonKg,
  treesFundedForTrip,
  tripRouteLabel,
} from "@/lib/trips";
import { OffsetBadge } from "@/components/tourist/StatusBadges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RecentTrips() {
  const { session } = useAuth();
  const { state } = useStore();
  const mine = state.trips
    .filter((t) => t.userId === session?.userId)
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 3);

  return (
    <Card className="glass-card h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl">Recent Trips</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 flex flex-col">
        {mine.length > 0 ? (
          <>
            <div className="space-y-3 flex-1">
              {mine.map((trip) => {
                const funded = treesFundedForTrip(trip.id, state.donations);
                const amountPaid = paidDonationsForTrip(trip.id, state.donations).reduce((sum, d) => sum + d.amount, 0);
                const status = offsetStatus(trip, state.donations);
                const remaining = remainingCarbonKg(trip, state.donations);
                return (
                  <div
                    key={trip.id}
                    className="rounded-xl border border-border bg-background p-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Plane className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-sm text-foreground truncate">{tripRouteLabel(trip)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(parseDay(trip.fromDate), "dd MMM yyyy")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                        <div className="flex items-center gap-1" title="Trip CO₂">
                          <Leaf className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                          <span className="text-muted-foreground">
                            {status === "partially" ? `${kg(remaining)} left of ${kg(trip.totalCo2)}` : kg(trip.totalCo2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1" title="Trees funded">
                          <TreePine className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                          <span className="text-muted-foreground">
                            {funded} {funded === 1 ? "tree" : "trees"} funded
                          </span>
                        </div>
                        <OffsetBadge status={status} className="text-[10px] px-2 py-0" />
                      </div>
                      <span className="text-lg font-bold text-foreground">{usd(amountPaid)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button variant="default" className="w-full mt-4" asChild>
              <Link to="/my-trips">View All Trips</Link>
            </Button>
          </>
        ) : (
          <div className="text-center py-8 space-y-4 flex-1 flex flex-col items-center justify-center">
            <Plane className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No trips yet</p>
            <Button asChild>
              <Link to="/carbon-calculator">Add Your First Trip</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
