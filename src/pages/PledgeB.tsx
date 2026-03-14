import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EmailCaptureModal } from '@/components/pledge/EmailCaptureModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateDeepLink } from '@/utils/magicLinkAuth';
import ototLogo from '@/assets/otot-logo.png';
import refreshIcon from '@/assets/refresh-icon.png';
import { Check } from 'lucide-react';

const pledgeItems = [
  { number: 1, text: "Respect nature by following marked paths and protecting natural surroundings" },
  { number: 2, text: "Leave no waste behind by disposing of trash properly and keeping natural areas clean" },
  { number: 3, text: "Support reforestation to fight climate change through tree planting" },
  { number: 4, text: "Reduce my carbon footprint by choosing eco-friendly travel options" },
  { number: 5, text: "Respect wildlife by observing animals without disturbing their habitats" },
  { number: 6, text: "Respect local cultures by honoring traditions and supporting communities" },
  { number: 7, text: "Use resources wisely by conserving water and minimizing waste" },
  { number: 8, text: "Camp responsibly in designated areas with eco-friendly practices" },
  { number: 9, text: "Learn and share about Kenya's conservation efforts" },
  { number: 10, text: "Care for our global environment through responsible tourism" },
];

export default function PledgeB() {
  const [searchParams] = useSearchParams();
  const [acceptedPledges, setAcceptedPledges] = useState<Set<number>>(new Set());
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [signupAction, setSignupAction] = useState<'certificate' | 'plant'>('certificate');
  const [pledgeContext, setPledgeContext] = useState<any>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle deep link tokens
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      validateDeepLink(token).then(result => {
        if (result.pledgeContext) {
          setPledgeContext(result.pledgeContext);
          toast({ title: "Welcome!", description: "You can browse the pledge and take action." });
        } else if (result.error) {
          toast({ title: "Link expired", description: result.error, variant: "destructive" });
        }
      });
    }
  }, [searchParams]);

  const allAccepted = acceptedPledges.size === 10;

  const togglePledge = (num: number) => {
    const next = new Set(acceptedPledges);
    if (next.has(num)) next.delete(num);
    else next.add(num);
    setAcceptedPledges(next);
  };

  const handleRestart = () => {
    setAcceptedPledges(new Set());
    setShowCompletion(false);
  };

  const handleCommit = () => {
    if (!allAccepted) return;
    setShowCompletion(true);
  };

  const handleCTAClick = async (action: 'certificate' | 'plant') => {
    if (!user) {
      setPledgeContext({
        numTrees: action === 'plant' ? 1 : 0,
        redirectUrl: action === 'certificate' ? '/dashboard' : '/carbon-calculator',
        pledgeCompleted: true,
      });
      setSignupAction(action);
      setShowEmailCapture(true);
      return;
    }

    try {
      await supabase
        .from('users')
        .update({ pledge_status: true, pledge_date: new Date().toISOString() })
        .eq('user_id', user.id);

      if (action === 'certificate') {
        toast({ title: "Pledge complete!", description: "Navigating to your dashboard to download certificate..." });
        navigate('/dashboard');
      } else {
        navigate('/carbon-calculator');
      }
    } catch (error) {
      console.error('Error updating pledge:', error);
      toast({ title: "Error", description: "Failed to save pledge. Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="relative min-h-screen w-screen overflow-auto">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(/pledge/pledge-10.webp)` }}
      >
        <div className="absolute inset-0 bg-black/55" />
      </div>

      {/* Header */}
      <div className="relative z-20 p-4 flex justify-between items-center">
        <a href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
          <img src={ototLogo} alt="OTOT Logo" className="h-12 w-auto" />
        </a>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRestart}
                className="text-white hover:bg-white/20 backdrop-blur-sm h-10 w-10"
              >
                <img src={refreshIcon} alt="Restart" className="h-6 w-6 invert" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Restart pledge</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 pb-12 pt-4 min-h-[calc(100vh-80px)]">
        {!showCompletion ? (
          <>
            {/* Glass Card */}
            <div className="w-full max-w-lg bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 space-y-8">
              <h2 className="text-white text-center text-xl md:text-2xl font-semibold leading-tight">
                Please accept all 10 principles to complete your pledge
              </h2>

              {/* 5x2 Grid of numbered circles */}
              <TooltipProvider delayDuration={200}>
                <div className="grid grid-cols-5 gap-4 justify-items-center">
                  {pledgeItems.map((item) => {
                    const accepted = acceptedPledges.has(item.number);
                    return (
                      <Tooltip key={item.number}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => togglePledge(item.number)}
                            className={`relative flex items-center justify-center h-14 w-14 md:h-16 md:w-16 rounded-full font-bold text-lg transition-all duration-300 transform hover:scale-110 ${
                              accepted
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/40'
                                : 'bg-white text-foreground hover:bg-white/90 shadow-md'
                            }`}
                            aria-label={`Pledge ${item.number}: ${item.text}`}
                          >
                            {accepted ? (
                              <Check className="h-6 w-6 md:h-7 md:w-7" strokeWidth={3} />
                            ) : (
                              item.number
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[250px] text-center">
                          <p className="text-sm">{item.text}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>

              {/* Progress text */}
              <p className="text-white/70 text-center text-sm">
                {acceptedPledges.size} of 10 accepted
              </p>

              {/* I Commit button */}
              <Button
                onClick={handleCommit}
                disabled={!allAccepted}
                className="w-full h-14 text-lg font-semibold rounded-full transition-all duration-300"
                size="lg"
              >
                I Commit
              </Button>
            </div>

            {/* Social proof */}
            <div className="mt-8 text-center space-y-3">
              <p className="text-white/80 text-base font-medium">
                Join thousands of travelers who took the pledge
              </p>
              <div className="flex justify-center gap-6 text-white font-semibold text-sm">
                <span>🌍 1,000+ Tourists</span>
                <span>🌎 50+ Countries</span>
              </div>
            </div>
          </>
        ) : (
          /* Completion view */
          <div className="w-full max-w-lg bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 space-y-8 text-center">
            <h1 className="text-white text-4xl md:text-5xl font-bold drop-shadow-lg">
              Thank You for Taking the Pledge!
            </h1>
            <p className="text-white/90 text-lg md:text-xl">
              You're now a Responsible Traveler. Take the next step and offset your carbon footprint by planting trees in Kenya.
            </p>
            <div className="flex flex-col gap-4 items-center">
              <Button
                size="lg"
                className="w-full min-w-[280px] text-lg h-14 rounded-full"
                onClick={() => handleCTAClick('certificate')}
              >
                Download My Certificate
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="w-full min-w-[280px] text-lg h-14 rounded-full"
                onClick={() => handleCTAClick('plant')}
              >
                Plant Trees Now
              </Button>
            </div>
            <div className="text-white/80 text-sm space-y-1">
              <p>Join thousands of travelers who took the pledge</p>
              <div className="flex justify-center gap-6 text-white font-semibold">
                <span>🌍 1,000+ Tourists</span>
                <span>🌎 50+ Countries</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Email Capture Modal */}
      <EmailCaptureModal
        open={showEmailCapture}
        onOpenChange={setShowEmailCapture}
        pledgeContext={pledgeContext}
        onEmailSubmitted={() => {
          toast({ title: "Check your email!", description: "We've sent you a magic link to continue." });
        }}
      />
    </div>
  );
}