import { Link } from "react-router-dom";
import { HeartHandshake, Leaf, TreePine } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { kg, shortDate, treeCount, usd } from "@/lib/format";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RecentDonations() {
  const { session } = useAuth();
  const { state } = useStore();
  const mine = state.donations
    .filter((d) => d.userId === session?.userId)
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 3);

  return (
    <Card className="glass-card h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl">Recent donations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 flex flex-col">
        {mine.length > 0 ? (
          <>
            <div className="space-y-3 flex-1">
              {mine.map((donation) => (
                <Link
                  key={donation.id}
                  to={`/donations/${donation.id}`}
                  className="block rounded-xl border border-border bg-background p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <HeartHandshake className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-sm text-foreground truncate">
                        {treeCount(donation.trees)} trees funded
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{shortDate(donation.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <Leaf className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">{kg(donation.carbonOffsetKg)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TreePine className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">{treeCount(donation.trees)}</span>
                      </div>
                      <StatusBadge status={donation.status} />
                    </div>
                    <span className="text-lg font-bold text-foreground">{usd(donation.amount)}</span>
                  </div>
                </Link>
              ))}
            </div>
            <Button variant="default" className="w-full mt-4" asChild>
              <Link to="/donate">Plant more trees</Link>
            </Button>
          </>
        ) : (
          <div className="text-center py-8 space-y-4 flex-1 flex flex-col items-center justify-center">
            <HeartHandshake className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No donations yet</p>
            <Button asChild>
              <Link to="/carbon-calculator">Calculate your first trip</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
