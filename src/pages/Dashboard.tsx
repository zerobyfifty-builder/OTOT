import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  TreePine, 
  Plane, 
  BarChart3,
  Download,
  Sprout,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Copy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent } from '@/components/ui/card';
import { RecentContributions } from '@/components/dashboard/RecentContributions';
import { ClimateActionCard } from '@/components/dashboard/ClimateActionCard';
import { FAQAccordion } from '@/components/dashboard/FAQAccordion';
import reduceFootprintImg from '@/assets/climate-reduce-footprint.jpg';
import carbonOffsetsImg from '@/assets/climate-carbon-offsets.jpg';
import offsetTravelImg from '@/assets/climate-offset-travel.jpg';
import pledgeDownloadIcon from '@/assets/pledge-download-certificate.png';
import pledgeShareIcon from '@/assets/pledge-share.png';
import pledgeInviteIcon from '@/assets/pledge-invite.png';
import pledgeRetakeIcon from '@/assets/pledge-retake.png';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { generatePledgeCertificate, downloadCertificate } from '@/utils/certificateGenerator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isDownloadingCertificate, setIsDownloadingCertificate] = useState(false);

  // Redirect institutional partners to their dashboard
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        console.log('[DASHBOARD] No user, skipping role check');
        return;
      }

      console.log('[DASHBOARD] Checking role for user:', user.id);
      
      // Use RPC function to avoid RLS recursion
      const { data: userRole, error: roleError } = await supabase
        .rpc('get_user_role', { input_user_id: user.id });
      
      console.log('[DASHBOARD] User role from RPC:', userRole);
      console.log('[DASHBOARD] Role error:', roleError);
      
      if (userRole === 'institutional_partner') {
        console.log('[DASHBOARD] User is institutional partner, redirecting to institutional dashboard');
        navigate('/institutional/dashboard', { replace: true });
      } else if (userRole === 'super_admin') {
        console.log('[DASHBOARD] User is super admin, redirecting to admin');
        navigate('/admin', { replace: true });
      } else {
        console.log('[DASHBOARD] User is regular user, staying on dashboard');
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

  // Handle certificate download
  const handleDownloadCertificate = async () => {
    if (!user) return;
    
    setIsDownloadingCertificate(true);
    try {
      const userName = getUserName();
      const { data: userData } = await supabase
        .from('users')
        .select('otot_id')
        .eq('user_id', user.id)
        .single();

      const blob = await generatePledgeCertificate({
        userName,
        userId: user.id,
        ototId: userData?.otot_id,
      });

      downloadCertificate(blob, `pledge-certificate-${userName}.pdf`);
      
      toast({
        title: "Certificate Downloaded",
        description: "Your pledge certificate has been downloaded successfully!",
      });
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading your certificate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingCertificate(false);
    }
  };

  // Share functions
  const shareMessage = "I just took the Responsible Traveler Pledge with One Tourist One Tree! 🌍 Join me in making tourism sustainable. #OneTouristOneTree #SustainableTravel #Kenya";
  const shareUrl = `${window.location.origin}/pledge`;

  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const shareOnTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareOnLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const copyInstagramMessage = () => {
    navigator.clipboard.writeText(shareMessage);
    toast({ title: "Copied!", description: "Message copied! Paste it on Instagram." });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${shareMessage}\n${shareUrl}`);
    toast({ title: "Copied!", description: "Message and link copied to clipboard!" });
  };

  // Fetch user stats and pledge status
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user) return { trees: 0, trips: 0, co2: 0, hasPledged: false };

      const [treesRes, tripsRes, userRes] = await Promise.all([
        supabase
          .from('trees')
          .select('num_trees', { count: 'exact' })
          .eq('user_id', user.id),
        supabase
          .from('trips')
          .select('total_co2')
          .eq('user_id', user.id),
        supabase
          .from('users')
          .select('pledge_status')
          .eq('user_id', user.id)
          .single()
      ]);

      const totalTrees = treesRes.data?.reduce((sum, t) => sum + t.num_trees, 0) || 0;
      const totalTrips = tripsRes.data?.length || 0;
      const totalCO2 = tripsRes.data?.reduce((sum, t) => sum + Number(t.total_co2), 0) || 0;
      const hasPledged = userRes.data?.pledge_status || false;

      return {
        trees: totalTrees,
        trips: totalTrips,
        co2: totalCO2,
        hasPledged,
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
            <Card className="relative overflow-hidden">
              <CardContent className="p-8">
                {!stats?.hasPledged ? (
                  <>
                    <h2 className="text-2xl font-bold mb-4">Take the Responsible Traveler Pledge</h2>
                    <p className="text-muted-foreground mb-6">
                      Commit to 10 principles of responsible tourism and make a positive impact on Kenya's environment and communities.
                    </p>
                    <Button 
                      size="lg"
                      onClick={() => navigate('/pledge')}
                      className="w-full sm:w-auto"
                    >
                      Start Your Pledge Journey
                    </Button>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-bold mb-3">My Responsible Traveler Pledge</h2>
                    <p className="text-muted-foreground mb-8 text-lg">
                      Thank you for committing to responsible tourism! Share your pledge with others and inspire more travelers to make a difference.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div 
                        onClick={handleDownloadCertificate}
                        className="flex flex-col items-center justify-center p-8 bg-muted/50 rounded-2xl cursor-pointer transition-all hover:bg-muted hover:scale-105 hover:shadow-lg disabled:opacity-50"
                      >
                        {isDownloadingCertificate ? (
                          <>
                            <div className="w-16 h-16 mb-4 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                            <p className="text-lg font-semibold text-center">Downloading...</p>
                          </>
                        ) : (
                          <>
                            <img src={pledgeDownloadIcon} alt="Download Certificate" className="w-16 h-16 mb-4" />
                            <p className="text-lg font-semibold text-center">Download Certificate</p>
                          </>
                        )}
                      </div>
                      
                      <div 
                        onClick={() => setIsShareDialogOpen(true)}
                        className="flex flex-col items-center justify-center p-8 bg-muted/50 rounded-2xl cursor-pointer transition-all hover:bg-muted hover:scale-105 hover:shadow-lg"
                      >
                        <img src={pledgeShareIcon} alt="Share My Pledge" className="w-16 h-16 mb-4" />
                        <p className="text-lg font-semibold text-center">Share My Pledge</p>
                      </div>
                      
                      <div 
                        onClick={() => {
                          const url = window.location.origin + '/pledge';
                          navigator.clipboard.writeText(url);
                          toast({ title: "Link Copied!", description: "Invite link copied to clipboard. Share it with your friends!" });
                        }}
                        className="flex flex-col items-center justify-center p-8 bg-muted/50 rounded-2xl cursor-pointer transition-all hover:bg-muted hover:scale-105 hover:shadow-lg"
                      >
                        <img src={pledgeInviteIcon} alt="Invite Others to Pledge" className="w-16 h-16 mb-4" />
                        <p className="text-lg font-semibold text-center">Invite Others to Pledge</p>
                      </div>
                      
                      <div 
                        onClick={() => navigate('/pledge')}
                        className="flex flex-col items-center justify-center p-8 bg-muted/50 rounded-2xl cursor-pointer transition-all hover:bg-muted hover:scale-105 hover:shadow-lg"
                      >
                        <img src={pledgeRetakeIcon} alt="Re-take Pledge" className="w-16 h-16 mb-4" />
                        <p className="text-lg font-semibold text-center">Re-take Pledge</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
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

      {/* Share Pledge Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="bg-primary max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold flex items-center gap-3 text-foreground">
              <Share2 className="h-8 w-8" />
              Share Your Impact
            </DialogTitle>
            <DialogDescription className="text-lg text-foreground/80">
              Inspire others to take action for sustainable tourism
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <div className="space-y-3">
              <p className="font-semibold text-foreground">Share message:</p>
              <p className="text-foreground/90 bg-background/10 p-4 rounded-lg">
                {shareMessage}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="secondary"
                size="lg"
                className="h-14 text-base"
                onClick={shareOnFacebook}
              >
                <Facebook className="mr-2 h-5 w-5" />
                Facebook
              </Button>
              
              <Button
                variant="secondary"
                size="lg"
                className="h-14 text-base"
                onClick={shareOnTwitter}
              >
                <Twitter className="mr-2 h-5 w-5" />
                Twitter
              </Button>
              
              <Button
                variant="secondary"
                size="lg"
                className="h-14 text-base"
                onClick={shareOnLinkedIn}
              >
                <Linkedin className="mr-2 h-5 w-5" />
                LinkedIn
              </Button>
              
              <Button
                variant="secondary"
                size="lg"
                className="h-14 text-base"
                onClick={copyInstagramMessage}
              >
                <Instagram className="mr-2 h-5 w-5" />
                Instagram
              </Button>
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="w-full h-14 text-base"
              onClick={copyLink}
            >
              <Copy className="mr-2 h-5 w-5" />
              Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};