import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  TreePine, 
  Plane, 
  BarChart3, 
  Calendar,
  TrendingDown,
  Leaf
} from 'lucide-react';
import { ActionCard } from '@/components/dashboard/ActionCard';
import { PledgeCarousel } from '@/components/dashboard/PledgeCarousel';
import { EducationalCard } from '@/components/dashboard/EducationalCard';
import { FAQAccordion } from '@/components/dashboard/FAQAccordion';

export const Dashboard: React.FC = () => {
  const scrollToSubscription = () => {
    const subscriptionSection = document.getElementById('subscription-section');
    subscriptionSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Section 1: Action Cards Grid */}
        <section>
          <h2 className="text-3xl font-bold mb-8 pl-4">Take Action Today</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <ActionCard
              icon={TreePine}
              title="Plant a Tree"
              description="Offset your carbon footprint"
              buttonText="Get Started"
              href="/carbon-calculator"
            />
            
            <ActionCard
              icon={Plane}
              title="Add a Trip"
              description="Calculate your travel emissions"
              buttonText="Add Trip"
              buttonVariant="outline"
              href="/carbon-calculator"
            />
            
            <ActionCard
              icon={BarChart3}
              title="View Activity"
              description="Track your environmental impact"
              buttonText="View Details"
              href="/my-trips"
            />
            
            <ActionCard
              icon={Calendar}
              title="Subscribe"
              description="Monthly tree planting program"
              buttonText="Learn More"
              onClick={scrollToSubscription}
            />
          </div>
        </section>

        {/* Section 2: Responsible Traveler Pledge Carousel */}
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">Responsible Traveler Pledge</h2>
          <div className="max-w-3xl mx-auto">
            <PledgeCarousel />
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

        {/* Subscription Section (anchor for scroll) */}
        <section id="subscription-section" className="bg-card rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Monthly Tree Planting Subscription</h2>
          <p className="text-muted-foreground mb-6">
            Automatically offset your carbon footprint with our monthly tree planting program
          </p>
          <Button size="lg">
            Start Subscription
          </Button>
        </section>
      </div>
    </div>
  );
};