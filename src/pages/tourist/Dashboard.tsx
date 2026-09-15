import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Award,
  BarChart3,
  Calculator,
  Copy,
  Plane,
  Share2,
  Sprout,
  TreePine,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { treeCount } from "@/lib/format";
import { offsetStatus, treesPlantedForTrip } from "@/lib/trips";
import { TouristPage } from "@/components/layout/TouristPage";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentTrips } from "@/components/dashboard/RecentTrips";
import { ClimateActionCard } from "@/components/dashboard/ClimateActionCard";
import { FAQAccordion } from "@/components/dashboard/FAQAccordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import reduceFootprintImg from "@/assets/climate-reduce-footprint.jpg";
import carbonOffsetsImg from "@/assets/climate-carbon-offsets.jpg";
import offsetTravelImg from "@/assets/climate-offset-travel.jpg";
import ktbDualLogo from "@/assets/ktb-dual-logo.png";

const PLEDGE_KEY = "otot.travelerPledge";

const PLEDGE_POINTS = [
  "Respect nature by following marked paths and protecting natural surroundings",
  "Leave no waste behind by disposing of trash properly and keeping natural areas clean",
  "Support reforestation to fight climate change through tree planting",
  "Reduce my carbon footprint by choosing eco-friendly travel options",
  "Respect wildlife by observing animals without disturbing their habitats",
  "Respect local cultures by honoring traditions and supporting communities",
  "Use resources wisely by conserving water and minimizing waste",
  "Camp responsibly in designated areas with eco-friendly practices",
  "Learn and share about Kenya's conservation efforts",
  "Care for our global environment through responsible tourism",
];

