import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CheckCircle2, Leaf, Plane, TreePine } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { airports } from "@/data/airports";
import { parseDay, paidDonationsForTrip, treesPlantedForTrip } from "@/lib/trips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const airportName = (code: string) => {
  const airport = airports.find((a) => a.code === code);
  return airport ? `${airport.city} (${code})` : code;
};

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
                const planted = treesPlantedForTrip(trip.id, state.donations);
                const amountPaid = paidDonationsForTrip(trip.id, state.donations).reduce((sum, d) => sum + d.amount, 0);
                const isFullyOffset = planted >= trip.treesNeeded && trip.treesNeeded > 0;
                const isPartial = planted > 0 && planted < trip.treesNeeded;
                return (
                  <div
                    key={trip.id}
                    className="rounded-xl border border-border bg-background p-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Plane className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-sm text-foreground truncate">
                          {airportName(trip.originAirport)} → {airportName(trip.destinationAirport)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(parseDay(trip.fromDate), "dd MMM yyyy")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <Leaf className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">{Number(trip.totalCo2).toLocaleString()} kg</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TreePine className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {planted}/{trip.treesNeeded}
                          </span>
                        </div>
                        {isFullyOffset ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                            <CheckCircle2 className="h-3 w-3" />
                            Offset
                          </span>
                        ) : isPartial ? (
                          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                            Partial
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                            Not Offset
                          </span>
                        )}
                      </div>
                      <span className="text-lg font-bold text-foreground">${amountPaid.toFixed(2)}</span>
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
