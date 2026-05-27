import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import ktbLogo from '@/assets/ktb-logo.png';
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
import { RecentTrips } from '@/components/dashboard/RecentTrips';
import { ClimateActionCard } from '@/components/dashboard/ClimateActionCard';
import { FAQAccordion } from '@/components/dashboard/FAQAccordion';
import reduceFootprintImg from '@/assets/climate-reduce-footprint.jpg';
import carbonOffsetsImg from '@/assets/climate-carbon-offsets.jpg';
import offsetTravelImg from '@/assets/climate-offset-travel.jpg';
import { Award, Users, RefreshCw, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { generatePledgeCertificate, generateTreeCertificate, downloadCertificate } from '@/utils/certificateGenerator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CertificatePreviewDialog } from '@/components/certificates/CertificatePreviewDialog';
import { CertificateSelectionDialog } from '@/components/certificates/CertificateSelectionDialog';

interface CertificateRecord {
  id: string;
  certificate_type: string;
  issued_date: string;
  certificate_url: string;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isDownloadingCertificate, setIsDownloadingCertificate] = useState(false);
  const [showCertDialog, setShowCertDialog] = useState(false);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);
  const [previewCert, setPreviewCert] = useState<{ blob: Blob; name: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [userFirstName, setUserFirstName] = useState<string | null>(null);

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
      
      if (userRole === 'government_partner') {
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

  // Fetch user first name for welcome greeting
  useEffect(() => {
    const fetchName = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();
      const fn = (data as any)?.first_name?.trim();
      if (fn) setUserFirstName(fn);
    };
    fetchName();
  }, [user]);

  // Extract user's first name from email or use a default
  const getUserName = () => {
    if (userFirstName) return userFirstName;
    if (!user?.email) return 'Guest';
    const emailName = user.email.split('@')[0];
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  };

  // Get full name from profile, fallback to email-based name
  const getFullName = async () => {
    if (!user) return 'Guest';
    const { data } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .single();
    const fn = (data as any)?.first_name?.trim();
    const ln = (data as any)?.last_name?.trim();
    if (fn && ln) return `${fn} ${ln}`;
    if (fn) return fn;
    return getUserName();
  };

  const generateCertBlob = async (cert: CertificateRecord) => {
    const userName = await getFullName();
    const { data: userData } = await supabase
      .from('users')
      .select('otot_id')
      .eq('user_id', user!.id)
      .single();

    if (cert.certificate_type === 'Pledge') {
      return generatePledgeCertificate({ userName, userId: user!.id, ototId: userData?.otot_id });
    } else {
      return generateTreeCertificate({
        userName,
        userId: user!.id,
        numTrees: 1,
        co2Offset: 22,
        ototId: userData?.otot_id || '',
      });
    }
  };

  // Handle certificate download with multi-cert dialog
  const handleDownloadCertificate = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('id, certificate_type, issued_date, certificate_url')
        .eq('user_id', user.id)
        .eq('certificate_type', 'Pledge')
        .order('issued_date', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        // No certificates yet - generate pledge cert directly
        setIsDownloadingCertificate(true);
        try {
          const userName = await getFullName();
          const blob = await generatePledgeCertificate({
            userName,
            userId: user.id,
          });
          downloadCertificate(blob, `pledge-certificate-${userName}.pdf`);
          toast({ title: "Certificate Downloaded", description: "Your pledge certificate has been downloaded!" });
        } finally {
          setIsDownloadingCertificate(false);
        }
        return;
      }

      if (data.length === 1) {
        await handleSingleCertDownload(data[0]);
      } else {
        setCertificates(data);
        setShowCertDialog(true);
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast({ title: "Download Failed", description: "There was an error. Please try again.", variant: "destructive" });
    }
  };

  const handleSingleCertDownload = async (cert: CertificateRecord) => {
    if (!user) return;
    setDownloadingCertId(cert.id);
    setIsDownloadingCertificate(true);
    try {
      const blob = await generateCertBlob(cert);
      const userName = await getFullName();
      const filename = cert.certificate_type === 'Pledge'
        ? `pledge-certificate-${userName}.pdf`
        : `tree-certificate-${userName}.pdf`;
      downloadCertificate(blob, filename);
      toast({ title: "Certificate Downloaded", description: "Your certificate has been downloaded!" });
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast({ title: "Download Failed", description: "There was an error. Please try again.", variant: "destructive" });
    } finally {
      setDownloadingCertId(null);
      setIsDownloadingCertificate(false);
    }
  };

  const handlePreviewCert = async (cert: CertificateRecord) => {
    setPreviewLoading(cert.id);
    try {
      const blob = await generateCertBlob(cert);
      const userName = await getFullName();
      const filename = cert.certificate_type === 'Pledge'
        ? `pledge-certificate-${userName}.pdf`
        : `tree-certificate-${userName}.pdf`;
      setPreviewCert({ blob, name: filename });
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({ title: "Preview Failed", description: "Could not generate preview.", variant: "destructive" });
    } finally {
      setPreviewLoading(null);
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
      if (!user) return {
        treesPlanted: 0, treesNeeded: 0,
        tripsFullyOffset: 0, tripsPartiallyOffset: 0, tripsNotOffset: 0, totalTrips: 0,
        co2Offset: 0, co2Total: 0,
        hasPledged: false,
      };

      const [treesRes, tripsRes, userRes] = await Promise.all([
        supabase
          .from('trees')
          .select('num_trees, trip_id')
          .eq('user_id', user.id),
        supabase
          .from('trips')
          .select('id, total_co2, trees_needed')
          .eq('user_id', user.id),
        supabase
          .from('users')
          .select('pledge_status')
          .eq('user_id', user.id)
          .single()
      ]);

      const treesData = treesRes.data || [];
      const tripsData = tripsRes.data || [];

      const totalTreesPlanted = treesData.reduce((sum, t) => sum + t.num_trees, 0);
      const totalTreesNeeded = tripsData.reduce((sum, t) => sum + t.trees_needed, 0);

      // Build map of trees planted per trip
      const treesPerTrip: Record<string, number> = {};
      treesData.forEach(t => {
        if (t.trip_id) {
          treesPerTrip[t.trip_id] = (treesPerTrip[t.trip_id] || 0) + t.num_trees;
        }
      });

      let tripsFullyOffset = 0;
      let tripsPartiallyOffset = 0;
      let tripsNotOffset = 0;

      tripsData.forEach(trip => {
        const planted = treesPerTrip[trip.id] || 0;
        if (planted >= trip.trees_needed && trip.trees_needed > 0) {
          tripsFullyOffset++;
        } else if (planted > 0) {
          tripsPartiallyOffset++;
        } else {
          tripsNotOffset++;
        }
      });

      const co2Total = tripsData.reduce((sum, t) => sum + Number(t.total_co2), 0);
      // CO2 offset = trees planted * 22 kg/year
      const co2Offset = Math.min(totalTreesPlanted * 22, co2Total);

      return {
        treesPlanted: totalTreesPlanted,
        treesNeeded: totalTreesNeeded,
        tripsFullyOffset,
        tripsPartiallyOffset,
        tripsNotOffset,
        totalTrips: tripsData.length,
        co2Offset: Math.round(co2Offset),
        co2Total: Math.round(co2Total),
        hasPledged: userRes.data?.pledge_status || false,
      };
    },
    enabled: !!user,
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Welcome Header */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome {getUserName()}!
          </h1>
          <img src={ktbLogo} alt="Kenya Tourism Board" className="h-20 object-contain" />
        </div>

        {/* Section 1: Stats Cards with Featured Background */}
        <section className="relative py-8 px-4 sm:py-10 sm:px-6 md:py-12 md:px-8 rounded-2xl sm:rounded-3xl overflow-hidden" style={{ backgroundColor: 'hsl(var(--featured-background))' }}>
          {/* Decorative pattern background */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute top-10 right-20 w-64 h-64 rounded-full border-2 border-foreground"></div>
            <div className="absolute bottom-10 left-20 w-48 h-48 rounded-full border-2 border-foreground"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-foreground"></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-10 gap-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto">
              <StatsCard
                icon={Plane}
                title="Calculate"
                subtitle="your travel emissions"
                stats={[
                  { label: 'Fully Offset', value: stats?.tripsFullyOffset || 0, total: stats?.totalTrips || 0, color: 'hsl(142, 70%, 45%)' },
                  { label: 'Partially Offset', value: stats?.tripsPartiallyOffset || 0, total: stats?.totalTrips || 0, color: 'hsl(45, 93%, 47%)' },
                  { label: 'Needs Offset', value: stats?.tripsNotOffset || 0, total: stats?.totalTrips || 0, color: 'hsl(0, 84%, 60%)' },
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
                  { label: 'Trees Planted', value: stats?.treesPlanted || 0, total: stats?.treesNeeded || 0, color: 'hsl(142, 70%, 45%)' },
                  { label: 'Trees Needed', value: Math.max((stats?.treesNeeded || 0) - (stats?.treesPlanted || 0), 0), color: 'hsl(142, 70%, 70%)' },
                ]}
                buttonText="Plant a Tree"
                buttonVariant="default"
                href="/carbon-calculator"
                colorVariant="green"
              />
              
              <StatsCard
                icon={BarChart3}
                title="Track"
                subtitle="your environmental impact"
                stats={[
                  { label: 'CO₂ Offset', value: stats?.co2Offset || 0, total: stats?.co2Total || 0, color: 'hsl(142, 70%, 45%)' },
                  { label: 'CO₂ Remaining', value: Math.max((stats?.co2Total || 0) - (stats?.co2Offset || 0), 0), color: 'hsl(30, 60%, 50%)' },
                ]}
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
              <CardContent className="p-4 sm:p-6 md:p-8">
                {!stats?.hasPledged ? (
                  <>
                    <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Take the Responsible Traveler Pledge</h2>
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
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Award className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-bold text-foreground">My Responsible Traveler Pledge</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 sm:mb-5 ml-0 sm:ml-[52px]">
                      Share your pledge and inspire more travelers to make a difference.
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={handleDownloadCertificate}
                        disabled={isDownloadingCertificate}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-background hover:bg-muted/60 transition-colors group disabled:opacity-60"
                      >
                        <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center flex-shrink-0">
                          {isDownloadingCertificate ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                          ) : (
                            <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-sm font-semibold text-foreground">Download Certificate</p>
                          <p className="text-xs text-muted-foreground">Get your pledge certificate as PDF</p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>

                      <button
                        onClick={() => setIsShareDialogOpen(true)}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-background hover:bg-muted/60 transition-colors group"
                      >
                        <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
                          <Share2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-sm font-semibold text-foreground">Share My Pledge</p>
                          <p className="text-xs text-muted-foreground">Post on social media</p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>

                      <button
                        onClick={async () => {
                          const fullName = await getFullName();
                          const inviteMessage = `I just earned my pledge-certificate-${fullName} from One Tourist One Tree! 🌍🌳 Join me in sustainable travel. #OneTouristOneTree #SustainableTravel #Kenya\n\nhttps://mvp.the1campaign.com`;
                          navigator.clipboard.writeText(inviteMessage);
                          toast({ title: "Message & Link Copied!", description: "Invite message copied to clipboard. Share it with your friends!" });
                        }}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-background hover:bg-muted/60 transition-colors group"
                      >
                        <div className="h-9 w-9 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-sm font-semibold text-foreground">Invite Others</p>
                          <p className="text-xs text-muted-foreground">Copy invite link to share</p>
                        </div>
                        <Copy className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>

                      <button
                        onClick={() => navigate('/pledge')}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-background hover:bg-muted/60 transition-colors group"
                      >
                        <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center flex-shrink-0">
                          <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-sm font-semibold text-foreground">Re-take Pledge</p>
                          <p className="text-xs text-muted-foreground">Renew your commitment</p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            <RecentTrips />
          </div>
        </section>

        {/* Section 3: Climate Action Cards */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-left">Step up Your Climate Action</h2>
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
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">Frequently Asked Questions</h2>
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
              <Button variant="secondary" size="lg" className="h-14 text-base" onClick={shareOnFacebook}>
                <Facebook className="mr-2 h-5 w-5" /> Facebook
              </Button>
              <Button variant="secondary" size="lg" className="h-14 text-base" onClick={shareOnTwitter}>
                <Twitter className="mr-2 h-5 w-5" /> Twitter
              </Button>
              <Button variant="secondary" size="lg" className="h-14 text-base" onClick={shareOnLinkedIn}>
                <Linkedin className="mr-2 h-5 w-5" /> LinkedIn
              </Button>
              <Button variant="secondary" size="lg" className="h-14 text-base" onClick={copyInstagramMessage}>
                <Instagram className="mr-2 h-5 w-5" /> Instagram
              </Button>
            </div>

            <Button variant="secondary" size="lg" className="w-full h-14 text-base" onClick={copyLink}>
              <Copy className="mr-2 h-5 w-5" /> Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CertificateSelectionDialog
        open={showCertDialog}
        onOpenChange={setShowCertDialog}
        certificates={certificates}
        previewLoading={previewLoading}
        downloadingCertId={downloadingCertId}
        onPreview={handlePreviewCert}
        onDownload={handleSingleCertDownload}
      />

      <CertificatePreviewDialog
        previewCert={previewCert}
        onClose={() => setPreviewCert(null)}
        onDownload={({ blob, name }) => downloadCertificate(blob, name)}
      />
    </div>
  );
};