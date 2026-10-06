import { Link } from "react-router-dom";
import { HeartHandshake, Leaf, TreePine } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { kg, shortDate, treeCount, usd } from "@/lib/format";
import { DIRECT_DONATION, donationPaymentState } from "@/lib/offsetLabels";
import { tripRouteLabel } from "@/lib/trips";
import { DonationPaymentBadge } from "@/components/tourist/StatusBadges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** The list scrolls inside the card, so it can hold more than fits at once. */
const SHOWN = 10;

/** Latest donations, including unpaid ones, so an open or failed payment can be finished. */
export function RecentDonations() {
  const { session } = useAuth();
  const { state } = useStore();
  const newestFirst = state.donations
    .filter((d) => d.userId === session?.userId)
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  // An open charge stays visible even when newer donations push it down.
  const open = newestFirst.filter((d) => donationPaymentState(d, state.payments) === "pending");
  const mine = [...open, ...newestFirst.filter((d) => !open.includes(d))].slice(0, Math.max(SHOWN, open.length));
  const scrolls = mine.length > 3;

  return (
    <Card className="glass-card h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl">Recent donations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 flex flex-col min-h-0">
        {mine.length > 0 ? (
          <>
            {/* A labelled <section> is a landmark region without role="region",
                which glass-dashboard.css repaints in light text. */}
            <section
              className={
                scrolls
                  ? "space-y-3 flex-1 max-h-[26rem] overflow-y-auto overscroll-contain -mr-2 pr-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  : "space-y-3 flex-1"
              }
              // A scroll area must be reachable by keyboard.
              tabIndex={scrolls ? 0 : undefined}
              aria-label="Recent donations list"
            >
              {mine.map((donation) => {
                const trees = treeCount(donation.trees);
                const paymentState = donationPaymentState(donation, state.payments);
                const trip = donation.tripId ? state.trips.find((t) => t.id === donation.tripId) : undefined;
                const unfinished = paymentState === "pending" || paymentState === "failed";
                return (
                  <div
                    key={donation.id}
                    className="rounded-xl border border-border bg-background p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <HeartHandshake className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                        <span className="font-semibold text-sm text-foreground truncate">
                          {trip ? tripRouteLabel(trip) : DIRECT_DONATION}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{shortDate(donation.createdAt)}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                        <div className="flex items-center gap-1">
                          <TreePine className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                          <span className="text-muted-foreground">
                            {trees} {trees === 1 ? "tree" : "trees"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Leaf className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                          <span className="text-muted-foreground">{kg(donation.carbonOffsetKg)}</span>
                        </div>
                        <DonationPaymentBadge state={paymentState} className="text-[10px] px-2 py-0" />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-foreground">{usd(donation.amount)}</span>
                        <Button asChild size="sm" variant={unfinished ? "default" : "outline"} className="h-8 px-3">
                          <Link to={`/donations/${donation.id}`}>
                            {paymentState === "pending" ? "Check payment" : paymentState === "failed" ? "Finish payment" : "View"}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
            <Button variant="default" className="w-full mt-4" asChild>
              <Link to="/my-trees">See all my trees</Link>
            </Button>
          </>
        ) : (
          <div className="text-center py-8 space-y-4 flex-1 flex flex-col items-center justify-center">
            <HeartHandshake className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No donations yet</p>
            <Button asChild>
              <Link to="/donate">Plant your first tree</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
