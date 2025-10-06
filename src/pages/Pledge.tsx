import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PledgeSignupModal } from '@/components/pledge/PledgeSignupModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ototLogo from '@/assets/otot-logo.png';
import refreshIcon from '@/assets/refresh-icon.png';
import pledgeHandIcon from '@/assets/pledge-hand.png';

const pledgeSlides = [
  {
    number: 1,
    text: "Respect nature by following marked paths and protecting natural surroundings",
    image: "/pledge/pledge-1.webp",
    alt: "Kenya savanna landscape with acacia trees"
  },
  {
    number: 2,
    text: "Leave no waste behind by disposing of trash properly and keeping natural areas clean",
    image: "/pledge/pledge-2.webp",
    alt: "People cleaning up waste in natural areas"
  },
  {
    number: 3,
    text: "Support reforestation to fight climate change through tree planting",
    image: "/pledge/pledge-3.webp",
    alt: "Dense forest canopy showing reforestation efforts"
  },
  {
    number: 4,
    text: "Reduce my carbon footprint by choosing eco-friendly travel options",
    image: "/pledge/pledge-4.webp",
    alt: "Eco-friendly bicycles for sustainable transport"
  },
  {
    number: 5,
    text: "Respect wildlife by observing animals without disturbing their habitats",
    image: "/pledge/pledge-5.webp",
    alt: "Elephant family in their natural habitat"
  },
  {
    number: 6,
    text: "Respect local cultures by honoring traditions and supporting communities",
    image: "/pledge/pledge-6.webp",
    alt: "Local community members in traditional attire"
  },
  {
    number: 7,
    text: "Use resources wisely by conserving water and minimizing waste",
    image: "/pledge/pledge-7.webp",
    alt: "Child drinking clean water"
  },
  {
    number: 8,
    text: "Camp responsibly in designated areas with eco-friendly practices",
    image: "/pledge/pledge-8.webp",
    alt: "Camping tent in natural surroundings"
  },
  {
    number: 9,
    text: "Learn and share about Kenya's conservation efforts",
    image: "/pledge/pledge-9.webp",
    alt: "Giraffes in conservation area"
  },
  {
    number: 10,
    text: "Care for our global environment through responsible tourism",
    image: "/pledge/pledge-10.webp",
    alt: "Volunteers working together for environmental conservation"
  }
];

