import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export const RecentContributions: React.FC = () => {
  const { user } = useAuth();

  const { data: recentTrees, isLoading } = useQuery({
    queryKey: ['recent-trees', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('trees')
        .select('id, num_trees, created_at, purchase_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: trips } = await supabase
        .from('trips')
        .select('total_co2')
        .eq('user_id', user.id);

      const totalCO2 = trips?.reduce((sum, trip) => sum + Number(trip.total_co2), 0) || 0;
      const avgPerTree = 500; // kg CO2 per tree
      
      return {
        co2PerTree: avgPerTree,
        totalCO2,
      };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-xl">Recent Contributions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl">Recent Contributions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col">
        {recentTrees && recentTrees.length > 0 ? (
          <>
            <div className="space-y-3 flex-1">
              {recentTrees.map((tree) => {
                const co2Offset = (tree.num_trees * (stats?.co2PerTree || 500)) / 1000;
                return (
                  <div 
                    key={tree.id} 
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <span className="text-foreground font-medium">
                      {tree.purchase_type === 'Subscription' ? 'Subscription' : 'One-time'}
                    </span>
                    <span className="text-muted-foreground">
                      {co2Offset.toFixed(1)} kg
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {format(new Date(tree.created_at), 'dd/MM/yyyy')}
                    </span>
                  </div>
                );
              })}
            </div>
            <Button 
              variant="default" 
              className="w-full mt-4"
              asChild
            >
              <Link to="/my-trees">View all Contributions</Link>
            </Button>
          </>
        ) : (
          <div className="text-center py-8 space-y-4 flex-1 flex flex-col items-center justify-center">
            <p className="text-muted-foreground">No contributions yet</p>
            <Button asChild>
              <Link to="/carbon-calculator">Plant Your First Tree</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
