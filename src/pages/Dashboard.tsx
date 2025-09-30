import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  TreePine, 
  Plane, 
  BarChart3,
  TrendingDown,
  Leaf
} from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { PledgeCarousel } from '@/components/dashboard/PledgeCarousel';
import { RecentContributions } from '@/components/dashboard/RecentContributions';
import { EducationalCard } from '@/components/dashboard/EducationalCard';
import { FAQAccordion } from '@/components/dashboard/FAQAccordion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Fetch user stats
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user) return { trees: 0, trips: 0, co2: 0 };

      const [treesRes, tripsRes] = await Promise.all([
        supabase
          .from('trees')
          .select('num_trees', { count: 'exact' })
          .eq('user_id', user.id),
        supabase
          .from('trips')
          .select('total_co2')
          .eq('user_id', user.id)
      ]);

      const totalTrees = treesRes.data?.reduce((sum, t) => sum + t.num_trees, 0) || 0;
      const totalTrips = tripsRes.count || 0;
      const totalCO2 = tripsRes.data?.reduce((sum, t) => sum + Number(t.total_co2), 0) || 0;

      return {
        trees: totalTrees,
        trips: totalTrips,
        co2: totalCO2,
      };
    },
    enabled: !!user,
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Section 1: Stats Cards with Featured Background */}
        <section className="-mx-4 px-4 py-12 bg-muted/40 rounded-3xl shadow-inner">
          <div className="container mx-auto">
            <h2 className="text-4xl font-bold mb-10 text-center bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Take Action Today
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
              <StatsCard
                icon={TreePine}
                title="Offset"
                subtitle="your carbon footprint"
                metric={stats?.trees.toString() || '0'}
                unit="Trees"
                buttonText="Plant a Tree"
                buttonVariant="default"
                href="/carbon-calculator"
              />
              
              <StatsCard
                icon={Plane}
                title="Calculate"
                subtitle="your travel emissions"
                metric={stats?.trips.toString() || '0'}
                unit="Trips"
                buttonText="Add a Trip"
                buttonVariant="outline"
                href="/carbon-calculator"
              />
              
              <StatsCard
                icon={BarChart3}
                title="Track"
                subtitle="your environmental impact"
                metric={stats?.co2 ? (stats.co2 / 1000).toFixed(1) : '0'}
                unit="kg CO2"
                buttonText="View Details"
                buttonVariant="default"
                href="/my-trips"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Pledge and Contributions */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PledgeCarousel />
            <RecentContributions />
          </div>
        </section>

        {/* Section 3: Educational Cards */}
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">Learn & Act</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <EducationalCard
              icon={TrendingDown}
              title="Learn where to reduce"
            />
            <EducationalCard
              icon={Leaf}
              title="Understand carbon credits"
            />
            <EducationalCard
              icon={Plane}
              title="Offset your travel"
            />
          </div>
        </section>

        {/* Section 4: FAQ Accordion */}
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto">
            <FAQAccordion />
          </div>
        </section>

      </div>
    </div>
  );
};