export default function Pledge() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [acceptedSlides, setAcceptedSlides] = useState<Set<number>>(new Set());
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupAction, setSignupAction] = useState<'certificate' | 'plant'>('certificate');
  const [returnToCompletion, setReturnToCompletion] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });

    // Keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') api.scrollPrev();
      if (e.key === 'ArrowRight') api.scrollNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [api]);

  // Restore progress from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('pledge-progress');
    if (saved) {
      const progress = JSON.parse(saved);
      setAcceptedSlides(new Set(progress.accepted));
      if (progress.current) setCurrent(progress.current);
    }
  }, []);

  // Save progress to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('pledge-progress', JSON.stringify({
      accepted: Array.from(acceptedSlides),
      current
    }));
  }, [acceptedSlides, current]);

  const handleAcceptSlide = (slideNumber: number, checked: boolean) => {
    const newAccepted = new Set(acceptedSlides);
    if (checked) {
      newAccepted.add(slideNumber);
      // Auto-advance to next slide or back to completion slide
      setTimeout(() => {
        if (returnToCompletion) {
          // Return to completion slide
          api?.scrollTo(10);
          setReturnToCompletion(false);
        } else if (current !== 10) {
          // Normal flow - advance to next slide
          api?.scrollNext();
        }
      }, 500);
    } else {
      newAccepted.delete(slideNumber);
    }
    setAcceptedSlides(newAccepted);
  };

  const handleRestart = () => {
    setAcceptedSlides(new Set());
    setReturnToCompletion(false);
    sessionStorage.removeItem('pledge-progress');
    api?.scrollTo(0);
  };

  const allAccepted = acceptedSlides.size === 10;

  const handleCTAClick = async (action: 'certificate' | 'plant') => {
    if (!user) {
      setSignupAction(action);
      setShowSignupModal(true);
      return;
    }

    // User is already logged in
    try {
      await supabase
        .from('users')
        .update({ pledge_status: true, pledge_date: new Date().toISOString() })
        .eq('user_id', user.id);

      sessionStorage.removeItem('pledge-progress');

      if (action === 'certificate') {
        toast({
          title: "Pledge complete!",
          description: "Navigating to your dashboard to download certificate...",
        });
        navigate('/dashboard');
      } else {
        navigate('/carbon-calculator');
      }
    } catch (error) {
      console.error('Error updating pledge:', error);
      toast({
        title: "Error",
        description: "Failed to save pledge. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isCompletionSlide = current === 10;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Header with logo */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center">
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
            <TooltipContent>
              <p>Restart pledge</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Carousel
        setApi={setApi}
        className="h-full w-full"
        opts={{
          align: 'start',
          loop: false,
        }}
      >
        <CarouselContent className="h-screen">
          {pledgeSlides.map((slide, index) => (
            <CarouselItem key={slide.number} className="relative h-screen">
              {/* Background image with parallax effect */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-300"
                style={{
                  backgroundImage: `url(${slide.image})`,
                  transform: current === index ? 'scale(1)' : 'scale(1.05)',
                }}
              >
                {/* Overlay for text readability */}
                <div className="absolute inset-0 bg-black/40" />
              </div>

              {/* Content */}
              <div className="relative h-full flex flex-col justify-center items-center px-6 py-20 text-center">
                {/* Number indicator */}
                <div className="text-[#1a5d1a] text-8xl font-bold mb-8 drop-shadow-lg">
                  {slide.number}
                </div>

                {/* Pledge text */}
                <h2 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold max-w-4xl leading-tight drop-shadow-lg mb-12">
                  {slide.text}
                </h2>

                {/* Acceptance button with hand icon */}
                <button
                  onClick={() => handleAcceptSlide(slide.number, !acceptedSlides.has(slide.number))}
                  className={`group relative flex items-center justify-center px-8 py-3 rounded-full shadow-lg transition-all transform hover:scale-105 overflow-hidden cursor-none ${
                    acceptedSlides.has(slide.number)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-white/90 backdrop-blur-sm text-foreground'
                  }`}
                >
                  {/* Text */}
                  <span className={`font-medium select-none relative z-10 transition-opacity duration-300 ${
                    acceptedSlides.has(slide.number) ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'
                  }`}>
                    I Commit
                  </span>
                  
                  {/* Hand icon - slides up on hover and replaces text */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                    acceptedSlides.has(slide.number) 
                      ? 'translate-y-0 opacity-100' 
                      : 'translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
                  }`}>
                    <img 
                      src={pledgeHandIcon} 
                      alt="Pledge" 
                      className="h-10 w-10 transition-all duration-300"
                      style={{
                        filter: acceptedSlides.has(slide.number) 
                          ? 'brightness(0) invert(1)' 
                          : 'brightness(0)'
                      }}
                    />
                  </div>
                </button>

                {/* Progress dots */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-2">
                  {pledgeSlides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => api?.scrollTo(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === current
                          ? 'w-8 bg-primary'
                          : acceptedSlides.has(idx + 1)
                          ? 'w-2 bg-primary/60'
                          : 'w-2 bg-white/40'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                  <div
                    className={`h-2 w-2 rounded-full transition-all ${
                      current === 10 ? 'bg-primary w-8' : 'bg-white/40'
                    }`}
                  />
                </div>
              </div>
            </CarouselItem>
          ))}

          {/* Completion slide */}
          <CarouselItem className="relative h-screen">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(/pledge/pledge-10.webp)`,
              }}
            >
              <div className="absolute inset-0 bg-black/60" />
            </div>

            <div className="relative h-full flex flex-col justify-center items-center px-6 py-20 text-center">
              <div className="max-w-2xl space-y-8">
                {allAccepted && (
                  <>
                    <h1 className="text-white text-5xl md:text-6xl font-bold drop-shadow-lg">
                      Thank You for Taking the Pledge!
                    </h1>

                    <p className="text-white text-xl md:text-2xl drop-shadow-lg">
                      You're now a Responsible Traveler. Take the next step and offset your carbon footprint by planting trees in Kenya.
                    </p>
                  </>
                )}

                {!allAccepted && (
                  <div className="bg-primary/20 backdrop-blur-md px-8 py-6 rounded-xl max-w-md mx-auto border border-primary/30">
                    <p className="text-white text-lg font-medium mb-4">
                      Please accept all 10 principles to complete your pledge
                    </p>
                    <div className="grid grid-cols-5 gap-3">
                      {pledgeSlides.map((slide) => (
                        <button
                          key={slide.number}
                          onClick={() => {
                            setReturnToCompletion(true);
                            api?.scrollTo(slide.number - 1);
                          }}
                          className={`flex items-center justify-center h-12 w-12 rounded-full font-bold transition-all ${
                            acceptedSlides.has(slide.number)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-white text-foreground border-2 border-primary'
                          }`}
                          aria-label={`Go to pledge ${slide.number}`}
                        >
                          {slide.number}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {allAccepted && (
                  <div className="flex flex-col gap-4 items-center">
                    <Button
                      size="lg"
                      className="w-full md:w-auto min-w-[280px] text-lg h-14"
                      onClick={() => handleCTAClick('certificate')}
                    >
                      Download My Certificate
                    </Button>
                    <Button
                      size="lg"
                      variant="secondary"
                      className="w-full md:w-auto min-w-[280px] text-lg h-14"
                      onClick={() => handleCTAClick('plant')}
                    >
                      Plant Trees Now
                    </Button>
                  </div>
                )}

                <div className="text-white/80 text-sm space-y-1">
                  <p>Join thousands of travelers who took the pledge</p>
                  <div className="flex justify-center gap-6 text-white font-semibold">
                    <span>🌍 1,000+ Tourists</span>
                    <span>🌎 50+ Countries</span>
                  </div>
                </div>
              </div>

              {/* Progress dots */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-2">
                {pledgeSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => api?.scrollTo(idx)}
                    className={`h-2 w-2 rounded-full transition-all ${
                      acceptedSlides.has(idx + 1) ? 'bg-primary/60' : 'bg-white/40'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
                <div className="h-2 w-8 rounded-full bg-primary" />
              </div>
            </div>
          </CarouselItem>
        </CarouselContent>

        {/* Navigation buttons - hide on completion slide */}
        {!isCompletionSlide && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white"
              onClick={() => api?.scrollPrev()}
              disabled={current === 0}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white"
              onClick={() => api?.scrollNext()}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}
      </Carousel>

      {/* Signup Modal */}
      <PledgeSignupModal
        open={showSignupModal}
        onOpenChange={setShowSignupModal}
        action={signupAction}
      />
    </div>
  );
}
