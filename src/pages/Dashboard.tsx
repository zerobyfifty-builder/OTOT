import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  TreePine, 
  Plane, 
  BarChart3,
  Download,
  Sprout
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { PledgeCarousel } from '@/components/dashboard/PledgeCarousel';
import { RecentContributions } from '@/components/dashboard/RecentContributions';
import { ClimateActionCard } from '@/components/dashboard/ClimateActionCard';
import { FAQAccordion } from '@/components/dashboard/FAQAccordion';
import reduceFootprintImg from '@/assets/climate-reduce-footprint.jpg';
import carbonOffsetsImg from '@/assets/climate-carbon-offsets.jpg';
import offsetTravelImg from '@/assets/climate-offset-travel.jpg';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect institutional partners to their dashboard
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) return;

      // Use RPC function to avoid RLS recursion
      const { data: userRole } = await supabase
        .rpc('get_user_role', { user_id: user.id });
      
      if (userRole === 'institutional_partner') {
        navigate('/institutional/dashboard', { replace: true });
      } else if (userRole === 'super_admin') {
        navigate('/admin', { replace: true });
      }
    };

    checkUserRole();
  }, [user, navigate]);

  // Extract user's first name from email or use a default
  const getUserName = () => {
    if (!user?.email) return 'Guest';
    const emailName = user.email.split('@')[0];
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  };

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
      const totalTrips = tripsRes.data?.length || 0;
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
        {/* Welcome Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome {getUserName()}!
          </h1>
        </div>

        {/* Section 1: Stats Cards with Featured Background */}
        <section className="relative py-12 px-8 rounded-3xl overflow-hidden" style={{ backgroundColor: 'hsl(var(--featured-background))' }}>
          {/* Decorative pattern background */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute top-10 right-20 w-64 h-64 rounded-full border-2 border-foreground"></div>
            <div className="absolute bottom-10 left-20 w-48 h-48 rounded-full border-2 border-foreground"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-foreground"></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-10 gap-6">
              <h2 className="text-4xl font-bold text-foreground">
                Take Action Today
              </h2>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  variant="default"
                  className="flex items-center gap-2 text-base px-6 py-6"
                  onClick={() => navigate('/certificates')}
                >
                  <Download className="h-5 w-5" />
                  Download Pledge Certificate
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="flex items-center gap-2 text-base px-6 py-6"
                  onClick={() => navigate('/tree-purchase')}
                >
                  <Sprout className="h-5 w-5" />
                  Plant Trees
                </Button>
              </div>
            </div>
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
                colorVariant="green"
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
                colorVariant="lavender"
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
                colorVariant="beige"
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

        {/* Section 3: Climate Action Cards */}
        <section>
          <h2 className="text-3xl font-bold mb-8 text-left">Step up Your Climate Action</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ClimateActionCard
              image={reduceFootprintImg}
              title="Reduce your footprint"
              description="Discover simple ways to shrink your daily footprint on the planet."
              onClick={() => window.location.href = '/carbon-calculator'}
            />
            <ClimateActionCard
              image={carbonOffsetsImg}
              title="Decode carbon offsets"
              description="Understand what makes an offset truly effective and high-quality."
              onClick={() => window.location.href = '/carbon-calculator'}
            />
            <ClimateActionCard
              image={offsetTravelImg}
              title="Offset your travels"
              description="Calculate your travel emissions and offset them responsibly."
              onClick={() => window.location.href = '/carbon-calculator'}
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