function firstName(name?: string, email?: string) {
  const fromName = name?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  if (!email) return "Traveler";
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export default function TouristDashboard() {
  const { session } = useAuth();
  const { state } = useStore();
  const navigate = useNavigate();
  const [pledgeOpen, setPledgeOpen] = useState(false);
  const [hasPledged, setHasPledged] = useState(() => localStorage.getItem(PLEDGE_KEY) === "1");
  const [shareOpen, setShareOpen] = useState(false);

  const stats = useMemo(() => {
    const trips = state.trips.filter((t) => t.userId === session?.userId);
    const paid = state.donations.filter((d) => d.userId === session?.userId && d.status === "paid");
    const treesPlanted = paid.reduce((s, d) => s + treeCount(d.trees), 0);
    const treesNeeded = trips.reduce((s, t) => s + t.treesNeeded, 0);
    const co2Offset = paid.reduce((s, d) => s + d.carbonOffsetKg, 0);
    const co2Total = trips.reduce((s, t) => s + t.totalCo2, 0);
    let fully = 0;
    let partial = 0;
    let open = 0;
    for (const trip of trips) {
      const status = offsetStatus(trip, treesPlantedForTrip(trip.id, state.donations));
      if (status === "fully") fully += 1;
      else if (status === "partially") partial += 1;
      else open += 1;
    }
    return {
      tripCount: trips.length,
      fully,
      partial,
      open,
      treesPlanted,
      treesNeeded,
      co2Offset: Math.round(co2Offset),
      co2Total: Math.round(co2Total),
    };
  }, [session?.userId, state.donations, state.trips]);

  const name = firstName(session?.name, session?.email);
  const shareMessage =
    "I just took the Responsible Traveler Pledge with One Tourist One Tree. Join me in making tourism sustainable. #OneTouristOneTree #SustainableTravel #Kenya";
  const shareUrl = window.location.origin;

  const takePledge = () => {
    localStorage.setItem(PLEDGE_KEY, "1");
    setHasPledged(true);
    setPledgeOpen(false);
    toast.success("Pledge recorded. Thank you for traveling responsibly.");
  };

  return (
    <TouristPage
      title={`Welcome ${name}!`}
      subtitle="Your responsible travel dashboard"
      headerRight={
        <img
          src={ktbDualLogo}
          alt="Magical Kenya and Kenya Tourism Board"
          className="hidden sm:block h-12 sm:h-20 object-contain self-start sm:self-auto"
        />
      }
    >
      <section className="glass-card glass-card--featured glass-card--leafy relative py-8 px-4 sm:py-10 sm:px-6 md:py-12 md:px-8 rounded-2xl sm:rounded-3xl overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10 gap-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Take Action Today</h2>
            <Button
              size="lg"
              variant="secondary"
              className="flex items-center gap-2 text-base px-6 py-6"
              onClick={() => navigate("/donate")}
            >
              <Sprout className="h-5 w-5" />
              Plant Trees
            </Button>
          </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto">
            <StatsCard
              icon={Plane}
              title="Calculate"
              subtitle="your travel emissions"
              stats={[
                {
                  label: "Fully Offset",
                  value: stats.fully,
                  total: stats.tripCount,
                  color: "hsl(142, 70%, 45%)",
                },
                {
                  label: "Partially Offset",
                  value: stats.partial,
                  total: stats.tripCount,
                  color: "hsl(45, 93%, 47%)",
                },
                {
                  label: "Needs Offset",
                  value: stats.open,
                  total: stats.tripCount,
                  color: "hsl(0, 84%, 60%)",
                },
              ]}
              buttonText="Add a Trip"
              buttonVariant="outline"
              href="/carbon-calculator"
              colorVariant="lavender"
            />
            <StatsCard
              icon={TreePine}
              title="Offset"
              subtitle="your carbon footprint"
              stats={[
                {
                  label: "Trees Planted",
                  value: stats.treesPlanted,
                  total: stats.treesNeeded,
                  color: "hsl(142, 70%, 45%)",
                },
                {
                  label: "Trees Needed",
                  value: Math.max(stats.treesNeeded - stats.treesPlanted, 0),
                  color: "hsl(142, 70%, 70%)",
                },
              ]}
              buttonText="Plant a Tree"
              href="/my-trees"
              colorVariant="green"
            />
            <StatsCard
              icon={BarChart3}
              title="Track"
              subtitle="your environmental impact"
              stats={[
                {
                  label: "CO₂ Offset",
                  value: stats.co2Offset,
                  total: stats.co2Total,
                  color: "hsl(142, 70%, 45%)",
                },
                {
                  label: "CO₂ Remaining",
                  value: Math.max(stats.co2Total - stats.co2Offset, 0),
                  color: "hsl(30, 60%, 50%)",
                },
              ]}
              buttonText="View Details"
              href="/my-impact"
              colorVariant="beige"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card relative overflow-hidden">
            <CardContent className="p-4 sm:p-6 md:p-8">
              {!hasPledged ? (
                <>
                  <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Take the Responsible Traveler Pledge</h2>
                  <p className="text-muted-foreground mb-6">
                    Commit to 10 principles of responsible tourism and make a positive impact on Kenya's environment and
                    communities.
                  </p>
                  <Button size="lg" onClick={() => setPledgeOpen(true)} className="w-full sm:w-auto">
                    Start Your Pledge Journey
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Award className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">My Responsible Traveler Pledge</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 sm:mb-5 ml-0 sm:ml-[52px]">
                    Share your pledge and inspire others to make a difference.
                  </p>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShareOpen(true)}
                      className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-background hover:bg-muted/60 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Share2 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-semibold text-foreground">Share My Pledge</p>
                        <p className="text-xs text-muted-foreground">Post on social media</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${shareMessage}\n\n${shareUrl}`);
                        toast.success("Invite message copied");
                      }}
                      className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-background hover:bg-muted/60 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                        <Copy className="h-4 w-4 text-violet-600" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-semibold text-foreground">Invite Others</p>
                        <p className="text-xs text-muted-foreground">Copy invite link to share</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPledgeOpen(true)}
                      className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-background hover:bg-muted/60 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <Calculator className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-semibold text-foreground">Re-read Pledge</p>
                        <p className="text-xs text-muted-foreground">Review the 10 principles</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <RecentTrips />
        </div>
      </section>

      <section>
        <h2 className="tourist-page-heading text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-left">
          Step up Your Climate Action
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <ClimateActionCard
            image={reduceFootprintImg}
            title="Reduce your footprint"
            description="Discover simple ways to shrink your daily footprint on the planet."
            onClick={() => navigate("/carbon-calculator")}
          />
          <ClimateActionCard
            image={carbonOffsetsImg}
            title="Decode carbon offsets"
            description="Understand what makes an offset truly effective and high-quality."
            onClick={() => navigate("/carbon-calculator")}
          />
          <ClimateActionCard
            image={offsetTravelImg}
            title="Offset your travels"
            description="Calculate your travel emissions and offset them responsibly."
            onClick={() => navigate("/my-trips")}
          />
        </div>
      </section>

      <section className="faq-section">
        <h2 className="faq-heading tourist-page-heading text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">
          Frequently Asked Questions
        </h2>
        <Card className="glass-card max-w-3xl mx-auto">
          <CardContent className="p-4 sm:p-6 md:p-8">
            <FAQAccordion />
          </CardContent>
        </Card>
      </section>

      <Dialog open={pledgeOpen} onOpenChange={setPledgeOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Responsible Traveler Pledge</DialogTitle>
            <DialogDescription>
              Ten principles for traveling in a way that supports Kenya's environment and communities.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-foreground list-decimal pl-5">
            {PLEDGE_POINTS.map((point) => (
              <li key={point} className="leading-relaxed">
                {point}
              </li>
            ))}
          </ol>
          <Button className="w-full" onClick={takePledge}>
            {hasPledged ? "I still pledge" : "I take this pledge"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="bg-primary max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-foreground">
              <Share2 className="h-6 w-6" />
              Share Your Impact
            </DialogTitle>
            <DialogDescription className="text-foreground/80">
              Inspire others to take action for sustainable tourism
            </DialogDescription>
          </DialogHeader>
          <p className="text-foreground/90 bg-background/10 p-4 rounded-lg">{shareMessage}</p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              navigator.clipboard.writeText(`${shareMessage}\n${shareUrl}`);
              toast.success("Message and link copied");
            }}
          >
            <Copy className="mr-2 h-4 w-4" /> Copy Link
          </Button>
        </DialogContent>
      </Dialog>
    </TouristPage>
  );
}
