import { Link } from "react-router-dom";
import { Plane } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { kg, shortDate } from "@/lib/format";
import { airportCity, treesPlantedForTrip } from "@/lib/trips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
        <CardTitle className="text-xl">Recent trips</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 flex flex-col">
        {mine.length > 0 ? (
          <>
            <div className="space-y-3 flex-1">
              {mine.map((trip) => {
                const planted = treesPlantedForTrip(trip.id, state.donations);
                const fully = planted >= trip.treesNeeded;
                const partial = planted > 0 && !fully;
                return (
                  <Link
                    key={trip.id}
                    to="/my-trips"
                    className="block rounded-xl border border-border bg-background p-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Plane className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-sm text-foreground truncate">
                          {airportCity(trip.originAirport)} → {airportCity(trip.destinationAirport)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{shortDate(trip.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="text-xs text-muted-foreground">
                        {kg(trip.totalCo2)} · {planted}/{trip.treesNeeded} trees
                      </div>
                      <Badge
                        className={
                          fully
                            ? "bg-green-100 text-green-700 border-green-200"
                            : partial
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : "bg-red-100 text-red-700 border-red-200"
                        }
                      >
                        {fully ? "Offset" : partial ? "Partial" : "Open"}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
            <Button variant="default" className="w-full mt-4" asChild>
              <Link to="/my-trips">View all trips</Link>
            </Button>
          </>
        ) : (
          <div className="text-center py-8 space-y-4 flex-1 flex flex-col items-center justify-center">
            <Plane className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No trips yet</p>
            <Button asChild>
              <Link to="/carbon-calculator">Add your first trip</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
