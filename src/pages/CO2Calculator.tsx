import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plane, Leaf, Globe, ArrowRight } from 'lucide-react';
import { validateDeepLink } from '@/utils/magicLinkAuth';
import { useToast } from '@/hooks/use-toast';
import { EmailCaptureModal } from '@/components/pledge/EmailCaptureModal';
import ototLogo from '@/assets/otot-logo.png';

export default function CO2Calculator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [calculatorContext, setCalculatorContext] = useState<any>(null);
  const [showEmailCapture, setShowEmailCapture] = useState(false);

  // Handle deep link tokens for QR code/URL campaigns
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      validateDeepLink(token).then(result => {
        if (result.pledgeContext) {
          setCalculatorContext(result.pledgeContext);
          setIsGuestMode(true);
          toast({
            title: "Welcome!",
            description: "Calculate your carbon footprint and offset it with trees.",
          });
        } else if (result.error) {
          toast({
            title: "Link expired",
            description: result.error,
            variant: "destructive",
          });
        }
      });
    }
  }, [searchParams, toast]);

  const handleGetStarted = () => {
    // Show magic link modal instead of navigating
    setShowEmailCapture(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <a href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
            <img src={ototLogo} alt="OTOT Logo" className="h-10 w-auto" />
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Leaf className="h-4 w-4" />
            Free Carbon Footprint Calculator
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
            Calculate Your Travel's
            <span className="text-primary"> Carbon Footprint</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Understand your environmental impact and take action by offsetting your carbon emissions through tree planting in Kenya.
          </p>

          <div className="pt-6">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="text-lg px-8 py-6 h-auto"
            >
              Calculate My Footprint
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-6 pt-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Takes less than 2 minutes
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Save & track your impact
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Plane className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Flight Emissions</h3>
              <p className="text-muted-foreground">
                Calculate CO2 emissions from your flights based on distance, class, and number of travelers.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Accommodation Impact</h3>
              <p className="text-muted-foreground">
                Include emissions from hotels, rentals, and other accommodation during your stay.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Leaf className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Offset with Trees</h3>
              <p className="text-muted-foreground">
                Get personalized tree planting recommendations to offset your carbon footprint.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            How It Works
          </h2>
          
          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Enter Your Travel Details</h3>
                <p className="text-muted-foreground">
                  Add your flight information, travel dates, and accommodation type. Takes less than a minute.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">See Your Carbon Footprint</h3>
                <p className="text-muted-foreground">
                  Get instant calculations of your total CO2 emissions and the number of trees needed to offset it.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Take Action</h3>
                <p className="text-muted-foreground">
                  Save your trip or plant trees directly. We'll send you a magic link to create your account seamlessly.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="text-lg px-8 py-6 h-auto"
            >
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 OTOT. Making responsible travel accessible to everyone.</p>
          </div>
        </div>
      </footer>

      {/* Email Capture Modal */}
      <EmailCaptureModal
        open={showEmailCapture}
        onOpenChange={setShowEmailCapture}
        pledgeContext={{ 
          redirectUrl: '/carbon-calculator',
          campaign: calculatorContext?.campaign || 'carbon_calculator'
        }}
        onEmailSubmitted={() => {
          toast({
            title: "Check your email!",
            description: "We've sent you a magic link to access the carbon calculator.",
          });
        }}
      />
    </div>
  );
}
