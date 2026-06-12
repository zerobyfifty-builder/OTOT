import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EmailCaptureModal } from '@/components/pledge/EmailCaptureModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateDeepLink } from '@/utils/magicLinkAuth';
import { RotateCcw, Sparkles, Award, Trees } from 'lucide-react';
import ktbLogo from '@/assets/ktb-logo.png';
import pledgeBg from '@/assets/pledge-background.jpg';
import confetti from 'canvas-confetti';

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

export default function PledgeC() {
  const [searchParams] = useSearchParams();
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [signupAction, setSignupAction] = useState<'certificate' | 'plant'>('certificate');
  const [pledgeContext, setPledgeContext] = useState<any>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const handleRestart = () => setShowCompletion(false);

  const completionRef = useRef<HTMLDivElement>(null);

  const handleCommit = () => {
    setShowCompletion(true);
    const end = Date.now() + 1500;
    const colors = ['#22c55e', '#facc15', '#3b82f6', '#f97316'];
    (function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    setTimeout(() => {
      completionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
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
      {/* Background image */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${pledgeBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/75" />
      </div>

      {/* Ambient color orbs for depth */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-emerald-400/25 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 h-[460px] w-[460px] rounded-full bg-teal-300/20 blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 h-[360px] w-[360px] rounded-full bg-lime-300/15 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-20 px-4 md:px-8 py-4 flex justify-between items-center">
        <a
          href="/"
          className="cursor-pointer hover:opacity-90 transition-opacity rounded-2xl px-3 py-1.5 border border-white/40 shadow-lg shadow-black/10"
          style={{
            backgroundColor: 'hsl(0 0% 100% / 0.78)',
            backdropFilter: 'blur(14px) saturate(160%)',
            WebkitBackdropFilter: 'blur(14px) saturate(160%)',
          }}
        >
          <img src={ktbLogo} alt="KTB Logo" className="h-12 md:h-14 w-auto" />
        </a>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleRestart}
                aria-label="Restart pledge"
                className="h-11 w-11 inline-flex items-center justify-center rounded-full border border-white/25 text-white transition-all hover:bg-white/15 hover:border-white/40 active:scale-95"
                style={{
                  backgroundColor: 'hsl(0 0% 100% / 0.08)',
                  backdropFilter: 'blur(14px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(14px) saturate(160%)',
                }}
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>Restart pledge</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-col items-center px-4 pb-16 pt-2 min-h-[calc(100vh-96px)]">
        {!showCompletion ? (
          <>
            {/* Hero */}
            <div className="text-center mb-8 max-w-3xl animate-fade-in">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/25 text-white/90 text-xs font-medium tracking-wide uppercase mb-5"
                style={{
                  backgroundColor: 'hsl(0 0% 100% / 0.10)',
                  backdropFilter: 'blur(12px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
                }}
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                Responsible Traveller Pledge
              </div>
              <h1 className="text-white text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
                Protect the Kenya
                <br />
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-lime-200 bg-clip-text text-transparent">
                  You Love.
                </span>
              </h1>
              <p className="text-white/80 text-base md:text-lg mt-4 max-w-xl mx-auto leading-relaxed">
                Read and commit to the ten principles below — your promise to travel light, leave more.
              </p>
            </div>

            {/* Glass card */}
            <div
              className="w-full max-w-3xl rounded-3xl border border-white/20 shadow-2xl shadow-black/30 overflow-hidden animate-scale-in"
              style={{
                backgroundColor: 'hsl(0 0% 100% / 0.08)',
                backdropFilter: 'blur(20px) saturate(170%)',
                WebkitBackdropFilter: 'blur(20px) saturate(170%)',
              }}
            >
              {/* highlight strip */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-white/95 text-sm md:text-base font-semibold tracking-wider uppercase">
                    The 10 Principles
                  </h2>
                  <span className="text-emerald-300/90 text-xs font-medium tabular-nums">
                    01 — 10
                  </span>
                </div>

                <ol className="grid sm:grid-cols-2 gap-x-5 gap-y-3">
                  {pledgeItems.map((item, i) => (
                    <li
                      key={item.number}
                      className="group flex items-start gap-3 rounded-xl px-3 py-2.5 border border-transparent hover:border-white/15 hover:bg-white/[0.04] transition-all"
                      style={{ animation: `fade-in 400ms ease-out ${i * 40}ms both` }}
                    >
                      <span className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-br from-emerald-400/90 to-teal-500/90 text-white font-semibold text-xs shadow-lg shadow-emerald-900/30 ring-1 ring-white/30">
                        {item.number}
                      </span>
                      <span className="text-white/85 text-sm leading-snug pt-0.5">
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ol>

                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent my-6" />

                <Button
                  onClick={handleCommit}
                  size="lg"
                  className="w-full h-14 text-base md:text-lg font-semibold rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-xl shadow-emerald-900/30 border border-white/20 transition-all hover:shadow-2xl hover:shadow-emerald-900/40 active:scale-[0.99]"
                >
                  I Commit to All 10 Principles
                </Button>
                <p className="text-center text-white/55 text-xs mt-3">
                  By committing you agree to travel responsibly across Kenya.
                </p>
              </div>
            </div>

            {/* Social proof */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {[
                { label: '1,000+ Tourists', emoji: '🌍' },
                { label: '50+ Countries', emoji: '🌎' },
                { label: 'Kenya Tourism Board', emoji: '🇰🇪' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/20 text-white/85 text-xs font-medium"
                  style={{
                    backgroundColor: 'hsl(0 0% 100% / 0.08)',
                    backdropFilter: 'blur(12px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(160%)',
                  }}
                >
                  <span>{s.emoji}</span>
                  {s.label}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div
            ref={completionRef}
            className="w-full max-w-xl rounded-3xl border border-white/25 shadow-2xl shadow-black/40 p-8 md:p-10 text-center animate-scale-in mt-6"
            style={{
              backgroundColor: 'hsl(0 0% 100% / 0.10)',
              backdropFilter: 'blur(22px) saturate(170%)',
              WebkitBackdropFilter: 'blur(22px) saturate(170%)',
            }}
          >
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 ring-4 ring-white/20 shadow-xl shadow-emerald-900/40 mb-5">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-white text-3xl md:text-4xl font-bold tracking-tight drop-shadow-lg">
              Thank You for Pledging!
            </h1>
            <p className="text-white/80 text-base md:text-lg mt-3 max-w-md mx-auto leading-relaxed">
              You're now a Responsible Traveler. Take the next step — claim your certificate or offset your footprint by planting trees in Kenya.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mt-7">
              <Button
                size="lg"
                onClick={() => handleCTAClick('certificate')}
                className="h-14 rounded-full text-base font-semibold bg-white text-emerald-700 hover:bg-white/95 border border-white/40 shadow-lg shadow-black/20"
              >
                <Award className="h-5 w-5 mr-2" />
                My Certificate
              </Button>
              <Button
                size="lg"
                onClick={() => handleCTAClick('plant')}
                className="h-14 rounded-full text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white border border-white/25 shadow-lg shadow-emerald-900/30"
              >
                <Trees className="h-5 w-5 mr-2" />
                Plant Trees
              </Button>
            </div>

            <div className="mt-7 flex justify-center gap-2 flex-wrap">
              {['🌍 1,000+ Tourists', '🌎 50+ Countries'].map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center px-3 py-1.5 rounded-full border border-white/20 text-white/80 text-xs font-medium"
                  style={{
                    backgroundColor: 'hsl(0 0% 100% / 0.08)',
                    backdropFilter: 'blur(10px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(10px) saturate(160%)',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>

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
