import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Plane, TreePine, Leaf, CheckCircle2 } from 'lucide-react';
import { airports } from '@/data/airports';

const getAirportName = (code: string) => {
  const airport = airports.find(a => a.code === code);
  return airport ? `${airport.city} (${code})` : code;
};

export const RecentTrips: React.FC = () => {
  const { user } = useAuth();

  const { data: recentTrips, isLoading } = useQuery({
    queryKey: ['recent-trips-dashboard', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: trips, error } = await supabase
        .from('trips')
        .select('id, origin_airport, destination_airport, total_co2, trees_needed, from_date, travel_class')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      if (!trips || trips.length === 0) return [];

      const tripIds = trips.map(t => t.id);
      const { data: trees } = await supabase
        .from('trees')
        .select('trip_id, num_trees, amount_paid')
        .eq('user_id', user.id)
        .in('trip_id', tripIds);

      const treesPerTrip: Record<string, { count: number; paid: number }> = {};
      (trees || []).forEach(t => {
        if (t.trip_id) {
          if (!treesPerTrip[t.trip_id]) treesPerTrip[t.trip_id] = { count: 0, paid: 0 };
          treesPerTrip[t.trip_id].count += t.num_trees;
          treesPerTrip[t.trip_id].paid += Number(t.amount_paid);
        }
      });

      return trips.map(trip => ({
        ...trip,
        treesPlanted: treesPerTrip[trip.id]?.count || 0,
        amountPaid: treesPerTrip[trip.id]?.paid || 0,
      }));
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-xl">Recent Trips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse space-y-3">
            <div className="h-20 bg-muted rounded-xl" />
            <div className="h-20 bg-muted rounded-xl" />
            <div className="h-20 bg-muted rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl">Recent Trips</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 flex flex-col">
        {recentTrips && recentTrips.length > 0 ? (
          <>
            <div className="space-y-3 flex-1">
              {recentTrips.map((trip) => {
                const isFullyOffset = trip.treesPlanted >= trip.trees_needed && trip.trees_needed > 0;
                const isPartial = trip.treesPlanted > 0 && trip.treesPlanted < trip.trees_needed;
                return (
                  <div
                    key={trip.id}
                    className="rounded-xl border border-border bg-background p-4 hover:bg-muted/40 transition-colors"
                  >
                    {/* Route header with date */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Plane className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-sm text-foreground truncate">
                          {getAirportName(trip.origin_airport)} → {getAirportName(trip.destination_airport)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(trip.from_date), 'dd MMM yyyy')}
                      </span>
                    </div>

                    {/* Stats row with amount prominent */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <Leaf className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {Number(trip.total_co2).toLocaleString()} kg
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TreePine className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {trip.treesPlanted}/{trip.trees_needed}
                          </span>
                        </div>
                        {/* Status badge inline */}
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
                      <span className="text-lg font-bold text-foreground">
                        ${trip.amountPaid.toFixed(2)}
                      </span>
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
};
